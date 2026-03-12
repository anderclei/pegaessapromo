import { NextResponse } from 'next/server';
import { scrapeLomadee } from '@/lib/scrapers/lomadee';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    const products = await scrapeLomadee(category);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar do Lomadee', products: [] }, { status: 500 });
  }
}
