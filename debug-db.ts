import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from './src/lib/supabase.ts';

async function listAll() {
  console.log("=== LISTANDO TUDO DA TABELA SETTINGS ===");
  const { data, error } = await supabase.from('settings').select('*');
  if (error) {
    console.error("ERRO:", error);
  } else {
    console.log("Encontrados:", data.length, "registros");
    data.forEach((row: any) => {
      console.log(`ID: ${row.id}`);
      console.log(`Config (chaves):`, Object.keys(row.config || {}));
      if (row.config?.mercadolivreAppId) {
        console.log(`✅ ML App ID encontrado: ${row.config.mercadolivreAppId}`);
      }
    });
  }
  process.exit(0);
}

listAll();
