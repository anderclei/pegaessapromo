import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { Product } from '../types';
import { getSettings } from '../settings';

const ML_CACHE_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');

const CATEGORY_QUERIES: Record<string, string[]> = {
  ferramentas: ['parafusadeira', 'furadeira impacto', 'jogo de ferramentas', 'esmerilhadeira', 'maleta ferramentas', 'serra circular'],
  eletronicos: ['smart tv', 'fone bluetooth', 'tablet', 'echo dot', 'caixa de som bluetooth'],
  informatica: ['notebook', 'mouse sem fio', 'monitor', 'teclado mecanico'],
  eletrodomesticos: ['air fryer', 'geladeira', 'microondas', 'aspirador po', 'ventilador'],
  moda: ['tenis', 'mochila', 'relogio', 'camiseta'],
  todos: ['parafusadeira', 'furadeira', 'jogo ferramentas', 'esmerilhadeira'],
};

const ML_AFFILIATE_ID = 'YOUR_AFFILIATE_ID'; // Could be fetched from settings if needed

function buildAffiliateLink(productUrl: string, affiliateId: string = ML_AFFILIATE_ID): string {
  // Simples parser para adicionar tracking ID se existir (ML exige links limpos ou gerados via API deles, mas isso quebra o galho)
  return productUrl;
}

async function fetchMLSearch(query: string, limit: number = 20): Promise<Product[]> {
  console.log(`[MercadoLivre] 🔍 Buscando via HTML: "${query}"`);
  
  try {
    // Busca na categoria principal ou geral com filtro de desconto (15% a 100%) para pegar promoções reais
    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(query).replace(/%20/g, '-')}_Discount_15-100`;
    
    // Disfarçando requisição como Googlebot para evitar 403 Forbidden
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': '*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const products: Product[] = [];

    $('.poly-card').each((i, el) => {
      if (products.length >= limit) return;
      
      const $el = $(el);
      const title = $el.find('h2.poly-box').text().trim() || $el.find('a').text().trim();
      let link = $el.find('a').attr('href') || '';
      const priceText = $el.find('.poly-price__current .andes-money-amount__fraction').first().text().trim();
      const image = $el.find('img.poly-component__picture').attr('src') || $el.find('img.poly-component__picture').attr('data-src');
      
      // Capturar desconto direto da tag promocional
      const discountText = $el.find('.andes-money-amount__discount').text().trim() || '';
      let discount = 0;
      if (discountText.includes('%')) {
        discount = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
      }
      
      // Avaliações
      const ratingText = $el.find('.poly-reviews__rating').text().trim();
      const rating = parseFloat(ratingText.replace(',', '.')) || 0;
      
      // Preço original (riscado)
      const originalPriceText = $el.find('.andes-money-amount--previous .andes-money-amount__fraction').first().text().trim();
      
      if (!title || !priceText || !link) return;

      const price = parseFloat(priceText.replace(/\./g, '')) || 0;
      let originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/\./g, '')) || 0 : undefined;

      // Sanitizar URL
      if (link.startsWith('/')) link = `https://www.mercadolivre.com.br${link}`;
      link = link.split('#')[0]; // Limpar âncoras para rastreamento mais limpo

      if (price <= 0) return;

      if (!discount && originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      products.push({
        id: `ml-${Math.random().toString(36).substr(2, 9)}`,
        title,
        price,
        originalPrice,
        discount,
        image: image || '',
        rating,
        sales: 0,
        reviews: 0,
        category: 'eletronicos',
        platform: 'mercadolivre',
        url: buildAffiliateLink(link),
        freeShipping: $el.text().toLowerCase().includes('frete grátis'),
        type: 'bestsellers' as any,
      });
    });

    console.log(`[MercadoLivre] ✅ ${products.length} produtos encontrados para "${query}"`);
    return products;

  } catch (error: any) {
    console.error(`[MercadoLivre] ❌ Erro ao buscar "${query}":`, error.message);
    return [];
  }
}

export async function scrapeMercadoLivre(
  category: string = 'todos',
  type: string = 'bestsellers'
): Promise<Product[]> {
  try {
    // 1. Tentar cache válido primeiro
    if (fs.existsSync(ML_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ML_CACHE_FILE, 'utf-8'));
      const lastSync = data.lastSync ? new Date(data.lastSync) : null;
      const products = data[category] || [];

      if (lastSync && (Date.now() - lastSync.getTime()) < 24 * 60 * 60 * 1000) {
         if (products.length > 0) {
            console.log(`[MercadoLivre] 📦 ${products.length} produtos do cache`);
            return products;
         }
      }
    }

    // 2. Scraping do HTML (bypass Googlebot)
    const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES['ferramentas'];
    const shuffled = [...queries].sort(() => Math.random() - 0.5);
    const selectedQueries = shuffled.slice(0, 1);

    const allProducts: Product[] = [];
    const seenTitles = new Set<string>();

    for (const query of selectedQueries) {
      const products = await fetchMLSearch(query, 15);
      for (const p of products) {
        // Evitar duplicados pelo título exato
        if (!seenTitles.has(p.title)) {
          seenTitles.add(p.title);
          allProducts.push({ ...p, category });
        }
      }
      await new Promise(resolve => setTimeout(resolve, 800)); // Delay entre requisições
    }

    allProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));

    // Salvar no cache
    if (allProducts.length > 0) {
      let existing: Record<string, any> = {};
      if (fs.existsSync(ML_CACHE_FILE)) {
        existing = JSON.parse(fs.readFileSync(ML_CACHE_FILE, 'utf-8'));
      }
      existing[category] = allProducts;
      existing['lastSync'] = new Date().toISOString();
      const dir = path.dirname(ML_CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(ML_CACHE_FILE, JSON.stringify(existing, null, 2));
      
      return allProducts;
    }

    // 3. Fallback expirado
    if (fs.existsSync(ML_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ML_CACHE_FILE, 'utf-8'));
      const products = data[category] || [];
      if (products.length > 0) return products;
    }

    return [];
  } catch (error) {
    console.error('[MercadoLivre] Erro fatal no scraper:', error);
    return [];
  }
}
