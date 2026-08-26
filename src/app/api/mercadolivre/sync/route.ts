import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');
const CATEGORIES_FILE = path.join(process.cwd(), 'src/data/categories.json');

function getActiveCategories(): string[] {
  try {
    const cats = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
    return cats.map((c: any) => c.id);
  } catch {
    return ['eletronicos', 'informatica', 'eletrodomesticos'];
  }
}

export async function POST(request: Request) {
  try {
    console.log('[ML Sync] Iniciando sincronização...');
    
    const categories = getActiveCategories();
    const results: Record<string, any> = {};

    for (const cat of categories) {
      console.log(`[ML Sync] Categoria: ${cat}`);
      try {
        const products = await scrapeMercadoLivre(cat, 'bestsellers');
        results[cat] = products;
        console.log(`[ML Sync] ✅ ${products.length} produtos para ${cat}`);
      } catch (err) {
        console.error(`[ML Sync] ❌ Erro em ${cat}:`, err);
        results[cat] = [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Também busca "todos" como pool geral
    try {
      const allProducts = await scrapeMercadoLivre('todos', 'bestsellers');
      results['todos'] = allProducts;
    } catch {
      results['todos'] = [];
    }

    results['lastSync'] = new Date().toISOString();

    const dir = path.dirname(HOT_PRODUCTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HOT_PRODUCTS_FILE, JSON.stringify(results, null, 2));

    const total = Object.values(results).flat().filter(Array.isArray).length ||
                  Object.entries(results).filter(([k]) => k !== 'lastSync').reduce((sum, [, v]) => sum + (Array.isArray(v) ? v.length : 0), 0);

    return NextResponse.json({ 
      success: true, 
      message: `Sincronização Mercado Livre concluída! ${total} produtos.`,
      categories: categories,
      count: total,
    });
  } catch (error) {
    console.error('[ML Sync] Erro:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar Mercado Livre' }, { status: 500 });
  }
}
