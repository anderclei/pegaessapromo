import { NextResponse } from 'next/server';
import { scrapeShopee } from '@/lib/scrapers/shopee';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeShopee(category);
    return NextResponse.json({ products, source: 'shopee' });
  } catch (error) {
    console.error('Shopee API Error:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produtos da Shopee' },
      { status: 500 }
    );
  }
}
