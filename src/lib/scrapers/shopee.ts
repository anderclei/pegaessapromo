import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeShopee(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  try {
    let url = `https://shopee.com.br/mall/daily_discover`;
    
    if (type === 'lightning') {
      url = `https://shopee.com.br/flash_sale`;
    }

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);
    const products: Product[] = [];

    const selectors = [
      '.shopee-search-item-result__item',
      '[data-sqe="item"]',
      '.shop-search-result-view__item',
      '[class*="product-card"]',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        if (products.length >= 20) return;

        const $el = $(element);
        const title = $el.find('[class*="name"], [class*="title"]').first().text().trim();
        const priceText = $el.find('[class*="price"]').first().text().trim();
        const image = $el.find('img').first().attr('src') || '';
        const link = $el.find('a').first().attr('href') || '';

        if (title && title.length > 5) {
          const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          products.push({
            id: generateId(),
            title,
            price: price || 0,
            originalPrice: undefined, // Will be extracted later if possible
            image: image,
            rating: 0,
            sales: 0,
            reviews: 0,
            category: category !== 'todos' ? category : 'geral',
            platform: 'shopee',
            url: link.startsWith('http') ? link : `https://shopee.com.br${link}`,
            freeShipping: false,
            discount: 0,
            type: type as any,
          });
        }
      });

      if (type === 'lightning' && !url.includes('flash_sale')) {
          // If we want lightning but didn't find specific ones, 
          // we might need more aggressive logic or just filter the main ones.
      }

      if (products.length > 0) break;
    }

    if (type === 'super') {
      return products.filter(p => p.discount && p.discount >= 40);
    }

    if (products.length === 0) {
      return getSampleShopeeProducts(category, type);
    }

    return products;
  } catch (error) {
    console.error(`Erro ao buscar Shopee (${type}):`, error);
    return getSampleShopeeProducts(category, type);
  }
}

function getSampleShopeeProducts(category: string, type: string = 'bestsellers'): Product[] {
  return [];
}
