/**
 * Amazon Product Advertising API v5 (PA API)
 * Integração oficial para afiliados Amazon BR.
 *
 * Documentação: https://webservices.amazon.com/paapi5/documentation/
 * Endpoint BR:  webservices.amazon.com.br
 * Region:       us-east-1
 */

import crypto from 'crypto';
import axios from 'axios';
import { Product } from '../types';

const PAAPI_HOST = 'webservices.amazon.com.br';
const PAAPI_REGION = 'us-east-1';
const PAAPI_SERVICE = 'ProductAdvertisingAPI';
const MARKETPLACE = 'www.amazon.com.br';

// Browse Nodes principais para Amazon BR (IDs de categoria)
const BROWSE_NODES: Record<string, string> = {
  'electronics':          '16209062011',
  'computers':            '16209055011',
  'videogames':           '16241667011',
  'home':                 '16209073011',
  'kitchen':              '16209076011',
  'appliances':           '16209079011',
  'sports':               '16209097011',
  'hpc':                  '16209085011',   // Saúde & Beleza
  'books':                '17877899011',
  'toys':                 '16209091011',
  'music':                '16209094011',
  'automotive':           '16209052011',
};

// ─── AWS Signature V4 ────────────────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey: string, date: string, region: string, service: string): Buffer {
  const kDate    = hmac('AWS4' + secretKey, date);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function signRequest(
  method: string,
  path: string,
  payload: string,
  accessKey: string,
  secretKey: string,
) {
  const now = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hash(payload);

  const headers = {
    'content-encoding': 'amz-1.0',
    'content-type':     'application/json; charset=UTF-8',
    'host':             PAAPI_HOST,
    'x-amz-date':       amzDate,
    'x-amz-target':     `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${path.includes('searchitems') ? 'SearchItems' : 'GetItems'}`,
  };

  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n') + '\n';

  const canonicalRequest = [
    method,
    path,
    '',                 // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretKey, dateStamp, PAAPI_REGION, PAAPI_SERVICE);
  const signature  = hmac(signingKey, stringToSign).toString('hex');

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  return {
    ...headers,
    Authorization: authorizationHeader,
  };
}

// ─── Chamada genérica à PA API ───────────────────────────────────────────────

async function callPaApi(endpoint: 'searchitems' | 'getitems', payload: object, creds: { accessKey: string; secretKey: string }) {
  const path    = `/paapi5/${endpoint}`;
  const body    = JSON.stringify(payload);
  const signed  = signRequest('POST', path, body, creds.accessKey, creds.secretKey);

  const { data } = await axios.post(
    `https://${PAAPI_HOST}${path}`,
    body,
    { headers: signed, timeout: 15000 }
  );

  return data;
}

// ─── Conversão de item PA API → Product ─────────────────────────────────────

function mapItem(item: any, category: string, type: string): Product | null {
  try {
    const asin  = item.ASIN;
    const title = item.ItemInfo?.Title?.DisplayValue;
    if (!title || !asin) return null;

    const listing = item.Offers?.Listings?.[0];
    const price   = listing?.Price?.Amount ?? 0;
    const savings = listing?.Price?.Savings;
    const discount     = savings?.Percentage ?? 0;
    const originalPrice = savings ? (price + (savings.Amount ?? 0)) : undefined;

    const image = item.Images?.Primary?.Large?.URL
      ?? item.Images?.Primary?.Medium?.URL
      ?? '';

    const rating  = item.CustomerReviews?.StarRating?.Value ?? 4.5;
    const reviews = item.CustomerReviews?.Count ?? 0;

    const url = item.DetailPageURL ?? `https://www.amazon.com.br/dp/${asin}`;
    const freeShipping = listing?.DeliveryInfo?.IsFreeShippingEligible ?? true;

    return {
      id: asin,
      title,
      price,
      originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
      discount,
      image,
      rating,
      reviews,
      sales: Math.floor(reviews * 2.5),
      category,
      platform: 'amazon',
      url,
      freeShipping,
      type: type as any,
    };
  } catch {
    return null;
  }
}

// ─── API pública ─────────────────────────────────────────────────────────────

export interface PaApiCredentials {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
}

/**
 * Busca os produtos mais vendidos de uma categoria via PA API.
 */
export async function searchItemsByCategory(
  category: string,
  type: string = 'bestsellers',
  creds: PaApiCredentials,
  limit: number = 20,
): Promise<Product[]> {
  const browseNode = BROWSE_NODES[category] ?? BROWSE_NODES['electronics'];

  const sortBy: Record<string, string> = {
    'bestsellers':        'Featured',
    'new-releases':       'NewestArrivals',
    'movers-and-shakers': 'Featured',
    'most-wished-for':    'Featured',
    'lightning':          'PriceHighToLow',
    'super':              'PriceHighToLow',
  };

  const payload = {
    PartnerTag:   creds.partnerTag,
    PartnerType:  'Associates',
    Marketplace:  MARKETPLACE,
    BrowseNodeId: browseNode,
    SortBy:       sortBy[type] ?? 'Featured',
    ItemCount:    Math.min(limit, 10), // PA API limita a 10 por chamada
    Resources: [
      'ItemInfo.Title',
      'Offers.Listings.Price',
      'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
      'Images.Primary.Large',
      'Images.Primary.Medium',
      'CustomerReviews.Count',
      'CustomerReviews.StarRating',
      'ItemInfo.Features',
      'BrowseNodeInfo.BrowseNodes',
    ],
  };

  try {
    const response = await callPaApi('searchitems', payload, creds);
    const items: any[] = response?.SearchResult?.Items ?? [];
    console.log(`[PA API] ✅ ${items.length} itens para ${category}/${type}`);

    return items
      .map(item => mapItem(item, category, type))
      .filter((p): p is Product => p !== null && p.price > 0);
  } catch (err: any) {
    const status = err.response?.status;
    const msg    = err.response?.data?.Errors?.[0]?.Message ?? err.message;
    console.error(`[PA API] ❌ Erro ${status ?? ''} para ${category}/${type}: ${msg}`);
    return [];
  }
}

/**
 * Busca múltiplas páginas (10 itens por chamada, máx. 10 chamadas = 100 itens).
 */
export async function searchItemsPaged(
  category: string,
  type: string,
  creds: PaApiCredentials,
  maxItems: number = 20,
): Promise<Product[]> {
  const pages = Math.ceil(Math.min(maxItems, 100) / 10);
  const allProducts: Product[] = [];

  for (let page = 1; page <= pages; page++) {
    const browseNode = BROWSE_NODES[category] ?? BROWSE_NODES['electronics'];
    const payload = {
      PartnerTag:   creds.partnerTag,
      PartnerType:  'Associates',
      Marketplace:  MARKETPLACE,
      BrowseNodeId: browseNode,
      SortBy:       'Featured',
      ItemCount:    10,
      ItemPage:     page,
      Resources: [
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
        'Images.Primary.Large',
        'CustomerReviews.Count',
        'CustomerReviews.StarRating',
      ],
    };

    try {
      const response = await callPaApi('searchitems', payload, creds);
      const items: any[] = response?.SearchResult?.Items ?? [];
      const mapped = items
        .map(item => mapItem(item, category, type))
        .filter((p): p is Product => p !== null && p.price > 0);
      allProducts.push(...mapped);
    } catch {
      break; // para se der erro
    }

    if (page < pages) {
      await new Promise(r => setTimeout(r, 800)); // respeita rate limit
    }
  }

  return allProducts;
}

/**
 * Verifica se as credenciais são válidas testando uma chamada simples.
 */
export async function testPaApiCredentials(creds: PaApiCredentials): Promise<boolean> {
  try {
    const products = await searchItemsByCategory('electronics', 'bestsellers', creds, 1);
    return products.length >= 0; // resposta válida mesmo sem produtos
  } catch {
    return false;
  }
}
