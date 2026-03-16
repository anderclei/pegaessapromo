import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const type = searchParams.get('type') || 'bestsellers';

    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      let products = hotData[category] || [];
      if (type === 'bestsellers' && products.length > 0) {
        return NextResponse.json({ products, source: 'hot_sync' });
      }
    }

    const products = await scrapeMercadoLivre(category, type);
    return NextResponse.json({ products, source: 'mercadolivre', type });
  } catch (error) {
    console.error('ML API Error:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produtos do Mercado Livre' },
      { status: 500 }
    );
  }
}
