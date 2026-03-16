import { NextResponse } from 'next/server';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import { Category } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');

// Categories will be loaded dynamically from src/data/categories.json
const categoriesPath = path.join(process.cwd(), 'src/data/categories.json');

function getCategories() {
  try {
    const data = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    return data;
  } catch (e) {
    return [];
  }
}

// Support GET for easy browser-triggered sync
export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    // Safely parse body only if it's a POST with content
    let config = null;
    if (request.method === 'POST') {
      try { config = (await request.json())?.config; } catch (e) { /* ignore */ }
    }
    
    const now = new Date();
    const amazonId = config?.amazonId || 'andercleipino-20';
    
    console.log('Starting Amazon Best Sellers sync...');
    const results: Record<string, any> = {};
    
    const CATEGORIES = getCategories();
    
    const listTypes: ('bestsellers' | 'new-releases' | 'movers-and-shakers' | 'most-wished-for')[] = 
      ['bestsellers', 'new-releases', 'movers-and-shakers', 'most-wished-for'];
    
    // 1. Sync Standard Lists for each category
    for (const cat of CATEGORIES) {
      console.log(`Syncing category: ${cat.label} (ID: ${cat.id}, Slug: ${cat.amazonSlug})`);
      results[cat.id] = results[cat.id] || [];
      
      for (const listType of listTypes) {
        try {
          console.log(`  - Fetching list: ${listType}`);
          const products = await scrapeAmazon(cat.id, listType, cat.amazonSlug);
          let typedProducts = products.map((p, index) => {
            let url = p.url;
            if (url && !url.includes('tag=')) {
              const separator = url.includes('?') ? '&' : '?';
              url = `${url}${separator}tag=${amazonId}`;
            }
            return {
              ...p,
              url,
              platform: 'amazon' as const,
              listType,
              createdAt: p.createdAt || new Date(now.getTime() - index * 1000).toISOString()
            };
          });

          // Re-enable hydration for top products to ensure live price accuracy (Pix, etc)
          if (typedProducts.length > 0) {
            const { hydrateAmazonPrice } = require('@/lib/scrapers/amazon');
            for (let i = 0; i < Math.min(20, typedProducts.length); i++) {
               await hydrateAmazonPrice(typedProducts[i]);
               await new Promise(r => setTimeout(r, 600)); // Safer delay
            }
          }
          results[cat.id] = [...results[cat.id], ...typedProducts];
        } catch (err) {
          console.error(`Error syncing ${cat.id} list ${listType}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // 2. Sync Global Deals (Lightning & Super)
    const dealTypes: ('lightning' | 'super')[] = ['lightning', 'super'];
    results['ofertas_gerais'] = [];
    
    for (const type of dealTypes) {
      try {
        console.log(`Fetching global deals: ${type}`);
        const products = await scrapeAmazon('todos', type);
        let typedProducts = products.map((p, index) => {
          let url = p.url;
          if (url && !url.includes('tag=')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}tag=${amazonId}`;
          }
          return {
            ...p,
            url,
            platform: 'amazon' as const,
            type: type as any,
            createdAt: p.createdAt || new Date(now.getTime() - index * 1000 - 5000).toISOString()
          };
        });
        
        // Hydrate the EXACT prices from the detail page before caching them globally
        // This solves the discrepancy between List Price and Detail Page Price (e.g. Huawei mismatch)
        console.log(`Hydrating live prices for ${typedProducts.length} ${type}...`);
        const { hydrateAmazonPrice } = require('@/lib/scrapers/amazon');
        
        // Hydrate the top 20 of these deals synchronously to avoid rate-limits
        for (let i = 0; i < Math.min(20, typedProducts.length); i++) {
            await hydrateAmazonPrice(typedProducts[i]);
            await new Promise(r => setTimeout(r, 600)); // Sleep 600ms between calls
        }

        results['ofertas_gerais'] = [...results['ofertas_gerais'], ...typedProducts];
      } catch (err) {
        console.error(`Error syncing global ${type}:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save to file
    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Add metadata
    const finalData = {
      ...results,
      lastSync: new Date().toISOString(),
      metadata: {
        totalProducts: Object.values(results).flat().length,
        categoriesSynced: Object.keys(results).filter(k => k !== 'ofertas_gerais')
      }
    };

    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(finalData, null, 2));

    console.log(`Sync completed. Saved ${finalData.metadata.totalProducts} products to hot_products.json`);

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização concluída! O portal foi atualizado com as ofertas mais quentes.',
      count: finalData.metadata.totalProducts,
      lastSync: finalData.lastSync
    });
  } catch (error) {
    console.error('Error syncing Amazon products:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar' }, { status: 500 });
  }
}
