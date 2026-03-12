import { NextResponse } from 'next/server';
import { scrapeAwin } from '@/lib/scrapers/awin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeAwin(category);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar do Awin', products: [] }, { status: 500 });
  }
}
