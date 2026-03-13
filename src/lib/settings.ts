import { supabase } from './supabase';

export interface AffiliateConfig {
  mercadolivreId: string;
  shopeeId: string;
  aliexpressId: string;
  amazonId: string;
  amazonAccessKey: string;
  amazonSecretKey: string;
}

export async function getSettings(): Promise<AffiliateConfig | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('config')
    .eq('id', 'global')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching settings from Supabase:', error);
    return null;
  }

  return data.config as AffiliateConfig;
}

export async function saveSettings(config: AffiliateConfig): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({
      id: 'global',
      config,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving settings to Supabase:', error);
    throw error;
  }
}
