import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

const CATEGORIES: Record<string, string> = {
  tecnologia: 'MLB1051',
  mulher: 'MLB1430',
  casa: 'MLB1574',
  eletronicos: 'MLB1000',
  foto_video: 'MLB1039',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  try {
    const catId = category !== 'todos' ? CATEGORIES[category] : '';
    
    // Construct the public API URL for Mercado Livre
    let url = 'https://api.mercadolibre.com/sites/MLB/search?';
    
    if (type === 'lightning') {
      // Mercado Livre usually has a specific section for lightning deals 
      // but for the API we can use high-discount items or specific attributes if available.
      // For now we'll target 'ofertas' specifically.
      url += 'deal_ids=lightning'; 
    } else if (type === 'super') {
      url += 'q=ofertas&discount=40-100';
    } else if (catId) {
      url += `category=${catId}`;
    } else {
      url += `q=promocao`;
    }

    const { data } = await axios.get(url, {
      timeout: 10000,
    });

    if (!data.results || data.results.length === 0) {
      return getSampleMercadoLivreProducts(category, type);
    }

    const products: Product[] = data.results.slice(0, 20).map((item: any) => {
      // Usa uma imagem de melhor resolução se possível
      const image = item.thumbnail ? item.thumbnail.replace('-I.jpg', '-O.jpg') : '';
      
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
        discount: item.original_price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0,
        type: type as any,
      };
    });

    return products;
  } catch (error) {
    console.error(`Erro ao buscar Mercado Livre (${type}):`, error);
    return getSampleMercadoLivreProducts(category, type);
  }
}

function getSampleMercadoLivreProducts(category: string, type: string = 'bestsellers'): Product[] {
  return [];
}
