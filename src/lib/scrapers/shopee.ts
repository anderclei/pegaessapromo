/**
 * Shopee Open API Integration
 * 
 * Autenticação: HMAC-SHA256 com Partner ID + Partner Key
 * Docs: https://open.shopee.com/documents/
 * 
 * Fluxo:
 *  1. Se credentials configuradas → usa Shopee Open API (real)
 *  2. Sem credentials → retorna VAZIO (sem dados fake)
 * 
 * IMPORTANTE: Nunca retorna dados fake/hardcoded.
 * Se não há API configurada, simplesmente não mostra produtos Shopee.
 */

import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Product } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const SHOPEE_BASE_URL = 'https://partner.shopeemobile.com';
const SHOPEE_AFFILIATE_HOST = 'https://open-api.affiliate.shopee.com.br';
const CACHE_FILE = path.join(process.cwd(), 'data', 'hot_products_shopee.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateShopeeSignature(
  partnerId: string,
  partnerKey: string,
  apiPath: string,
  timestamp: number
): string {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

function buildImageUrl(imageHash: string): string {
  if (!imageHash) return '';
  // Shopee CDN format for Brazil
  if (imageHash.startsWith('http')) return imageHash;
  return `https://down-br.img.susercontent.com/file/${imageHash}`;
}

function buildProductUrl(shopId: number | string, itemId: number | string, name?: string): string {
  const slug = name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 60)
    : 'produto';
  return `https://shopee.com.br/${slug}-i.${shopId}.${itemId}`;
}

function buildAffiliateUrl(productUrl: string, affiliateId?: string): string {
  if (!affiliateId) return productUrl;
  return `${productUrl}?af_sub1=${affiliateId}`;
}

/**
 * Valida se uma imagem URL é real (não é placeholder/random)
 */
function isValidProductImage(url: string): boolean {
  if (!url) return false;
  // Rejeita imagens fake/placeholder
  const fakeDomains = [
    'picsum.photos',
    'placeholder.com',
    'placehold.it',
    'via.placeholder',
    'dummyimage.com',
    'fakeimg.pl',
    'lorempixel.com',
  ];
  return !fakeDomains.some(domain => url.includes(domain));
}

/**
 * Valida se um produto tem dados mínimos reais
 */
function isValidProduct(product: Product): boolean {
  if (!product.title || product.title === 'Produto Shopee') return false;
  if (!product.url) return false;
  if (!product.image || !isValidProductImage(product.image)) return false;
  if (product.price <= 0) return false;
  return true;
}

// ─── Shopee Open API — Search Items ──────────────────────────────────────────

interface ShopeeOpenAPIConfig {
  partnerId: string;
  partnerKey: string;
  shopId?: string;
  shopToken?: string;
  affiliateId?: string;
}

async function searchShopeeProducts(
  config: ShopeeOpenAPIConfig,
  keyword: string,
  limit = 20
): Promise<Product[]> {
  const apiPath = '/api/v2/product/get_item_list';
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = generateShopeeSignature(config.partnerId, config.partnerKey, apiPath, timestamp);

  const params: Record<string, any> = {
    partner_id: parseInt(config.partnerId),
    timestamp,
    sign,
    page_size: limit,
    offset: 0,
    item_status: 'NORMAL',
  };

  if (config.shopId && config.shopToken) {
    params.shop_id = parseInt(config.shopId);
    params.access_token = config.shopToken;
  }

  try {
    const response = await axios.get(`${SHOPEE_BASE_URL}${apiPath}`, {
      params,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data?.response?.item) {
      const products = response.data.response.item.map((item: any) => {
        const price = item.price_info?.[0]?.current_price || item.price || 0;
        const originalPrice = item.price_info?.[0]?.original_price || price;
        const discount = originalPrice > price
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;

        return {
          id: `sh-${item.item_id}`,
          title: item.item_name || item.name || '',
          price: price / 100000,
          originalPrice: originalPrice / 100000,
          image: buildImageUrl(item.image?.image_url_list?.[0] || item.thumbnail || ''),
          rating: item.item_rating?.rating_star || 0,
          sales: item.historical_sold || item.sold || 0,
          reviews: item.item_rating?.rating_count?.[0] || 0,
          category: 'eletronicos',
          platform: 'shopee' as const,
          url: buildAffiliateUrl(
            buildProductUrl(item.shop_id, item.item_id, item.item_name),
            config.affiliateId
          ),
          freeShipping: item.logistics?.free_shipping || false,
          discount,
          type: 'bestsellers' as const,
        };
      });

      // Filtra apenas produtos com dados válidos
      return products.filter(isValidProduct);
    }
  } catch (err: any) {
    console.error('[Shopee API] Erro ao buscar produtos:', err.message);
  }

  return [];
}

// ─── Shopee Affiliate API — Top Offers ───────────────────────────────────────

async function fetchShopeeAffiliateOffers(
  config: ShopeeOpenAPIConfig,
  keyword: string,
  limit = 20,
  category = 'eletronicos'
): Promise<Product[]> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  const payload = {
    query: `
      query {
        productOfferV2(
          keyword: "${keyword}",
          limit: ${limit},
          page: 1,
          sortType: 1
        ) {
          nodes {
            itemId
            productName
            price
            commissionRate
            commission
            productLink
            offerLink
            imageUrl
            shopId
            ratingStar
            sales
            freeShipping: appExistRate
            priceDiscountRate
            originalPrice: priceMax
          }
        }
      }
    `
  };
  
  const payloadStr = JSON.stringify(payload);
  const factor = config.partnerId + timestamp + payloadStr + config.partnerKey;
  const sign = crypto.createHash('sha256').update(factor, 'utf8').digest('hex');

  try {
    const response = await axios.post(
      `${SHOPEE_AFFILIATE_HOST}/graphql`,
      payloadStr,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `SHA256 Credential=${config.partnerId}, Timestamp=${timestamp}, Signature=${sign}`,
        },
      }
    );

    const items = response.data?.data?.productOfferV2?.nodes || [];

    const products = items.map((item: any) => {
      const price = item.price || 0;
      const originalPrice = item.originalPrice || price;
      const discount = item.priceDiscountRate || 0;

      return {
        id: `sh-${item.itemId}`,
        title: item.productName || '',
        price,
        originalPrice,
        image: item.imageUrl || buildImageUrl(item.image || ''),
        rating: item.ratingStar || 0,
        sales: item.sales || 0,
        reviews: 0,
        category: category,
        platform: 'shopee' as const,
        url: buildAffiliateUrl(
          item.offerLink || item.productLink || buildProductUrl(item.shopId, item.itemId, item.productName),
          config.affiliateId
        ),
        freeShipping: item.freeShipping > 0 || false,
        discount,
        type: 'bestsellers' as const,
      };
    });

    return products.filter(isValidProduct);
  } catch (err: any) {
    console.error('[Shopee Affiliate API] Erro:', err.response?.data || err.message);
    return [];
  }
}

// ─── Cache (somente para dados reais da API) ────────────────────────────────

function readCache(category: string): Product[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      
      // Se o cache tem syncMode 'api', confia nos dados
      if (data.syncMode === 'api') {
        const products = data[category] || [];
        // Valida que não são dados fake antigos
        return products.filter((p: Product) => isValidProduct(p));
      }
    }
  } catch (e) {
    console.error('[Shopee] Erro ao ler cache:', e);
  }
  // Retorna vazio — NUNCA retorna dados fake
  return [];
}

export function writeCache(category: string, products: Product[]): void {
  try {
    let existing: Record<string, any> = {};
    if (fs.existsSync(CACHE_FILE)) {
      existing = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
    existing[category] = products;
    existing['lastSync'] = new Date().toISOString();
    existing['syncMode'] = 'api';
    fs.writeFileSync(CACHE_FILE, JSON.stringify(existing, null, 2));
  } catch (e) {
    console.error('[Shopee] Erro ao salvar cache:', e);
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

const CATEGORY_QUERIES: Record<string, string[]> = {
  ferramentas: ['parafusadeira', 'furadeira', 'jogo de ferramentas', 'esmerilhadeira', 'maleta de ferramentas', 'trena laser', 'serra eletrica'],
  eletronicos: ['smart tv', 'smartphone', 'tablet', 'fone bluetooth', 'smartwatch'],
  informatica: ['mouse gamer', 'teclado mecanico', 'notebook'],
  eletrodomesticos: ['ventilador', 'purificador', 'air fryer', 'geladeira'],
  moda: ['camiseta', 'roupa', 'moda'],
  esportes: ['tênis', 'esporte', 'academia'],
  casa: ['decoração', 'casa', 'organização'],
  beleza: ['maquiagem', 'skincare', 'beleza'],
  brinquedos: ['brinquedo', 'criança', 'jogo'],
  todos: ['parafusadeira', 'furadeira', 'jogo de ferramentas', 'smart tv', 'smartphone', 'notebook', 'air fryer'],
};

export async function scrapeShopee(
  category: string = 'eletronicos',
  type: string = 'bestsellers',
  credentials?: {
    partnerId?: string;
    partnerKey?: string;
    shopId?: string;
    shopToken?: string;
    affiliateId?: string;
  }
): Promise<Product[]> {
  // 0. Buscar categorias do arquivo para ver se tem Keyword customizada
  let categoriesData: any[] = [];
  try {
    const catPath = path.join(process.cwd(), 'src/data/categories.json');
    if (fs.existsSync(catPath)) {
      categoriesData = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    }
  } catch (e) {}

  const dbCategory = categoriesData.find(c => c.id === category);
  const customKeyword = dbCategory?.shopeeSlug;
  const queries = customKeyword ? [customKeyword] : (CATEGORY_QUERIES[category] || CATEGORY_QUERIES['eletronicos']);

  // 1. Se tem credenciais → tenta API real
  if (credentials?.partnerId && credentials?.partnerKey) {
    console.log('[Shopee] Usando API oficial com credentials');
    const config: ShopeeOpenAPIConfig = {
      partnerId: credentials.partnerId,
      partnerKey: credentials.partnerKey,
      shopId: credentials.shopId,
      shopToken: credentials.shopToken,
      affiliateId: credentials.affiliateId,
    };

    // Mistura as palavras-chave e pega até 3 para ter variedade
    const shuffled = [...queries].sort(() => Math.random() - 0.5);
    const selectedQueries = shuffled.slice(0, 1);

    let allProducts: Product[] = [];
    const seenIds = new Set<string>();

    for (const query of selectedQueries) {
      let products = await fetchShopeeAffiliateOffers(config, query, 15, category);
      if (!products.length) {
        products = await searchShopeeProducts(config, query, 15);
      }
      for (const p of products) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProducts.push({ ...p, category });
        }
      }
      await new Promise(r => setTimeout(r, 800)); // Rate limit
    }

    if (allProducts.length > 0) {
      writeCache(category, allProducts);
      return allProducts;
    }
    console.warn('[Shopee] API retornou vazio — nenhum produto válido encontrado');
  } else {
    console.log('[Shopee] Sem credenciais configuradas — retornando vazio (sem dados fake)');
  }

  // 2. Tenta cache SOMENTE se tem dados reais (syncMode === 'api')
  const cached = readCache(category);
  if (cached.length > 0) {
    console.log(`[Shopee] Retornando ${cached.length} produtos do cache (API real)`);
    return cached;
  }

  // 3. Retorna vazio — NUNCA retorna dados fake/hardcoded
  console.log('[Shopee] Nenhum dado real disponível — retornando vazio');
  return [];
}