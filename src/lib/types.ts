export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sales: number;
  reviews: number;
  category: string;
  platform: 'mercadolivre' | 'shopee' | 'aliexpress' | 'amazon' | 'lomadee' | 'awin' | 'rakuten';
  url: string;
  seller?: string;
  discount?: number;
  freeShipping?: boolean;
}

export interface AffiliateConfig {
  mercadolivreId: string;
  shopeeId: string;
  aliexpressId: string;
  amazonId: string;
  lomadeeId: string;
  awinId: string;
  rakutenId: string;
  mercadolivrePrefix: string;
  shopeePrefix: string;
  aliexpressPrefix: string;
  amazonPrefix: string;
  lomadeePrefix: string;
  awinPrefix: string;
  rakutenPrefix: string;
}

export type Platform = 'todos' | 'mercadolivre' | 'shopee' | 'aliexpress' | 'amazon' | 'lomadee' | 'awin' | 'rakuten';

export interface CopyResult {
  platform: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok';
  title: string;
  body: string;
  hashtags: string;
  affiliateLink: string;
}

export interface CopyTemplate {
  name: string;
  description: string;
  generate: (product: Product, affiliateLink: string) => CopyResult[];
}

export type Category = 'todos' | 'instrumentos_musicais';

export interface Promotion {
  id: string;
  product: Product;
  affiliateLink: string;
  createdAt: string;
}

export interface PromotionStore {
  [id: string]: Promotion;
}
