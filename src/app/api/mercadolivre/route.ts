import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeMercadoLivre(category);
    return NextResponse.json({ products, source: 'mercadolivre' });
  } catch (error) {
    console.error('ML API Error:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar produtos do Mercado Livre' },
      { status: 500 }
    );
  }
}
