import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import { Category } from '@/lib/types';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');

const CATEGORIES: Category[] = [
  'instrumentos_musicais'
];

export async function POST(request: Request) {
  try {
    const { config } = await request.json();
    console.log('Starting Mercado Livre sync...');
    
    const results: Record<string, any> = {};

    for (const cat of CATEGORIES) {
      console.log(`Syncing ML category: ${cat}`);
      try {
        const products = await scrapeMercadoLivre(cat, 'bestsellers');
        results[cat] = products;
      } catch (err) {
        console.error(`Error syncing ML ${cat}:`, err);
        results[cat] = [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(results, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização Mercado Livre concluída!',
      count: Object.values(results).flat().length
    });
  } catch (error) {
    console.error('Error syncing ML products:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar Mercado Livre' }, { status: 500 });
  }
}
