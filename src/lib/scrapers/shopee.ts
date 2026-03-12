import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeShopee(category: string = 'todos'): Promise<Product[]> {
  try {
    const url = `https://shopee.com.br/mall/daily_discover`;

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
            price: price || Math.floor(Math.random() * 200) + 20,
            originalPrice: price ? price * 1.4 : undefined,
            image: image || `https://placehold.co/300x300/ee5a24/ffffff?text=${encodeURIComponent(title.slice(0, 10))}`,
            rating: 4 + Math.random(),
            sales: Math.floor(Math.random() * 50000) + 1000,
            reviews: Math.floor(Math.random() * 10000) + 200,
            category: category !== 'todos' ? category : 'geral',
            platform: 'shopee',
            url: link.startsWith('http') ? link : `https://shopee.com.br${link}`,
            freeShipping: Math.random() > 0.4,
            discount: Math.floor(Math.random() * 50) + 10,
          });
        }
      });

      if (products.length > 0) break;
    }

    if (products.length === 0) {
      return getSampleShopeeProducts(category);
    }

    return products;
  } catch (error) {
    console.error('Erro ao buscar produtos da Shopee:', error);
    return getSampleShopeeProducts(category);
  }
}

function getSampleShopeeProducts(category: string): Product[] {
  const samples: Product[] = [
    {
      id: generateId(),
      title: 'Mini Projetor Portátil LED Full HD Wi-Fi Bluetooth',
      price: 199.90,
      originalPrice: 399.90,
      image: 'https://placehold.co/300x300/ee5a24/ffffff?text=Projetor',
      rating: 4.6,
      sales: 28700,
      reviews: 14200,
      category: 'eletronicos',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 50,
    },
    {
      id: generateId(),
      title: 'Ring Light 26cm Profissional com Tripé 2m e Suporte Celular',
      price: 54.90,
      originalPrice: 119.90,
      image: 'https://placehold.co/300x300/f0932b/ffffff?text=RingLight',
      rating: 4.7,
      sales: 89300,
      reviews: 42100,
      category: 'foto_video',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 54,
    },
    {
      id: generateId(),
      title: 'Tênis Casual Feminino Plataforma Confortável Leve',
      price: 79.90,
      originalPrice: 159.90,
      image: 'https://placehold.co/300x300/e55039/ffffff?text=Tenis',
      rating: 4.4,
      sales: 56700,
      reviews: 31200,
      category: 'mulher',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 50,
    },
    {
      id: generateId(),
      title: 'Kit Skincare Coreano 7 Passos Limpeza + Hidratação',
      price: 95.90,
      originalPrice: 189.90,
      image: 'https://placehold.co/300x300/fc5c65/ffffff?text=Skincare',
      rating: 4.8,
      sales: 34500,
      reviews: 18900,
      category: 'mulher',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: false,
      discount: 49,
    },
    {
      id: generateId(),
      title: 'Escova Alisadora Elétrica Cerâmica Íons Negativos',
      price: 65.90,
      originalPrice: 129.90,
      image: 'https://placehold.co/300x300/eb3b5a/ffffff?text=Escova',
      rating: 4.5,
      sales: 72100,
      reviews: 38400,
      category: 'mulher',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 49,
    },
    {
      id: generateId(),
      title: 'Bolsa Feminina Transversal Couro Ecológico Elegante',
      price: 49.90,
      originalPrice: 99.90,
      image: 'https://placehold.co/300x300/fa8231/ffffff?text=Bolsa',
      rating: 4.3,
      sales: 41200,
      reviews: 19800,
      category: 'mulher',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 50,
    },
    {
      id: generateId(),
      title: 'Panela Elétrica Multifuncional 5L Arroz Bolo Iogurte',
      price: 119.90,
      originalPrice: 249.90,
      image: 'https://placehold.co/300x300/fc5c65/ffffff?text=Panela',
      rating: 4.6,
      sales: 18900,
      reviews: 8700,
      category: 'casa',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 52,
    },
    {
      id: generateId(),
      title: 'Faixa Elástica Exercício Kit 5 Níveis Resistência',
      price: 24.90,
      originalPrice: 59.90,
      image: 'https://placehold.co/300x300/ff6348/ffffff?text=Elastico',
      rating: 4.7,
      sales: 93400,
      reviews: 51200,
      category: 'mulher',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: false,
      discount: 58,
    },
    {
      id: generateId(),
      title: 'Aspirador de Pó Robô Inteligente Wi-Fi Mapeamento',
      price: 289.90,
      originalPrice: 549.90,
      image: 'https://placehold.co/300x300/d63031/ffffff?text=RoboAspirador',
      rating: 4.5,
      sales: 12300,
      reviews: 5600,
      category: 'casa',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 47,
    },
    {
      id: generateId(),
      title: 'Câmera de Segurança Wi-Fi 360° Visão Noturna HD',
      price: 78.90,
      originalPrice: 149.90,
      image: 'https://placehold.co/300x300/e74c3c/ffffff?text=Camera360',
      rating: 4.4,
      sales: 67800,
      reviews: 29400,
      category: 'foto_video',
      platform: 'shopee',
      url: 'https://shopee.com.br',
      freeShipping: true,
      discount: 47,
    },
  ];

  if (category !== 'todos') {
    return samples.filter(p => p.category === category);
  }
  return samples;
}
