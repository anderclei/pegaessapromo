import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeAwin(category: string = 'todos'): Promise<Product[]> {
  // Awin API requires an OAuth token and specific advertiser IDs.
  // Returning trending fallback data for now.
  return getSampleAwinProducts(category);
}

function getSampleAwinProducts(category: string): Product[] {
  const samples: Product[] = [
    {
      id: generateId(),
      title: 'Apple iPhone 15 (128 GB) — Preto',
      price: 4699.00,
      originalPrice: 7299.00,
      image: 'https://m.media-amazon.com/images/I/71v2jVh6nIL._AC_SL1500_.jpg',
      rating: 4.9,
      sales: 15000,
      reviews: 3200,
      category: 'tecnologia',
      platform: 'awin',
      url: 'https://www.apple.com/br/shop/buy-iphone/iphone-15',
      freeShipping: true,
      discount: 35,
    },
    {
      id: generateId(),
      title: 'Console PlayStation®5 + Marvel’s Spider-Man 2',
      price: 3999.00,
      originalPrice: 4499.00,
      image: 'https://m.media-amazon.com/images/I/61S9df6k9WL._AC_SL1500_.jpg',
      rating: 4.8,
      sales: 8500,
      reviews: 1500,
      category: 'eletronicos',
      platform: 'awin',
      url: 'https://www.playstation.com/pt-br/ps5/',
      freeShipping: true,
      discount: 11,
    }
  ];
  return samples.filter(p => category === 'todos' || p.category === category);
}
