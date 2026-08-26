import { NextResponse } from 'next/server';
import { scrapeMagalu } from '@/lib/scrapers/magalu';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'eletronicos';
  const type = searchParams.get('type') || 'bestsellers';

  try {
    const products = await scrapeMagalu(category, type);
    
    return NextResponse.json({
      products,
      source: products.length > 0 ? 'magalu_scrape' : 'none',
      type,
    });
  } catch (error) {
    console.error('[Magalu API] Error:', error);
    return NextResponse.json({
      products: [],
      source: 'error',
      message: 'Falha ao buscar produtos do Magalu',
    });
  }
}
