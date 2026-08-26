export const dynamic = 'force-dynamic';
export const maxDuration = 20;

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';

const ML_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';
  const forceApi = searchParams.get('force') === 'true';

  try {
    // 1. Tentar ler do arquivo local (Cache)
    if (fs.existsSync(ML_FILE) && !forceApi) {
      const content = fs.readFileSync(ML_FILE, 'utf-8');
      const mlData = JSON.parse(content);
      const products = mlData[category] || mlData['todos'] || [];

      if (products.length > 0) {
        console.log(`[ML API] ✅ ${products.length} produtos do cache local`);
        return NextResponse.json({ products, source: 'cache_file' });
      }
    }

    // 2. Se Cache falhar ou for forçado, usar API AO VIVO
    console.log('[ML API] 🚀 Buscando ofertas via API Oficial...');
    const products = await scrapeMercadoLivre(category);
    
    if (products.length > 0) {
      return NextResponse.json({ products, source: 'live_api' });
    }

    return NextResponse.json({ 
      products: [], 
      source: 'empty', 
      message: 'Nenhum produto encontrado na API e cache ausente.' 
    });

  } catch (error: any) {
    console.error('[ML API ERROR]:', error.message);
    
    // Fallback amigável se a API der erro de Auth
    if (error.message.includes('ML_AUTH_REQUIRED')) {
      return NextResponse.json({ 
        products: [], 
        error: 'auth_required',
        message: 'A API do Mercado Livre requer que você conecte sua conta no painel Admin primeiro.',
        details: error.message
      }, { status: 401 });
    }

    return NextResponse.json(
      { products: [], error: 'api_error', message: error.message },
      { status: 500 }
    );
  }
}
