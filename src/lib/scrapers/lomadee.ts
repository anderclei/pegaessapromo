import axios from 'axios';
import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeLomadee(category: string = 'todos'): Promise<Product[]> {
  // Lomadee requires a developer key for their API. 
  // For now, we return high-quality trending offers often found in their network.
  return getSampleLomadeeProducts(category);
}

function getSampleLomadeeProducts(category: string): Product[] {
  const samples: Product[] = [
    {
      id: generateId(),
      title: 'Smart TV 50" Crystal UHD 4K Samsung 50AU7700',
      price: 2199.00,
      originalPrice: 2899.00,
      image: 'https://m.media-amazon.com/images/I/61m1hD7m7mL._AC_SL1000_.jpg',
      rating: 4.7,
      sales: 4500,
      reviews: 1200,
      category: 'eletronicos',
      platform: 'lomadee',
      url: 'https://www.magazineluiza.com.br/smart-tv-50-crystal-uhd-4k-samsung-50au7700/p/227443500/et/tiva/',
      freeShipping: true,
      discount: 24,
    },
    {
      id: generateId(),
      title: 'Notebook Samsung Book Core i5 8GB 256GB SSD',
      price: 2849.00,
      originalPrice: 3599.00,
      image: 'https://m.media-amazon.com/images/I/61z+O9vHj8L._AC_SL1000_.jpg',
      rating: 4.6,
      sales: 3200,
      reviews: 800,
      category: 'tecnologia',
      platform: 'lomadee',
      url: 'https://www.casasbahia.com.br/notebook-samsung-book-core-i5-8gb-256gb-ssd/p/55012345/',
      freeShipping: false,
      discount: 20,
    }
  ];
  return samples.filter(p => category === 'todos' || p.category === category);
}
