import { NextResponse } from 'next/server';
import axios from 'axios';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não encontrado' }, { status: 400 });
  }

  try {
    const config = await getSettings();
    if (!config?.mercadolivreAppId || !config?.mercadolivreClientSecret) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurada';
      return NextResponse.json({ 
        error: 'Configurações do Mercado Livre incompletas no banco compartilhado',
        details: `ID: ${!!config?.mercadolivreAppId}, Secret: ${!!config?.mercadolivreClientSecret}`,
        databaseUrl: supabaseUrl.substring(0, 20) + '...'
      }, { status: 500 });
    }

    const { origin, pathname } = new URL(request.url);
    // Usar o pathname atual para bater exatamente com o Redirect URI do portal
    const redirectUri = `${origin}${pathname}`;

    console.log(`[ML Auth] Trocando código por token no redirect: ${redirectUri}`);
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.mercadolivreAppId,
      client_secret: config.mercadolivreClientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    const res = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const { access_token, refresh_token, expires_in } = res.data;

    // Salvar no banco de dados
    const newConfig = {
      ...config,
      mercadolivreAccessToken: access_token,
      mercadolivreRefreshToken: refresh_token,
      mercadolivreTokenExpiresAt: Date.now() + (expires_in * 1000),
    };

    await saveSettings(newConfig);

    return new Response(`
      <html>
        <head><title>Conectado!</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f0fdf4;">
          <h1 style="color: #16a34a;">✅ Mercado Livre Autorizado!</h1>
          <p style="color: #15803d; font-size: 1.1rem;">As buscas de ofertas agora estão desbloqueadas.</p>
          <p>Você pode fechar esta aba e voltar para o painel.</p>
          <script>
            setTimeout(() => { window.close(); }, 4000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('[ML Auth Error]:', error.response?.data || error.message);
    const data = error.response?.data;
    return new Response(`
      <html>
        <body style="font-family: sans-serif; padding: 50px; text-align: center;">
          <h1 style="color: #ef4444;">❌ Erro na Autorização</h1>
          <p>${data?.message || error.message}</p>
          <p style="color: #64748b; font-size: 0.8rem;">Verifique se a Redirect URI no painel do ML bate exatamente com a URl acessada.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
