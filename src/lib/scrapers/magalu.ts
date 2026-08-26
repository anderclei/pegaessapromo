/**
 * Magazine Luiza (Magalu) Scraper
 * 
 * Extrai produtos da busca do site magazineluiza.com.br
 * via __NEXT_DATA__ (dados JSON embutidos no HTML).
 * 
 * Faz busca por termos relevantes para cada categoria,
 * garantindo que os produtos exibidos sejam reais e atualizados.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Product } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAGALU_BASE = 'https://www.magazineluiza.com.br';
const CACHE_FILE = path.join(process.cwd(), 'data', 'hot_products_magalu.json');

const CATEGORY_QUERIES: Record<string, string[]> = {
  ferramentas: [
    'parafusadeira', 'furadeira de impacto', 'jogo de ferramentas', 'esmerilhadeira',
    'serra circular', 'maleta de ferramentas', 'trena laser', 'chave de impacto'
  ],
  eletronicos: [
    'smart tv', 'fone bluetooth', 'caixa de som bluetooth', 'echo dot',
    'fire tv stick', 'smartwatch', 'tablet', 'projetor', 'smartphone'
  ],
  informatica: [
    'notebook', 'mouse gamer', 'teclado mecânico', 'monitor gamer',
    'ssd', 'webcam', 'headset gamer', 'impressora',
  ],
  eletrodomesticos: [
    'air fryer', 'aspirador robô', 'cafeteira', 'microondas',
    'ventilador', 'geladeira', 'máquina lavar', 'fogão',
  ],
  todos: [
    'parafusadeira', 'furadeira', 'jogo de ferramentas', 'esmerilhadeira'
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  // Magalu CDN uses template: {w}x{h} for dimensions
  return rawUrl
    .replace('{w}', '400')
    .replace('{h}', '400')
    .replace('http://', 'https://');
}

function buildProductUrl(productPath: string): string {
  if (!productPath) return '';
  if (productPath.startsWith('http')) return productPath;
  return `${MAGALU_BASE}${productPath}`;
}

// ─── Core Scraper ─────────────────────────────────────────────────────────────

async function fetchMagaluProducts(query: string, limit: number = 30): Promise<Product[]> {
  const searchUrl = `${MAGALU_BASE}/busca/${encodeURIComponent(query)}/`;
  
  console.log(`[Magalu] 🔍 Buscando: "${query}"`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();

    // Extract __NEXT_DATA__ JSON (sem flag /s para compatibilidade com ES2017)
    const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      console.warn('[Magalu] ⚠️ __NEXT_DATA__ não encontrado');
      return [];
    }

    const nextData = JSON.parse(scriptMatch[1]);
    const searchProducts = nextData?.props?.pageProps?.data?.search?.products;

    if (!searchProducts || !Array.isArray(searchProducts)) {
      console.warn('[Magalu] ⚠️ Nenhum produto encontrado na estrutura');
      return [];
    }

    const products: Product[] = [];

    for (const item of searchProducts) {
      if (products.length >= limit) break;
      if (!item.available) continue; // Skip unavailable products

      const title = item.title || '';
      const priceData = item.price || {};
      
      // Magalu price structure:
      //   price     = preço cheio original (De:)
      //   bestPrice = melhor preço no Pix (Por:)
      //   fullPrice = preço intermediário (parcela) — NÃO usar como "De:"
      const bestPrice = parseFloat(priceData.bestPrice) || 0;
      const listPrice = parseFloat(priceData.price) || 0;
      const price = bestPrice || listPrice; // Melhor preço disponível
      
      // Só usar preço original se for REALMENTE maior que o preço final
      const originalPrice = (listPrice > price && listPrice > 0) ? listPrice : 0;
      
      const image = buildImageUrl(item.image || item.thumbnails?.[0] || '');
      const productUrl = buildProductUrl(item.path || '');
      const ratingData = item.rating || {};

      if (!title || price <= 0 || !productUrl) continue;

      let discount = 0;
      if (originalPrice > 0 && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
        // Validação: desconto > 70% é suspeito
        if (discount > 70) {
          discount = 0;
        }
      }

      // Installment info
      const installment = item.installment || {};

      products.push({
        id: `mg-${item.id || item.variationId}`,
        title,
        price,
        originalPrice: (discount > 0 && originalPrice > price) ? originalPrice : undefined,
        discount,
        image,
        rating: ratingData.score || ratingData.average || 0,
        sales: ratingData.totalReview || 0,
        reviews: ratingData.totalReview || 0,
        category: 'eletronicos',
        platform: 'magalu' as any,
        url: productUrl,
        freeShipping: item.shippingCost === 0 || item.shippingTag === 'frete_gratis',
        type: 'bestsellers' as any,
      });
    }

    console.log(`[Magalu] ✅ ${products.length} produtos encontrados para "${query}"`);
    return products;

  } catch (err: any) {
    console.error(`[Magalu] ❌ Erro ao buscar "${query}":`, err.message);
    return [];
  }
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function readCache(category: string, allowStale = false): Product[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      const lastSync = data.lastSync ? new Date(data.lastSync) : null;
      const products = data[category] || [];

      // Cache válido por 24 horas
      if (lastSync && (Date.now() - lastSync.getTime()) < 24 * 60 * 60 * 1000) {
        return products;
      }

      // Stale cache: retorna mesmo assim se pedido
      if (allowStale && products.length > 0) {
        console.log(`[Magalu] ⚠️ Usando cache expirado para "${category}" (${products.length} produtos)`);
        return products;
      }
    }
  } catch (e) {
    console.error('[Magalu] Erro ao ler cache:', e);
  }
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
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(existing, null, 2));
  } catch (e) {
    console.error('[Magalu] Erro ao salvar cache:', e);
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function scrapeMagalu(
  category: string = 'eletronicos',
  type: string = 'bestsellers'
): Promise<Product[]> {
  // 1. Tentar cache válido primeiro
  const cached = readCache(category, false);
  if (cached.length > 0) {
    console.log(`[Magalu] 📦 ${cached.length} produtos do cache`);
    return cached;
  }

  // 2. Buscar do site
  const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES['ferramentas'];
  
  // Busca 1 termo por chamada para ser super rápido no Serverless
  const shuffled = [...queries].sort(() => Math.random() - 0.5);
  const selectedQueries = shuffled.slice(0, 1);
  
  const allProducts: Product[] = [];
  const seenIds = new Set<string>();

  for (const query of selectedQueries) {
    const products = await fetchMagaluProducts(query, 25);
    for (const p of products) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        allProducts.push({ ...p, category });
      }
    }
    // Delay entre buscas para não sobrecarregar
    await new Promise(r => setTimeout(r, 800));
  }

  // Ordena por desconto (maiores descontos primeiro)
  allProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));

  // Salva no cache se encontrou produtos novos
  if (allProducts.length > 0) {
    writeCache(category, allProducts);
    return allProducts;
  }

  // 3. Fallback: usar cache expirado se scrape falhou
  const staleCache = readCache(category, true);
  if (staleCache.length > 0) {
    console.log(`[Magalu] 🔄 Fallback: ${staleCache.length} produtos do cache expirado`);
    return staleCache;
  }

  return [];
}
