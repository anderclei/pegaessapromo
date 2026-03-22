import axios from 'axios';
import { Product } from '../types';
import { getSettings, saveSettings, AffiliateConfig } from '../settings';

function generateId(mlId: string): string {
  return `ml-${mlId}`;
}

/**
 * Atualiza o access token do Mercado Livre usando o refresh token.
 */
async function refreshMercadoLivreToken(config: AffiliateConfig): Promise<string | null> {
  if (!config.mercadolivreRefreshToken || !config.mercadolivreAppId || !config.mercadolivreClientSecret) {
    return null;
  }

  try {
    console.log('[ML Scraper] Refreshing access token...');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.mercadolivreAppId,
      client_secret: config.mercadolivreClientSecret,
      refresh_token: config.mercadolivreRefreshToken,
    });

    const res = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const { access_token, refresh_token, expires_in } = res.data;

    // Atualizar no banco de dados
    const newConfig = {
      ...config,
      mercadolivreAccessToken: access_token,
      mercadolivreRefreshToken: refresh_token || config.mercadolivreRefreshToken, // nem sempre volta um novo refresh token
      mercadolivreTokenExpiresAt: Date.now() + (expires_in * 1000),
    };

    await saveSettings(newConfig);
    console.log('[ML Scraper] ✅ Token renovado com sucesso.');
    return access_token;
  } catch (err: any) {
    console.error('[ML Scraper] ❌ Erro ao renovar token:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Obtém um Access Token OAuth2 do Mercado Livre usando client_credentials (fallback).
 */
async function getClientCredentialsToken(appId: string, clientSecret: string): Promise<string | null> {
  try {
    console.log('[ML Scraper] Tentando client_credentials token (fallback)...');
    const res = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );
    return res.data?.access_token;
  } catch (err: any) {
    console.error('[ML Scraper] ❌ Falha no client_credentials token:', err.message);
    return null;
  }
}

/**
 * Busca ofertas do Mercado Livre via API oficial autenticada (OAuth2).
 */
export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  let settings: AffiliateConfig | null = null;
  try {
    settings = await getSettings();
  } catch (_) {}

  if (!settings || !settings.mercadolivreAppId || !settings.mercadolivreClientSecret) {
    console.warn('[ML API] ⚠️ App ID e Client Secret do ML não configurados.');
    return [];
  }

  let token: string | null = null;

  // 1. Tentar usar o token de usuário (OAuth full)
  if (settings.mercadolivreAccessToken) {
    const isExpired = settings.mercadolivreTokenExpiresAt 
      ? Date.now() > settings.mercadolivreTokenExpiresAt - 60000 
      : true;

    if (isExpired && settings.mercadolivreRefreshToken) {
      token = await refreshMercadoLivreToken(settings);
    } else {
      token = settings.mercadolivreAccessToken;
    }
  }

  // 2. Se não tem token de usuário, tenta client_credentials (pode dar 403 em busca pública)
  if (!token) {
    token = await getClientCredentialsToken(settings.mercadolivreAppId, settings.mercadolivreClientSecret);
  }

  if (!token) {
    console.error('[ML API] ❌ Falha ao obter qualquer token de acesso.');
    return [];
  }

  try {
    // Buscar produtos
    const searchQueries = [
      { q: 'oferta relâmpago', sort: 'relevance' },
      { q: 'mais vendido promoção', sort: 'sold_quantity_desc' },
      { q: 'desconto especial', sort: 'relevance' },
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
    const products: Product[] = [];

    for (const item of results) {
      if (products.length >= 25) break;

      const title: string = item.title || '';
      const price: number = item.price || 0;
      const originalPrice: number = item.original_price || 0;
      const link: string = item.permalink || '';
      const mlId: string = item.id || '';

      if (!title || price <= 0 || !link) continue;

      let discount = 0;
      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

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
    return products;

  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    
    if (status === 403) {
      console.error(`❌ [ML API] BLOQUEADO (403): O Mercado Livre exige um token de USUÁRIO REAL. Clique em '🔓 Autorizar Aplicativo' no painel admin.`);
      throw new Error('ML_AUTH_REQUIRED');
    } else {
      console.error(`❌ [ML API] Erro ${status}: ${msg}`);
    }

    return [];
  }
}
