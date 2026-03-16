import { NextResponse } from 'next/server';
import { scrapeShopee } from '@/lib/scrapers/shopee';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_shopee.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';
  const type = searchParams.get('type') || 'bestsellers';

  try {
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      let products = hotData[category] || [];
      // If we are looking for a specific type, we might still need to scrape 
      // or filter from the list if the list has all of them.
      // But usually sync is for bestsellers.
      if (type === 'bestsellers' && products.length > 0) {
        return NextResponse.json({ products, source: 'hot_sync' });
      }
    }

    const products = await scrapeShopee(category, type);
    return NextResponse.json({ products, source: 'shopee', type });
  } catch (error) {
    console.error('Shopee API Error:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produtos da Shopee' },
      { status: 500 }
    );
  }
}
