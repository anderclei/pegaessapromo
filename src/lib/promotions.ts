import { supabase } from './supabase';
import { Product, Promotion } from './types';
import fs from 'fs';
import path from 'path';

const PROMOTIONS_FILE = path.join(process.cwd(), 'data', 'promotions.json');

// Local session cache for promotions
const promotionCache = new Map<string, Promotion>();

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (const i of Array(length).keys()) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Local file helpers ──────────────────────────────────────────────────────

function readLocalPromotions(): Record<string, Promotion> {
  try {
    if (fs.existsSync(PROMOTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(PROMOTIONS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function writeLocalPromotions(data: Record<string, Promotion>): void {
  try {
    const dir = path.dirname(PROMOTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[Promo] Erro ao salvar promotions.json:', e);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function savePromotion(product: Product, affiliateLink: string): Promise<string> {
  const id = product.id;
  const promo: Promotion = {
    id,
    product,
    affiliateLink,
    createdAt: new Date().toISOString(),
  };

  // 1. Sessão em memória
  promotionCache.set(id, promo);

  // 2. Arquivo local (sempre)
  const local = readLocalPromotions();
  local[id] = promo;
  writeLocalPromotions(local);

  // 3. Supabase (opcional)
  if (supabase) {
    try {
      await supabase.from('promotions').upsert({
        id,
        product,
        affiliate_link: affiliateLink,
        created_at: promo.createdAt,
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Promo] Supabase indisponível. Salvo apenas localmente.');
    }
  }

  return id;
}

import { hydrateAmazonPrice } from './scrapers/amazon';

export async function getPromotion(id: string): Promise<Promotion | null> {
  // 1. Cache de sessão
  if (promotionCache.has(id)) return promotionCache.get(id) || null;

  // 2. Arquivo local
  const local = readLocalPromotions();
  if (local[id]) {
    promotionCache.set(id, local[id]);
    return local[id];
  }

  // 3. Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          product: data.product,
          affiliateLink: data.affiliate_link,
          createdAt: data.created_at,
        };
      }
    } catch (e) {}
  }

  // 4. hot_products.json (Amazon, Mercado Livre, Shopee)
  try {
    const PLATFORM_FILES = [
      path.join(process.cwd(), 'data', 'hot_products.json'),
      path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json'),
      path.join(process.cwd(), 'data', 'hot_products_shopee.json'),
    ];

    for (const file of PLATFORM_FILES) {
      if (fs.existsSync(file)) {
        const hotData = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const allProducts = Object.values(hotData).flat().filter((p: any) => p && typeof p === 'object' && p.id) as any[];
        const foundProduct = allProducts.find((p: any) => p.id && p.id.toString().toUpperCase() === id.toUpperCase());
        
        if (foundProduct) {
          return {
            id: foundProduct.id,
            product: foundProduct,
            affiliateLink: (foundProduct as any).url || '',
            createdAt: (foundProduct as any).createdAt || new Date().toISOString()
          };
        }
      }
    }
  } catch (e) {}

  console.warn(`[Promo] Promoção não encontrada: ${id}`);
  return null;
}

export async function getLatestPromotions(limit: number = 20): Promise<Promotion[]> {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // 1. Arquivo local (sempre disponível)
  try {
    const local = readLocalPromotions();
    const items = Object.values(local)
      .filter(p => new Date(p.createdAt) >= twoDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    if (items.length > 0) return items;
  } catch (e) {}

  // 2. Supabase (fallback online)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          product: item.product,
          affiliateLink: item.affiliate_link,
          createdAt: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('[Promo] Supabase indisponível para getLatestPromotions.');
    }
  }

  return [];
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

  // Contar total de produtos no novo hotData
  const totalProducts = Object.entries(hotData)
    .filter(([k]) => !['lastSync', 'metadata', 'syncMode'].includes(k))
    .reduce((acc, [, v]) => acc + (Array.isArray(v) ? v.length : 0), 0);

  // 1. Salvar localmente SOMENTE se trouxer produtos (protege cache válido)
  if (totalProducts > 0) {
    try {
      const dir = path.dirname(HOT_PRODUCTS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(hotData, null, 2));
      console.log(`[HotProducts] ✅ Cache local salvo: ${totalProducts} produtos`);
    } catch (e) {
      console.warn('[HotProducts] Não foi possível salvar localmente.');
    }
  } else {
    console.warn('[HotProducts] ⚠️ Sync retornou 0 produtos — cache local preservado.');
  }

  // 2. Salvar no Supabase se disponível
  if (supabase && totalProducts > 0) {
    try {
      await supabase
        .from('settings')
        .upsert({
          id: 'hot_products_cache',
          config: hotData,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn('[HotProducts] Supabase indisponível.');
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
