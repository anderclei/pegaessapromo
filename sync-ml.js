const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Carrega as variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env.local') });

const ML_FILE = path.join(__dirname, 'data', 'hot_products_mercadolivre.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

/** Lê as configurações do arquivo JSON (mesma fonte do painel Admin) */
function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
}

async function getMLToken(settings) {
    const { mercadolivreAppId: appId, mercadolivreClientSecret: secret, mercadolivreAccessToken: accessToken, mercadolivreRefreshToken: refreshToken, mercadolivreTokenExpiresAt: expiresAt } = settings;

    // 1. Se o token atual ainda é válido, use-o
    if (accessToken && expiresAt && Date.now() < (expiresAt - 60000)) {
        return accessToken;
    }

    // 2. Se temos um Refresh Token, tente renovar
    if (refreshToken) {
        try {
            console.log('🔄 Renovando token do Mercado Livre...');
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: appId,
                client_secret: secret,
                refresh_token: refreshToken
            });
            const res = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString());
            
            // Salva o novo token de volta no settings.json
            const updatedSettings = {
                ...settings,
                mercadolivreAccessToken: res.data.access_token,
                mercadolivreRefreshToken: res.data.refresh_token,
                mercadolivreTokenExpiresAt: Date.now() + (res.data.expires_in * 1000)
            };
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
            
            return res.data.access_token;
        } catch (e) {
            console.error('❌ Erro ao renovar token ML:', e.response?.data || e.message);
        }
    }

    // 3. Fallback: Tenta Client Credentials (anônimo) - Provavelmente dará 403 no Brasil
    try {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: appId,
            client_secret: secret
        });
        const res = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString());
        return res.data.access_token;
    } catch (e) {
        console.error('❌ Erro no Client Credentials ML:', e.message);
        return null;
    }
}

async function scrapeML() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Sincronizando Mercado Livre...`);
  
  const settings = getSettings();
  const appId = settings.mercadolivreAppId;
  const secret = settings.mercadolivreClientSecret;

  // ESTRATÉGIA PRINCIPAL: API OFICIAL (Se tiver chaves)
  if (appId && secret) {
      console.log('🚀 Usando API Oficial do Mercado Livre para dados precisos...');
      const token = await getMLToken(settings);
      if (token) {
          try {
              const res = await axios.get('https://api.mercadolibre.com/sites/MLB/search?q=ofertas&limit=50', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              const results = res.data.results || [];
              const products = results.map(item => ({
                  id: `ml-api-${item.id}`,
                  title: item.title,
                  price: item.price,
                  originalPrice: item.original_price,
                  discount: item.original_price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0,
                  platform: 'mercadolivre',
                  url: item.permalink,
                  image: (item.thumbnail || '').replace('-I.jpg', '-O.jpg'),
                  category: 'todos',
                  type: 'bestsellers',
                  freeShipping: item.shipping?.free_shipping
              }));

              if (products.length > 0) {
                  saveLocal(products);
                  console.log(`✅ API: ${products.length} ofertas sincronizadas com sucesso.`);
                  return;
              }
          } catch (e) {
              console.warn('⚠️ Falha na API, tentando Scraping de fallback...', e.message);
          }
      }
  }

  // ESTRATÉGIA SECUNDÁRIA: SCRAPING DE ALTA PRECISÃO (FALLBACK)
  try {
    const url = 'https://www.mercadolivre.com.br/ofertas';

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 20000,
    });

    const html = res.data;
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const products = [];

    $('.poly-card, .andes-card, .promotion-item').each((i, el) => {
      const $card = $(el);
      
      const title = $card.find('.poly-component__title, [class*="title"]').first().text().trim();
      const link = $card.find('a').first().attr('href');
      
      // Preço Atual (VALOR FINAL) - Focando no container de preço corrente
      const $currentWrapper = $card.find('.poly-price__current, .andes-money-amount--current').first();
      const fraction = $currentWrapper.find('.andes-money-amount__fraction').first().text().replace(/\./g, '').trim();
      const cents = $currentWrapper.find('.andes-money-amount__cents').first().text().trim() || '00';
      const price = parseFloat(`${fraction}.${cents}`) || 0;

      // Preço Original (DE:) - Focando no container de preço anterior
      const $oldWrapper = $card.find('.poly-price__original, .andes-money-amount--previous').first();
      let originalPrice = 0;
      if ($oldWrapper.length > 0) {
          const oldFrac = $oldWrapper.find('.andes-money-amount__fraction').first().text().replace(/\./g, '').trim();
          const oldCents = $oldWrapper.find('.andes-money-amount__cents').first().text().trim() || '00';
          originalPrice = parseFloat(`${oldFrac}.${oldCents}`) || 0;
      }

      // Desconto
      const discountText = $card.find('.poly-component__discount, .andes-money-amount__discount, [class*="discount"]').text().trim();
      const discount = discountText ? parseInt(discountText.replace(/[^0-9]/g, '')) || 0 : 0;

      if (title && link && price > 0) {
        products.push({
          id: `ml-web-${Math.random().toString(36).substr(2, 6)}`,
          title,
          price,
          originalPrice: originalPrice > price ? originalPrice : undefined,
          discount: discount || (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0),
          platform: 'mercadolivre',
          url: link,
          image: $card.find('img').attr('src') || $card.find('img').attr('data-src'),
          category: 'todos',
          type: 'bestsellers',
          freeShipping: $card.text().toLowerCase().includes('grátis')
        });
      }
    });

    // ESTRATÉGIA DE REFORÇO: Refinar preços via API Oficial (Item por Item)
    if (products.length > 0 && settings.mercadolivreAccessToken) {
        console.log(`🎯 Refinando ${products.length} preços via API Oficial (Item por Item)...`);
        const tokenToken = await getMLToken(settings);
        
        if (tokenToken) {
            for (let i = 0; i < products.length; i++) {
                const item = products[i];
                const mlIdMatch = item.url.match(/MLB-?(\d+)/i) || item.url.match(/wid=MLB(\d+)/i);
                if (mlIdMatch) {
                    const mlId = `MLB${mlIdMatch[1]}`;
                    try {
                        const itemRes = await axios.get(`https://api.mercadolibre.com/items/${mlId}`, {
                            headers: { 'Authorization': `Bearer ${tokenToken}` }
                        });
                        const apiData = itemRes.data;
                        
                        // Atualiza com o valor real da API (VALOR FINAL)
                        products[i].price = apiData.price;
                        products[i].originalPrice = apiData.original_price || apiData.base_price;
                        if (products[i].originalPrice > products[i].price) {
                            products[i].discount = Math.round(((products[i].originalPrice - products[i].price) / products[i].originalPrice) * 100);
                        }
                        
                        if (i % 10 === 0) console.log(`   ✅ [${i+1}/${products.length}] Preço final confirmado: R$ ${products[i].price}`);
                    } catch (err) {
                        // Silencioso se um item falhar
                    }
                }
            }
        }
    }

    if (products.length > 0) {
      saveLocal(products);
      console.log(`✅ Scraper Premium + API Refinement: ${products.length} produtos sincronizados.`);
    }
  } catch (err) {
    console.error('❌ Erro no scraping ML:', err.message);
  }
}

/** Salva produtos no arquivo local */
function saveLocal(products) {
  try {
    const dir = path.dirname(ML_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ML_FILE, JSON.stringify({ todos: products, lastSync: new Date().toISOString() }, null, 2));
  } catch (e) {
    console.error('❌ Erro ao salvar arquivo local:', e.message);
  }
}

scrapeML();
setInterval(scrapeML, 30 * 60 * 1000);
console.log('🤖 Bot ML Ativo — priorizando API quando disponível.');
