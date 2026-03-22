const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("❌ ERRO: Chaves do Supabase não encontradas no .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAll() {
  console.log("=== LISTANDO TUDO DA TABELA SETTINGS ===");
  const { data, error } = await supabase.from('settings').select('*');
  if (error) {
    console.error("ERRO NO BANCO:", error.message);
  } else {
    console.log("Encontrados:", data.length, "registros");
    data.forEach((row) => {
      console.log(`ID: ${row.id}`);
      console.log(`Config (chaves):`, Object.keys(row.config || {}));
      if (row.config?.mercadolivreAppId) {
        console.log(`✅ ML App ID encontrado: ${row.config.mercadolivreAppId}`);
      }
    });
  }
}

listAll();
