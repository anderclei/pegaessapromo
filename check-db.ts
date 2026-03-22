import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getSettings } from './src/lib/settings.ts';

async function check() {
  const config = await getSettings();
  console.log("=== Configuração do Banco ===");
  console.log("App ID:", config?.mercadolivreAppId || 'Não encontrado');
  console.log("Client Secret:", config?.mercadolivreClientSecret ? 'Preenchido (***)' : 'Não encontrado');
  process.exit(0);
}

check();
