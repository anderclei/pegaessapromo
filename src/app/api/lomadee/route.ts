import { NextResponse } from 'next/server';
import { scrapeLomadee } from '@/lib/scrapers/lomadee';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';
  const forceSync = searchParams.get('force') === 'true';

  try {
    const settings = await getSettings();
    const sourceId = settings?.lomadeeId || '';

    if (!sourceId) {
      return NextResponse.json({
        products: [],
        source: 'no_credentials',
        message: 'Configure o Lomadee Source ID em Configurações → Lomadee.',
      });
    }

    const products = await scrapeLomadee(category, sourceId);

    return NextResponse.json({
      products,
      source: products.length > 0 ? 'lomadee_api' : 'empty',
      total: products.length,
    });
  } catch (error: any) {
    console.error('[Lomadee Route Error]:', error.message);
    return NextResponse.json(
      { products: [], error: 'api_error', message: error.message },
      { status: 500 }
    );
  }
}
