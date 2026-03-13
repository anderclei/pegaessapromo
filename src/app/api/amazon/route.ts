import { NextResponse } from 'next/server';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    // 1. Try to load from synced hot products first
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      
      let products = [];
      if (category === 'todos') {
        products = Object.values(hotData).flat().sort(() => 0.5 - Math.random());
      } else {
        products = hotData[category] || [];
      }

      if (products.length > 0) {
        return NextResponse.json({ products, source: 'hot_sync' });
      }
    }

    // 2. Fallback to dynamic scraping if no synced data
    const products = await scrapeAmazon(category);
    return NextResponse.json({ products, source: 'dynamic' });
  } catch (error) {
    console.error('Error in Amazon API:', error);
    return NextResponse.json({ error: 'Erro ao buscar do Amazon', products: [] }, { status: 500 });
  }
}
