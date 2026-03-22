import { NextResponse } from 'next/server';
import axios from 'axios';
import { getSettings, saveSettings } from '@/lib/settings';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não encontrado' }, { status: 400 });
  }

  try {
    const config = await getSettings();
    if (!config?.mercadolivreAppId || !config?.mercadolivreClientSecret) {
      return NextResponse.json({ error: 'Configurações do Mercado Livre incompletas no servidor' }, { status: 500 });
    }

    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/ml/callback`;

    console.log('[ML Auth] Trocando código por token...');
    
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

    console.log('✅ Mercado Livre conectado com sucesso!');

    // Redirecionar de volta para o painel admin com mensagem de sucesso
    return new Response(`
      <html>
        <head><title>Conectado!</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #22c55e;">✅ Conectado com Sucesso!</h1>
          <p>Seu aplicativo do Mercado Livre agora está autorizado.</p>
          <p>Você já pode fechar esta aba.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('[ML Auth Error]:', error.response?.data || error.message);
    return NextResponse.json({ 
      error: 'Falha ao trocar token', 
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
}
