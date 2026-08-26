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
  platform: 'mercadolivre' | 'shopee' | 'aliexpress' | 'amazon' | 'magalu' | 'lomadee' | 'awin' | 'rakuten';
  url: string;
  seller?: string;
  discount?: number;
  freeShipping?: boolean;
  type?: 'bestsellers' | 'lightning' | 'super' | 'movers-and-shakers' | 'most-wished-for';
  listType?: 'bestsellers' | 'new-releases' | 'movers-and-shakers' | 'most-wished-for';
  createdAt?: string;
  creativeCopy?: string;
}

export interface AffiliateConfig {
  mercadolivreId?: string;
  mercadolivreAppId?: string;
  mercadolivreClientSecret?: string;
  // Shopee Open API credentials
  shopeeId?: string;           // Affiliate tracking ID (ex: AF12345)
  shopeePartnerId?: string;    // Partner ID from Shopee Open Platform
  shopeePartnerKey?: string;   // Partner Key (secret) for HMAC-SHA256
  shopeeShopId?: string;       // Shop ID (if selling; optional for affiliate)
  shopeeShopToken?: string;    // Shop access token (if selling; optional)
  aliexpressId?: string;
  amazonId?: string;
  amazonAccessKey?: string;
  amazonSecretKey?: string;
  geminiKey?: string;
  aiProvider?: 'gemini' | 'ollama';
  ollamaModel?: string;
  siteUrl?: string;
  copyStyle?: string;
  schedulerEnabled?: boolean;
  scheduleInterval?: number;
  scheduleMaxPosts?: number;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  fixedWhatsAppGroups?: any[];
  forbiddenWords?: string;
  igAccountId?: string;
  igAccessToken?: string;
  mercadolivreAccessToken?: string;
  mercadolivreRefreshToken?: string;
  mercadolivreTokenExpiresAt?: number;
  lomadeeId?: string;
  enabledSources?: {
    amazon?: boolean;
    mercadolivre?: boolean;
    shopee?: boolean;
    magalu?: boolean;
    lomadee?: boolean;
  };
}

export type Platform = 'todos' | 'mercadolivre' | 'shopee' | 'aliexpress' | 'amazon' | 'magalu' | 'lomadee' | 'awin' | 'rakuten';

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

export type Category = string;

export interface Promotion {
  id: string;
  product: Product;
  affiliateLink: string;
  createdAt: string;
}

export interface PromotionStore {
  [id: string]: Promotion;
}

export interface Coupon {
  id: string;
  code: string;
  discount: string;
  store: Platform;
  description: string;
  link: string;
  validUntil?: string;
  createdAt: string;
}
