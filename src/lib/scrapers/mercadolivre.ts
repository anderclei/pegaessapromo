import axios from 'axios';
import { Product } from '../types';
import { getSettings } from '../settings';

const CATEGORIES: Record<string, string> = {
  tecnologia: 'MLB1051',
  mulher: 'MLB1430',
  casa: 'MLB1574',
  eletronicos: 'MLB1000',
  foto_video: 'MLB1039',
};

// Em modo de desenvolvimento, para o token não se perder em Fast Refresh
const globalMlConfig = globalThis as unknown as { 
  mlAccessToken?: string;
  mlTokenExpires?: number;
};
globalMlConfig.mlAccessToken = globalMlConfig.mlAccessToken || undefined;
globalMlConfig.mlTokenExpires = globalMlConfig.mlTokenExpires || 0;

async function getMLAccessToken(): Promise<string | null> {
  // Return cached token if still valid (bufger of 5 minutes)
  if (globalMlConfig.mlAccessToken && (globalMlConfig.mlTokenExpires || 0) > Date.now() + 300000) {
    return globalMlConfig.mlAccessToken;
  }

  try {
    const settings = await getSettings();
    if (!settings?.mercadolivreAppId || !settings?.mercadolivreClientSecret) {
      console.log('⚠️ [MercadoLivre] Chaves da API não configuradas no painel. Usando modo Visitante (limitado).');
      return null;
    }

    console.log('🔄 [MercadoLivre] Gerando novo Access Token Oficial...');
    
    // ML OAuth required body format exactly like this
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');
    data.append('client_id', settings.mercadolivreAppId);
    data.append('client_secret', settings.mercadolivreClientSecret);

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', data, {
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data && response.data.access_token) {
      globalMlConfig.mlAccessToken = response.data.access_token;
      // expires_in is usually 21600 seconds (6 hours)
      globalMlConfig.mlTokenExpires = Date.now() + (response.data.expires_in * 1000);
      console.log('✅ [MercadoLivre] Token Autenticado com Sucesso! Válido por 6 horas.');
      return globalMlConfig.mlAccessToken!;
    }
  } catch (error: any) {
    console.error('❌ [MercadoLivre] Erro fatal ao tentar gerar o token da API:', error.response?.data || error.message);
  }
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  try {
    const mlToken = await getMLAccessToken();
    const catId = category !== 'todos' ? CATEGORIES[category] : '';
    
    let url = 'https://api.mercadolibre.com/sites/MLB/search?';
    
    if (type === 'lightning') {
      // Mercado Livre usually has a specific section for lightning deals 
      url += 'deal_ids=lightning'; 
    } else if (type === 'super') {
      url += 'q=ofertas&discount=40-100';
    } else if (catId) {
      url += `category=${catId}`;
    } else {
      url += `q=promocao`;
    }

    const headers: any = {};
    if (mlToken) {
      headers['Authorization'] = `Bearer ${mlToken}`;
    }

    console.log(`[ML] Fetching: ${url}`);
    
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers
    });
    console.log(`[ML] Data received. Total results: ${data.results?.length || 0}`);

    if (!data.results || data.results.length === 0) {
      return [];
    }

    const products: Product[] = data.results.slice(0, 20).map((item: any) => {
      // Usa uma imagem de melhor resolução se possível
      const image = item.thumbnail ? item.thumbnail.replace('-I.jpg', '-O.jpg') : '';
      
      const discount = item.original_price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0;
      
      return {
        id: item.id || generateId(),
        title: item.title,
        price: item.price,
        originalPrice: item.original_price || undefined,
        image: image || `https://placehold.co/300x300/1a1a2e/e94560?text=MercadoLivre`,
        rating: 0, 
        sales: item.sold_quantity || 0,
        reviews: 0,
        category: category !== 'todos' ? category : 'geral',
        platform: 'mercadolivre',
        url: item.permalink,
        freeShipping: item.shipping?.free_shipping || false,
        discount,
        type: type as any,
      };
    });

    return products;
  } catch (error) {
    console.error(`Erro ao buscar Mercado Livre (${type}):`, error);
    return [];
  }
}
