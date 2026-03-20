const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCloudSync() {
  const { data, error } = await supabase
    .from('settings')
    .select('id, updated_at, config')
    .eq('id', 'hot_products_cache')
    .single();

  if (error) {
    console.error('Error fetching cloud sync:', error.message);
    return;
  }

  console.log('--- CLOUD SYNC STATUS ---');
  console.log('ID:', data.id);
  console.log('Updated at:', data.updated_at);
  console.log('Last Sync in Config:', data.config?.lastSync);
  console.log('Total Products in Cloud:', data.config?.metadata?.totalProducts || 0);
}

checkCloudSync();
