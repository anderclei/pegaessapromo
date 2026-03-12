import { NextResponse } from 'next/server';
import { scrapeRakuten } from '@/lib/scrapers/rakuten';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeRakuten(category);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar do Rakuten', products: [] }, { status: 500 });
  }
}
