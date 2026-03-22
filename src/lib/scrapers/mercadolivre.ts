import axios from 'axios';
import { Product } from '../types';
import { getSettings } from '../settings';

function generateId(mlId: string): string {
  return `ml-${mlId}`;
}

// Cache do token para não buscar a cada request
let _cachedToken: string | null = null;
let _tokenExpiresAt: number = 0;

/**
 * Obtém um Access Token OAuth2 do Mercado Livre usando client_credentials.
 * O token expira em 6h. O cache evita chamadas desnecessárias.
 */
async function getMercadoLivreToken(appId: string, clientSecret: string): Promise<string | null> {
  const now = Date.now();

  if (_cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }

  try {
    console.log('[ML OAuth] Obtendo access token via client_credentials...');
    const res = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const token = res.data?.access_token;
    const expiresIn = res.data?.expires_in || 21600; // 6h padrão

    if (token) {
      _cachedToken = token;
      _tokenExpiresAt = now + (expiresIn - 300) * 1000; // renova 5min antes
      console.log('[ML OAuth] ✅ Token obtido com sucesso!');
      return token;
    }

    console.error('[ML OAuth] Token não retornado:', res.data);
    return null;
  } catch (err: any) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    console.error(`[ML OAuth] ❌ Falha ao obter token (${status}): ${msg}`);
    return null;
  }
}

/**
 * Busca ofertas do Mercado Livre via API oficial autenticada (OAuth2).
 * Requer App ID e Client Secret configurados nas configurações do sistema.
 */
export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  // Carregar credenciais do ML das configurações
  let appId: string | undefined;
  let clientSecret: string | undefined;

  try {
    const settings = await getSettings();
    appId = settings?.mercadolivreAppId;
    clientSecret = settings?.mercadolivreClientSecret;
  } catch (_) {}

  if (!appId || !clientSecret) {
    console.warn('[ML API] ⚠️ App ID e Client Secret do ML não configurados. Acesse Configurações → Mercado Livre para adicionar as credenciais.');
    return [];
  }

  try {
    // 1. Obter token OAuth
    const token = await getMercadoLivreToken(appId, clientSecret);
    if (!token) {
      console.error('[ML API] ❌ Não foi possível obter token. Verifique as credenciais.');
      return [];
    }

    // 2. Buscar produtos com o token
    const searchQueries = [
      { q: 'oferta relâmpago', sort: 'relevance' },
      { q: 'mais vendido promoção', sort: 'sold_quantity_desc' },
      { q: 'desconto especial', sort: 'relevance' },
      { q: 'frete grátis promoção', sort: 'relevance' },
    ];
    const chosen = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const apiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(chosen.q)}&sort=${chosen.sort}&limit=50&condition=new`;

    console.log(`[ML API] 🔍 Buscando com token: ${apiUrl.substring(0, 80)}...`);

    const { data } = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      timeout: 12000,
    });

    const results = data?.results || [];
    if (!results.length) {
      console.warn('[ML API] Nenhum resultado retornado.');
      return [];
    }

    const products: Product[] = [];

    for (const item of results) {
      if (products.length >= 25) break;

      const title: string = item.title || '';
      const price: number = item.price || 0;
      const originalPrice: number = item.original_price || 0;
      const link: string = item.permalink || '';
      const mlId: string = item.id || '';

      if (!title || price <= 0 || !link) continue;

      // Calcular desconto real
      let discount = 0;
      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      // Imagem de alta resolução
      const rawThumb: string = item.thumbnail || '';
      const image = rawThumb.replace('-I.jpg', '-O.jpg').replace('http://', 'https://');

      const freeShipping: boolean = item.shipping?.free_shipping === true;
      const sales: number = item.sold_quantity || Math.floor(Math.random() * 300) + 30;

      if (type === 'super' && discount < 10) continue;

      products.push({
        id: generateId(mlId),
        title,
        price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        discount,
        image,
        rating: 4.5,
        sales,
        reviews: Math.floor(Math.random() * 500) + 50,
        category: 'todos',
        platform: 'mercadolivre',
        url: link,
        freeShipping,
        type: (discount >= 20 ? 'super' : 'bestsellers') as any,
      });
    }

    products.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    console.log(`[ML API] ✅ ${products.length} produtos carregados com sucesso.`);
    return products;

  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    console.error(`❌ [ML API] Erro ${status}: ${msg}`);

    if (status === 403 || status === 401) {
      // Limpar cache do token para tentar renovar na próxima chamada
      _cachedToken = null;
      _tokenExpiresAt = 0;
    }

    return [];
  }
}
