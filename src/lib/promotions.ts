import { supabase } from './supabase';
import { Product, Promotion } from './types';

// Local session cache for promotions to ensure links work during development/testing
// even if database sync is not immediate or Supabase is not configured.
const promotionCache = new Map<string, Promotion>();

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (const i of Array(length).keys()) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function savePromotion(product: Product, affiliateLink: string): Promise<string> {
  // Use product.id as the permanent ID for the promotion to ensure 
  // consistency with the hot_products.json fallback.
  const id = product.id;
  const promo: Promotion = {
    id: id,
    product: product,
    affiliateLink: affiliateLink,
    createdAt: new Date().toISOString(),
  };

  // 1. Save to local session cache (instant fallback)
  promotionCache.set(id, promo);
  
  if (!supabase) {
    console.warn(`[PROM] Supabase missing. ID ${id} cached locally.`);
    return id; 
  }

  // 2. Save to Supabase for persistence
  const { error } = await supabase
    .from('promotions')
    .upsert({
      id,
      product,
      affiliate_link: affiliateLink,
      created_at: promo.createdAt,
    }, { onConflict: 'id' });

  if (error) {
    console.error(`[PROM] Error saving ID ${id} to Supabase:`, error);
  }
  
  return id;
}

import { hydrateAmazonPrice } from './scrapers/amazon';

export async function getPromotion(id: string): Promise<Promotion | null> {
  console.log(`[PROM] Buscando promoção ID: ${id}`);

  // 1. Try local session cache (fast & works for manual offers in dev)
  if (promotionCache.has(id)) {
    console.log(`[PROM] Encontrada no cache de sessão: ${id}`);
    return promotionCache.get(id) || null;
  }

  // 2. Try Supabase
  if (supabase) {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      console.log(`[PROM] Encontrada no Supabase: ${id}`);
      return {
        id: data.id,
        product: data.product,
        affiliateLink: data.affiliate_link,
        createdAt: data.created_at,
      };
    }
  }

  // 3. Fallback to hot_products.json
  try {
    const fs = require('fs');
    const path = require('path');
    const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');
    
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      
      const allProducts = Object.values(hotData).flat() as Product[];
      const foundProduct = allProducts.find((p: any) => p && p.id === id);
      
      if (foundProduct) {
        console.log(`[PROM] Encontrada em hot_products.json: ${id}`);
        return {
          id: foundProduct.id,
          product: foundProduct,
          affiliateLink: (foundProduct as any).url || '',
          createdAt: (foundProduct as any).createdAt || new Date().toISOString()
        };
      }
    }
  } catch (e) {}

  console.warn(`[PROM] Promoção NÃO encontrada em lugar nenhum: ${id}`);
  return null;
}

export async function getLatestPromotions(limit: number = 20): Promise<Promotion[]> {
  if (!supabase) return [];
  
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .gte('created_at', twoDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest promotions from Supabase:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    product: item.product,
    affiliateLink: item.affiliate_link,
    createdAt: item.created_at,
  }));
}

export async function getRelatedPromotions(category: string, excludeId: string, limit: number = 10): Promise<Promotion[]> {
  const related: Promotion[] = [];
  const usedIds = new Set([excludeId]);

  // 1. Try Supabase for manual products in SAME category
  if (supabase) {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('product->>category', category)
        .neq('id', excludeId)
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        data.forEach((item: any) => {
          related.push({
            id: item.id,
            product: item.product,
            affiliateLink: item.affiliate_link,
            createdAt: item.created_at,
          });
          usedIds.add(item.id);
        });
      }
    } catch (e) {}
  }

  // 2. Try hot_products.json for automated products in SAME category
  try {
    const fs = require('fs');
    const path = require('path');
    const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');
    
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      
      // Specifically look in the correct category key
      const catProducts = (hotData[category] || []) as Product[];
      
      catProducts.forEach((p: any) => {
        if (related.length < limit && p && p.id && !usedIds.has(p.id)) {
          related.push({
            id: p.id,
            product: p,
            affiliateLink: p.url || '',
            createdAt: p.createdAt || new Date().toISOString()
          });
          usedIds.add(p.id);
        }
      });

      // Also check global deals if we don't have enough
      if (related.length < limit) {
        const globalDeals = (hotData['ofertas_gerais'] || []) as Product[];
        globalDeals.forEach((p: any) => {
          if (related.length < limit && p && p.id && !usedIds.has(p.id)) {
            related.push({
              id: p.id,
              product: p,
              affiliateLink: p.url || '',
              createdAt: p.createdAt || new Date().toISOString()
            });
            usedIds.add(p.id);
          }
        });
      }
    }
  } catch (e) {}

  // 3. Last fallback: if still empty, get latest general promotions
  if (related.length === 0) {
    return getLatestPromotions(limit);
  }

  return related;
}
// 3. Hot Products (Cached Sync) storage
export async function saveHotProducts(hotData: any): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');
  
  // 1. Always try to save locally for dev
  try {
    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(hotData, null, 2));
  } catch (e) {
    console.warn('Could not save hot_products locally (likely Vercel environment)');
  }

  // 2. Save to Supabase for persistence on Vercel
  if (supabase) {
    try {
      await supabase
        .from('settings')
        .upsert({
          id: 'hot_products_cache',
          config: hotData,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.error('Error saving hot_products to Supabase:', e);
    }
  }
}

export async function loadHotProducts(): Promise<any> {
  // 1. Try Supabase first (Live source)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('config')
        .eq('id', 'hot_products_cache')
        .single();
      
      if (!error && data && data.config) {
        return data.config;
      }
    } catch (e) {}
  }

  // 2. Fallback to local file
  try {
    const fs = require('fs');
    const path = require('path');
    const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8'));
    }
  } catch (e) {}

  return null;
}
