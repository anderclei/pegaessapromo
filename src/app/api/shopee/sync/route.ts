import { NextResponse } from 'next/server';
import { scrapeShopee } from '@/lib/scrapers/shopee';
import { Category } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_shopee.json');

const CATEGORIES: Category[] = [
  'instrumentos_musicais'
];

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    console.log('Starting Shopee sync...');
    
    const results: Record<string, any> = {};

    for (const cat of CATEGORIES) {
      console.log(`Syncing Shopee category: ${cat}`);
      try {
        const products = await scrapeShopee(cat, 'bestsellers');
        results[cat] = products;
      } catch (err) {
        console.error(`Error syncing Shopee ${cat}:`, err);
        results[cat] = [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(results, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização Shopee concluída!',
      count: Object.values(results).flat().length
    });
  } catch (error) {
    console.error('Error syncing Shopee products:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar Shopee' }, { status: 500 });
  }
}
