import { NextResponse } from 'next/server';
import { scrapeAmazon, hydrateAmazonPrice } from '@/lib/scrapers/amazon';
import { searchItemsPaged, PaApiCredentials } from '@/lib/scrapers/amazon-paapi';
import { getSettings } from '@/lib/settings';
import fs from 'fs';
import path from 'path';
import { saveHotProducts } from '@/lib/promotions';

const categoriesPath = path.join(process.cwd(), 'src/data/categories.json');

function getCategories() {
  try {
    return JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  } catch (e) {
    return [];
  }
}

// GET para facilitar trigger manual via browser
export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  try {
    let config: any = null;
    if (request.method === 'POST') {
      try { config = (await request.json())?.config; } catch (e) { /* ignore */ }
    }

    const now = new Date();
    const amazonId = config?.amazonId || 'andercleipino-20';

    // ── Verificar se PA API está disponível ────────────────────────────────
    const settings = await getSettings();
    const papiCreds: PaApiCredentials | null =
      settings?.amazonAccessKey && settings?.amazonSecretKey
        ? {
            accessKey:  settings.amazonAccessKey,
            secretKey:  settings.amazonSecretKey,
            partnerTag: settings.amazonId ?? amazonId,
          }
        : null;

    const usePaApi = !!papiCreds;
    console.log(`[Sync] Modo: ${usePaApi ? '🔑 PA API (oficial)' : '🕷️ Web Scraping (fallback)'}`);

    const CATEGORIES = getCategories();
    const results: Record<string, any> = {};

    // ── 1. Sync por categoria ──────────────────────────────────────────────
    const listTypes = ['bestsellers', 'new-releases', 'movers-and-shakers', 'most-wished-for'] as const;

    for (const cat of CATEGORIES) {
      console.log(`\n📂 Categoria: ${cat.label} (${cat.amazonSlug})`);
      results[cat.id] = [];

      if (usePaApi) {
        // ── PA API: busca todos os tipos de uma vez (melhor cobertura) ──
        for (const listType of listTypes) {
          try {
            console.log(`  [PA API] ${listType}...`);
            const products = await searchItemsPaged(
              cat.amazonSlug,
              listType,
              papiCreds!,
              20,
            );

            const typed = products.map((p, i) => ({
              ...p,
              url: p.url.includes('tag=') ? p.url : `${p.url}${p.url.includes('?') ? '&' : '?'}tag=${amazonId}`,
              platform: 'amazon' as const,
              listType,
              category: cat.id,
              createdAt: new Date(now.getTime() - i * 1000).toISOString(),
            }));

            results[cat.id].push(...typed);
            await new Promise(r => setTimeout(r, 1000)); // respeitar rate limit PA API
          } catch (err) {
            console.error(`  [PA API] Erro em ${cat.id}/${listType}:`, err);
          }
        }
      } else {
        // ── Fallback: Web Scraping ─────────────────────────────────────
        for (const listType of listTypes) {
          try {
            console.log(`  [Scrape] ${listType}...`);
            const products = await scrapeAmazon(cat.id, listType, cat.amazonSlug);

            const typed = products.map((p, i) => {
              let url = p.url;
              if (url && !url.includes('tag=')) {
                url = `${url}${url.includes('?') ? '&' : '?'}tag=${amazonId}`;
              }
              return {
                ...p,
                url,
                platform: 'amazon' as const,
                listType,
                createdAt: new Date(now.getTime() - i * 1000).toISOString(),
              };
            });

            // Hydrate preços (apenas no scraping — PA API já retorna preço real)
            for (let i = 0; i < Math.min(10, typed.length); i++) {
              await hydrateAmazonPrice(typed[i]);
              await new Promise(r => setTimeout(r, 700));
            }

            results[cat.id].push(...typed);
          } catch (err) {
            console.error(`  [Scrape] Erro em ${cat.id}/${listType}:`, err);
          }
          await new Promise(r => setTimeout(r, 800));
        }
      }

      console.log(`  ✅ ${results[cat.id].length} produtos para ${cat.id}`);
    }

    // ── 2. Ofertas gerais ──────────────────────────────────────────────────
    results['ofertas_gerais'] = [];

    if (usePaApi) {
      // PA API: busca as categorias principais com maior desconto
      try {
        const dealsProducts = await searchItemsPaged('electronics', 'bestsellers', papiCreds!, 10);
        const typed = dealsProducts
          .filter(p => (p.discount ?? 0) >= 15)
          .map((p, i) => ({
            ...p,
            url: p.url.includes('tag=') ? p.url : `${p.url}${p.url.includes('?') ? '&' : '?'}tag=${amazonId}`,
            platform: 'amazon' as const,
            type: 'super' as any,
            createdAt: new Date(now.getTime() - i * 1000 - 5000).toISOString(),
          }));
        results['ofertas_gerais'].push(...typed);
      } catch (err) {
        console.error('[PA API] Erro em ofertas gerais:', err);
      }
    } else {
      for (const dealType of ['lightning', 'super'] as const) {
        try {
          console.log(`\n⚡ Ofertas gerais: ${dealType}`);
          const products = await scrapeAmazon('todos', dealType);
          const typed = products.map((p, i) => ({
            ...p,
            url: p.url && !p.url.includes('tag=') ? `${p.url}${p.url.includes('?') ? '&' : '?'}tag=${amazonId}` : p.url,
            platform: 'amazon' as const,
            type: dealType as any,
            createdAt: new Date(now.getTime() - i * 1000 - 5000).toISOString(),
          }));

          for (let i = 0; i < Math.min(10, typed.length); i++) {
            await hydrateAmazonPrice(typed[i]);
            await new Promise(r => setTimeout(r, 600));
          }

          results['ofertas_gerais'].push(...typed);
        } catch (err) {
          console.error(`Erro em ofertas ${dealType}:`, err);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // ── 3. Salvar resultado ────────────────────────────────────────────────
    const total = Object.values(results).flat().length;
    const finalData = {
      ...results,
      lastSync: now.toISOString(),
      syncMode: usePaApi ? 'paapi' : 'scraping',
      metadata: {
        totalProducts: total,
        categoriesSynced: Object.keys(results).filter(k => k !== 'ofertas_gerais'),
        mode: usePaApi ? 'PA API v5' : 'Web Scraping',
      },
    };

    await saveHotProducts(finalData);

    console.log(`\n✅ Sync concluído: ${total} produtos (${usePaApi ? 'PA API' : 'Scraping'})`);

    return NextResponse.json({
      success: true,
      message: `Sincronização via ${usePaApi ? 'PA API' : 'Scraping'} concluída.`,
      count: total,
      mode: usePaApi ? 'paapi' : 'scraping',
      lastSync: finalData.lastSync,
    });

  } catch (error) {
    console.error('Erro no sync Amazon:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar' }, { status: 500 });
  }
}
