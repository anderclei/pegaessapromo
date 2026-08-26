/**
 * POST /api/shopee/sync
 * 
 * Dispara sincronização com a Shopee Open API para todas as categorias.
 * Salva os resultados em data/hot_products_shopee.json.
 * Requer credentials configuradas em Settings → Shopee.
 */

import { NextResponse } from 'next/server';
import { scrapeShopee, writeCache } from '@/lib/scrapers/shopee';
import { getSettings } from '@/lib/settings';

import fs from 'fs';
import path from 'path';

function getCategoriesToSync(): string[] {
  try {
    const p = path.join(process.cwd(), 'src/data/categories.json');
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => c.id);
      }
    }
  } catch {}
  return ['ferramentas', 'eletronicos', 'informatica', 'eletrodomesticos', 'moda', 'esportes'];
}

export async function POST(request: Request) {
  try {
    const settings = await getSettings();

    if (!settings?.shopeePartnerId || !settings?.shopeePartnerKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciais Shopee não configuradas',
          hint: 'Vá em Configurações → Shopee (API Oficial) e preencha Partner ID e Partner Key',
        },
        { status: 400 }
      );
    }

    const credentials = {
      partnerId: settings.shopeePartnerId,
      partnerKey: settings.shopeePartnerKey,
      shopId: settings.shopeeShopId,
      shopToken: settings.shopeeShopToken,
      affiliateId: settings.shopeeId,
    };

    const results: Record<string, number> = {};
    const errors: string[] = [];

    const categoriesToSync = getCategoriesToSync();
    for (const category of categoriesToSync) {
      try {
        const products = await scrapeShopee(category, 'bestsellers', credentials);
        if (products.length > 0) {
          writeCache(category, products);
          results[category] = products.length;
        } else {
          errors.push(`${category}: nenhum produto retornado`);
        }
      } catch (err: any) {
        errors.push(`${category}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.length ? errors : undefined,
      syncedAt: new Date().toISOString(),
      message: `Sincronização concluída. ${Object.values(results).reduce((a, b) => a + b, 0)} produtos atualizados.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Status da última sync
  try {
    const fs = await import('fs');
    const path = await import('path');
    const cacheFile = path.join(process.cwd(), 'data', 'hot_products_shopee.json');

    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ synced: false, message: 'Nenhuma sincronização realizada ainda.' });
    }

    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    const totalProducts = Object.keys(data)
      .filter(k => !['lastSync', 'syncMode'].includes(k))
      .reduce((sum, k) => sum + (Array.isArray(data[k]) ? data[k].length : 0), 0);

    return NextResponse.json({
      synced: true,
      lastSync: data.lastSync,
      syncMode: data.syncMode || 'manual',
      totalProducts,
    });
  } catch {
    return NextResponse.json({ synced: false });
  }
}
