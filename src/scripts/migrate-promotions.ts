import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const DATA_FILE = path.join(process.cwd(), 'data', 'promotions.json');

async function migrate() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('No promotions.json found.');
    return;
  }

  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  const store = JSON.parse(content);
  const promotions = Object.values(store);

  console.log(`Migrating ${promotions.length} promotions...`);

  for (const promo of promotions as any[]) {
    const { error } = await supabase
      .from('promotions')
      .upsert({
        id: promo.id,
        product: promo.product,
        affiliate_link: promo.affiliateLink,
        created_at: promo.createdAt,
      });

    if (error) {
      console.error(`Error migrating promotion ${promo.id}:`, error.message);
    } else {
      console.log(`Migrated ${promo.id}`);
    }
  }

  console.log('Migration finished.');
}

migrate();
