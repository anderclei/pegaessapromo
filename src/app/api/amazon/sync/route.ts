import { NextResponse } from 'next/server';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import { Category } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');

const CATEGORIES: Category[] = [
  'instrumentos_musicais'
];

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    
    // We don't strictly need PA-API for this scraping approach, 
    // but we can log that we are starting.
    console.log('Starting Amazon Best Sellers sync...');
    
    const results: Record<string, any> = {};

    for (const cat of CATEGORIES) {
      console.log(`Syncing category: ${cat}`);
      try {
        const products = await scrapeAmazon(cat);
        results[cat] = products;
      } catch (err) {
        console.error(`Error syncing ${cat}:`, err);
        results[cat] = [];
      }
      // Small delay to avoid aggressive scraping
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save to file
    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(results, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização concluída! O portal foi atualizado com as ofertas mais quentes.',
      count: Object.values(results).flat().length
    });
  } catch (error) {
    console.error('Error syncing Amazon products:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar' }, { status: 500 });
  }
}
