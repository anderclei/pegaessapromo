import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const secret = searchParams.get('secret');
  const mlId = searchParams.get('mlId');
  const gemini = searchParams.get('gemini');

  if (!appId || !secret) {
    return NextResponse.json({ 
      error: 'Parâmetros ausentes. Use ?appId=...&secret=...' 
    }, { status: 400 });
  }

  try {
    // 1. Tentar ler o que já existe (se houver algo no Supabase)
    const currentConfig = await getSettings();
    
    // 2. Mesclar com as chaves enviadas
    const newConfig = {
      ...(currentConfig || {}),
      mercadolivreAppId: appId,
      mercadolivreClientSecret: secret,
      mercadolivreId: mlId || currentConfig?.mercadolivreId || '',
      geminiKey: gemini || currentConfig?.geminiKey || '',
      siteUrl: 'https://pegaessapromo.app.br',
      enabledSources: {
        ...(currentConfig?.enabledSources || {}),
        mercadolivre: true
      }
    };

    // 3. Salvar NO SUPABASE (já que esta rota roda no servidor)
    await saveSettings(newConfig as any);

    return new Response(`
      <html>
        <head><title>Reparo Concluído</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f0f9ff;">
          <h1 style="color: #0284c7;">✅ Reparo de Sincronização Concluído!</h1>
          <p style="font-size: 1.1rem; color: #0369a1;">As chaves do Mercado Livre foram injetadas no banco de dados com sucesso.</p>
          <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; margin-top: 20px; border: 1px solid #bae6fd;">
            <p style="margin: 0; font-weight: bold;">Próximo Passo:</p>
            <p>Volte ao seu painel Admin e clique novamente no botão <b>🔓 Autorizar</b>.</p>
          </div>
          <p style="margin-top: 30px; font-size: 0.8rem; color: #94a3b8;">ID: ${appId}</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
