export const dynamic = 'force-dynamic';
export const maxDuration = 20; // 20s max — evita timeout silencioso do Next.js

import { NextResponse } from 'next/server';
import { scrapeMercadoLivre } from '@/lib/scrapers/mercadolivre';
import { supabase } from '@/lib/supabase';
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
    const { data: cacheData, error: cacheErr } = await supabase
      .from('settings')
      .select('config')
      .eq('id', 'hot_products_cache')
      .single();

    let products: any[] = [];
    let debugInfo: any = { cacheSource: 'none' };
    
    if (cacheData?.config) {
      const allCache = cacheData.config;
      debugInfo.cacheKeys = Object.keys(allCache);
      
      // 1. Tenta a chave específica do sync-ml.js
      if (allCache.mercadolivre_sync && Array.isArray(allCache.mercadolivre_sync)) {
         products = allCache.mercadolivre_sync;
         debugInfo.cacheSource = 'mercadolivre_sync';
      } 
      // 2. Fallback: procurar por plataforma em todo o cache
      else {
         const mlFromCache = Object.values(allCache).flat().filter((p: any) => p?.platform === 'mercadolivre');
         if (mlFromCache.length > 0) {
            products = mlFromCache;
            debugInfo.cacheSource = 'platform_filter';
         }
      }
    }

    // Se encontramos no cache, retorna imediatamente
    if (products.length > 0) {
      console.log(`[ML API SUCCESS] Found ${products.length} products in cache (${debugInfo.cacheSource})`);
      return NextResponse.json({ products, source: 'hot_products_cache', cacheSource: debugInfo.cacheSource });
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
