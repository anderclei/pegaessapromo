require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'global').single();
  if (error) console.error('Erro:', error.message);
  else {
    console.log('Config no Supabase:');
    console.log('ID:', data.config?.mercadolivreAppId);
    console.log('Secret:', data.config?.mercadolivreClientSecret ? 'Possui ✅' : 'Ausente ❌');
    console.log('Updated At:', data.updated_at);
  }
}
check();
