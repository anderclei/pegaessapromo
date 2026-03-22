export const dynamic = 'force-dynamic';
export const maxDuration = 20; // 20s max — evita timeout silencioso do Next.js

import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
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

    // Tenta buscar no cofre global de produtos (Cache)
    const { data: cacheData } = await supabase
      .from('settings')
      .select('config')
      .eq('id', 'hot_products_cache')
      .single();

    let products: any[] = [];
    
    if (cacheData?.config) {
      // Pega tudo que é do Mercado Livre no cache
      const allCache = cacheData.config;
      const mlFromCache = Object.values(allCache).flat().filter((p: any) => p?.platform === 'mercadolivre');
      if (mlFromCache.length > 0) {
        products = mlFromCache;
      }
    }

    // Se o cache estiver vazio ou não tiver ML, tenta o scrape (pode falhar na Vercel)
    if (products.length === 0) {
      console.log('[ML API] Cache vazio ou sem ML, tentando scrape direto...');
      products = await Promise.race([
        scrapeMercadoLivre(category, type),
        timeoutPromise,
      ]);
    }

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
        { products: [], error: 'auth_required', message: error.message },
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
