import { supabase } from './supabase';
import { Product, Promotion } from './types';

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (const i of Array(length).keys()) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function savePromotion(product: Product, affiliateLink: string): Promise<string> {
  const id = generateId();
  
  if (!supabase) {
    console.warn('Supabase not initialized, promotion not saved to DB but ID generated.');
    return id; 
  }

  const { error } = await supabase
    .from('promotions')
    .insert({
      id,
      product,
      affiliate_link: affiliateLink,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving promotion to Supabase:', error);
    // Don't throw, just return ID so the link works locally
  }
  
  return id;
}

import { hydrateAmazonPrice } from './scrapers/amazon';

export async function getPromotion(id: string): Promise<Promotion | null> {
  // 1. Try Supabase first
  if (supabase) {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      const product = data.product;
      if (product.platform === 'amazon') {
        await hydrateAmazonPrice(product);
      }
      return {
        id: data.id,
        product: product,
        affiliateLink: data.affiliate_link,
        createdAt: data.created_at,
      };
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching promotion from Supabase:', error);
    }
  }

  // 2. Fallback to hot_products.json
  try {
    const fs = require('fs');
    const path = require('path');
    const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');
    
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      
      // Flatten all categories to find the ID
      const allProducts = Object.values(hotData).flat() as Product[];
      const foundProduct = allProducts.find((p: any) => p && p.id === id);
      
      if (foundProduct) {
        if (foundProduct.platform === 'amazon') {
          await hydrateAmazonPrice(foundProduct);
        }
        return {
          id: foundProduct.id,
          product: foundProduct,
          affiliateLink: (foundProduct as any).url || '',
          createdAt: (foundProduct as any).createdAt || new Date().toISOString()
        };
      }
    }
  } catch (e) {
    console.error('Error reading hot_products for detail page:', e);
  }


  return null;
}

export async function getLatestPromotions(limit: number = 20): Promise<Promotion[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
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
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('product->>category', category)
        .neq('id', excludeId)
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
