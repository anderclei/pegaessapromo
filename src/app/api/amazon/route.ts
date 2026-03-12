import { NextResponse } from 'next/server';
import { scrapeAmazon } from '@/lib/scrapers/amazon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeAmazon(category);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar do Amazon', products: [] }, { status: 500 });
  }
}
