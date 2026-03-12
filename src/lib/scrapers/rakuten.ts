import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeRakuten(category: string = 'todos'): Promise<Product[]> {
  // Rakuten Advertising API is highly protected.
  // Returning trending fallback data for now.
  return getSampleRakutenProducts(category);
}

function getSampleRakutenProducts(category: string): Product[] {
  const samples: Product[] = [
    {
      id: generateId(),
      title: 'Tênis Nike Air Force 1 07 Masculino',
      price: 799.99,
      originalPrice: 899.99,
      image: 'https://imgnike-a.akamaihd.net/1300x1300/01113751.jpg',
      rating: 4.7,
      sales: 12000,
      reviews: 5400,
      category: 'mulher',
      platform: 'rakuten',
      url: 'https://www.nike.com.br/tenis-nike-air-force-1-07-masculino-153-169-211-226500',
      freeShipping: true,
      discount: 11,
    },
    {
      id: generateId(),
      title: 'Bolsa Prada Galleria em couro Saffiano',
      price: 24500.00,
      originalPrice: 28000.00,
      image: 'https://www.prada.com/content/dam/pradabkg_products/1/1BA/1BA863/NZVF0002/1BA863_NZV_F0002_V_OOO_SLF.jpg',
      rating: 5.0,
      sales: 150,
      reviews: 45,
      category: 'mulher',
      platform: 'rakuten',
      url: 'https://www.prada.com/br/pt/women/bags/top_handles/products.bolsa_prada_galleria_em_couro_saffiano.1BA863_NZV_F0002_V_OOO.html',
      freeShipping: true,
      discount: 12,
    }
  ];
  return samples.filter(p => category === 'todos' || p.category === category);
}
