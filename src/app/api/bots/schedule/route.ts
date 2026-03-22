import { NextResponse } from 'next/server';
import { postScheduler } from '@/lib/bots/scheduler';
import { whatsappBot } from '@/lib/bots/whatsapp';

export async function GET() {
  return NextResponse.json({
    ...postScheduler.getState(),
    logs: whatsappBot.logs,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, groups, affiliateConfig } = body;

    switch (action) {
      case 'start':
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        if (config) postScheduler.configure(config);
        const started = postScheduler.start();
        return NextResponse.json({
          success: started,
          message: started ? 'Agendamento iniciado' : 'Agendamento já está ativo',
          state: postScheduler.getState(),
        });

      case 'stop':
        postScheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Agendamento parado',
          state: postScheduler.getState(),
        });

      case 'configure':
        if (config) postScheduler.configure(config);
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        return NextResponse.json({
          success: true,
          state: postScheduler.getState(),
        });

      case 'run-now':
        if (groups) postScheduler.setGroups(groups);
        if (affiliateConfig) postScheduler.setAffiliateConfig(affiliateConfig);
        // If singleProduct is provided, send only that product (manual offer send)
        if (body.singleProduct) {
          const singleLogs = await postScheduler.runSingleProduct(body.singleProduct);
          return NextResponse.json({ success: true, logs: singleLogs });
        }
        const logs = await postScheduler.runPostingCycle(true);
        return NextResponse.json({ success: true, logs });

      case 'standby-now':
        if (body.singleProduct) {
          try {
            const config = await import('@/lib/settings').then(m => m.getSettings());
            const mergedConfig = { ...affiliateConfig, ...config };
            const copywriter = await import('@/lib/copywriter');
            const affiliateLink = copywriter.buildAffiliateLink(body.singleProduct, mergedConfig);
            const siteLink = affiliateLink;

            const copies = await import('@/lib/copywriter').then(m => m.generateAllCopies(body.singleProduct, siteLink, mergedConfig));
            const templateToUse = mergedConfig.template || 'short';
            const waBody = (copies[templateToUse] || copies['short'])?.find((c: any) => c.platform === 'whatsapp')?.body || '';
            
            body.singleProduct.creativeCopy = waBody;
            
            await import('@/lib/promotions').then(m => m.savePromotion(body.singleProduct, siteLink));
            
            return NextResponse.json({ success: true, message: 'Anúncio adicionado ao site com Copy criada em Standby!' });
          } catch (e: any) {
            return NextResponse.json({ success: false, message: 'Falha ao criar copy: ' + e.message });
          }
        }
        return NextResponse.json({ success: false, message: 'Sem produto' });

      case 'generate-copy-only':
        if (body.singleProduct) {
          try {
            const config = await import('@/lib/settings').then(m => m.getSettings());
            const mergedConfig = { ...affiliateConfig, ...config };
            const copywriter = await import('@/lib/copywriter');
            const affiliateLink = copywriter.buildAffiliateLink(body.singleProduct, mergedConfig);
            const siteLink = affiliateLink;

            if (!mergedConfig.geminiKey) {
              return NextResponse.json({ success: false, message: 'Chave do Gemini (AI) não configurada! Vá na aba "Config. Globais" do painel e salve sua chave.' });
            }

            const copies = await import('@/lib/copywriter').then(m => m.generateAllCopies(body.singleProduct, siteLink, mergedConfig));
            const templateToUse = mergedConfig.template || 'short';
            const waBody = (copies[templateToUse] || copies['short'])?.find((c: any) => c.platform === 'whatsapp')?.body || '';
            
            return NextResponse.json({ success: true, creativeCopy: waBody });
          } catch (e: any) {
            return NextResponse.json({ success: false, message: 'Falha ao processar IA: ' + e.message });
          }
        }
        return NextResponse.json({ success: false, message: 'Sem produto' });

      case 'ban-product':
        if (body.productId) {
          const { loadHotProducts, saveHotProducts } = await import('@/lib/promotions');
          const hotData = (await loadHotProducts()) || {};
          
          Object.keys(hotData).forEach(cat => {
             if (Array.isArray(hotData[cat])) {
                hotData[cat] = hotData[cat].filter((p: any) => p.id !== body.productId);
             }
          });
          
          await saveHotProducts(hotData);
          return NextResponse.json({ success: true, message: 'Produto banido com sucesso.' });
        }
        return NextResponse.json({ success: false, message: 'Sem ID' });

      default:
        return NextResponse.json(
          { success: false, message: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
