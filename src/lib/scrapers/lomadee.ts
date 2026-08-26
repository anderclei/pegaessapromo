/**
 * Lomadee API v2 - Plataforma de Afiliados Brasileira
 *
 * Agrega ofertas de: Amazon BR, Magazine Luiza, Casas Bahia,
 * Shoptime, Submarino, Carrefour, Extra e outras.
 *
 * Docs: https://developer.lomadee.com/
 * Base: https://api.lomadee.com/v2/{sourceId}/
 *
 * Endpoints usados:
 *   GET /offer/_search   → busca ofertas por keyword
 *   GET /offer/_all      → todas as ofertas em destaque
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Product } from '../types';

const LOMADEE_BASE = 'https://api.lomadee.com/v2';
const CACHE_FILE = path.join(process.cwd(), 'data', 'hot_products_lomadee.json');
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas

// Mapa de categoria interna → keyword de busca Lomadee
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  eletronicos:     ['smart tv', 'fone bluetooth', 'smartwatch', 'tablet', 'projetor'],
  informatica:     ['notebook', 'mouse sem fio', 'ssd', 'monitor', 'webcam'],
  eletrodomesticos:['air fryer', 'geladeira', 'microondas', 'aspirador', 'ventilador'],
  moda:            ['tenis', 'mochila', 'relogio', 'camiseta'],
  esportes:        ['bicicleta', 'haltere', 'esteira', 'proteina'],
  casa:            ['sofa', 'luminaria', 'organizador', 'decoracao'],
  todos:           ['smart tv', 'air fryer', 'notebook', 'geladeira', 'smartphone'],
};

// ─── Cache ────────────────────────────────────────────────────────────────────

function readCache(category: string): Product[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      const lastSync = raw.lastSync ? new Date(raw.lastSync).getTime() : 0;
      if (Date.now() - lastSync < CACHE_TTL_MS) {
        return raw[category] || [];
      }
    }
  } catch {}
  return [];
}

function writeCache(category: string, products: Product[]): void {
  try {
    let raw: Record<string, any> = {};
    if (fs.existsSync(CACHE_FILE)) raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    raw[category] = products;
    raw.lastSync = new Date().toISOString();
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(raw, null, 2));
  } catch (e) {
    console.error('[Lomadee] Erro ao salvar cache:', e);
  }
}

// ─── Chamada à API ────────────────────────────────────────────────────────────

async function fetchLomadeeOffers(
  sourceId: string,
  keyword: string,
  limit = 30
): Promise<Product[]> {
  const url = `${LOMADEE_BASE}/${sourceId}/offer/_search`;
  console.log(`[Lomadee] 🔍 Buscando "${keyword}"...`);

  try {
    const { data } = await axios.get(url, {
      params: {
        keyword,
        page: 1,
        pageSize: limit,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PegaPromo/1.0)',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });

    const offers: any[] = data?.offers || [];
    console.log(`[Lomadee] ✅ ${offers.length} ofertas para "${keyword}"`);

    return offers
      .filter(o => o.name && o.link && o.price?.value)
      .map(o => {
        const price = parseFloat(o.price?.value ?? 0);
        const originalPrice = parseFloat(o.price?.regular ?? 0);
        const discount = (originalPrice > price && originalPrice > 0)
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : (o.discount?.value ? parseInt(o.discount.value) : 0);

        // Validação: desconto > 70% é suspeito
        const validDiscount = discount > 0 && discount <= 70 ? discount : 0;
        const validOriginal = validDiscount > 0 && originalPrice > price ? originalPrice : undefined;

        return {
          id: `lmd-${o.id ?? Math.random().toString(36).slice(2, 9)}`,
          title: o.name || '',
          price,
          originalPrice: validOriginal,
          discount: validDiscount,
          image: o.thumbnail || o.imageSmall || o.imageMedium || '',
          rating: 0,
          sales: 0,
          reviews: 0,
          category: keyword,
          platform: 'lomadee' as const,
          url: o.link || '',
          freeShipping: false,
          type: 'bestsellers' as const,
        };
      });
  } catch (err: any) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    console.error(`[Lomadee] ❌ Erro ${status ?? ''} para "${keyword}": ${msg}`);
    return [];
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function scrapeLomadee(
  category: string = 'todos',
  sourceId?: string
): Promise<Product[]> {
  if (!sourceId) {
    try {
      const { getSettings } = await import('../settings');
      const s = await getSettings();
      sourceId = s?.lomadeeId || '';
    } catch {}
  }

  if (!sourceId) {
    console.log('[Lomadee] ⚠️ sourceId não configurado — retornando vazio');
    return [];
  }

  // 1. Cache válido
  const cached = readCache(category);
  if (cached.length > 0) {
    console.log(`[Lomadee] 📦 ${cached.length} produtos do cache`);
    return cached;
  }

  // 2. Buscar via API
  const keywords = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS['todos'];
  const selected = [...keywords].sort(() => Math.random() - 0.5).slice(0, 3);

  const all: Product[] = [];
  const seenIds = new Set<string>();

  for (const kw of selected) {
    const products = await fetchLomadeeOffers(sourceId, kw, 25);
    for (const p of products) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        all.push({ ...p, category });
      }
    }
    await new Promise(r => setTimeout(r, 600));
  }

  // Ordena por maior desconto
  all.sort((a, b) => (b.discount || 0) - (a.discount || 0));

  if (all.length > 0) {
    writeCache(category, all);
    return all;
  }

  // 3. Fallback: cache expirado
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    return raw[category] || [];
  } catch { return []; }
}

export { writeCache as writeLomadeeCache };

