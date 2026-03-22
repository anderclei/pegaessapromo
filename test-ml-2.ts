import 'dotenv/config';
import { getSettings } from './src/lib/settings.ts';
import axios from 'axios';

async function run() {
  const s = await getSettings();
  console.log("App ID:", s?.mercadolivreAppId);
  console.log("Secret:", s?.mercadolivreClientSecret ? "***" : "Nenhum");
  
  if (!s?.mercadolivreAppId) return;

  try {
    const data = new URLSearchParams();
    data.append('grant_type', 'client_credentials');
    data.append('client_id', s.mercadolivreAppId);
    data.append('client_secret', s.mercadolivreClientSecret!);

    const r = await axios.post('https://api.mercadolibre.com/oauth/token', data);
    console.log("Token:", r.data.access_token);
    
    // Test fetch
    const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search?q=ofertas', {
      headers: { Authorization: `Bearer ${r.data.access_token}` }
    });
    console.log("Resultados:", response.data.results.length);
  } catch (err) {
    console.error("ERRO:", err.response?.data || err.message);
  }
}
run();
