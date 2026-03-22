export const dynamic = 'force-dynamic';
export const maxDuration = 20; // 20s max — evita timeout silencioso do Next.js

import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import fs from 'fs';
import path from 'path';

const HOT_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'hot_products_mercadolivre.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';
  const type = searchParams.get('type') || 'bestsellers';

  try {
    // Servir cache local se existir (evita chamadas desnecessárias à API do ML)
    if (fs.existsSync(HOT_PRODUCTS_FILE)) {
      const content = fs.readFileSync(HOT_PRODUCTS_FILE, 'utf-8');
      const hotData = JSON.parse(content);
      const products = hotData[category] || [];
      if (type === 'bestsellers' && products.length > 0) {
        return NextResponse.json({ products, source: 'hot_sync' });
      }
    }

    // Timeout manual de 15 segundos para não deixar a rota pendurada
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('ML API timeout após 15s')), 15000)
    );

    const products = await Promise.race([
      scrapeMercadoLivre(category, type),
      timeoutPromise,
    ]);

    console.log(`[ML API SUCCESS] Found ${products.length} products for ${category}`);
    return NextResponse.json({ products, source: 'mercadolivre', type });

  } catch (error: any) {
    const isAuthRequired = error.message?.includes('AUTH_REQUIRED');
    
    console.error('[ML API ERROR DETAILED]:', {
      message: error.message,
      stack: error.stack,
      category,
      type
    });

    if (isAuthRequired) {
      return NextResponse.json(
        { products: [], error: 'auth_required', message: '⚠️ Mercado Livre Bloqueado (403). Você precisa autorizar o aplicativo no painel admin primeiro.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        products: [], 
        error: 'api_error', 
        message: error.message || 'Falha ao buscar produtos do Mercado Livre',
        details: error.response?.data || 'Sem detalhes adicionais'
      },
      { status: 500 }
    );
  }
}
