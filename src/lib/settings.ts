import { supabase } from './supabase';

export interface AffiliateConfig {
  mercadolivreId: string;
  mercadolivreAppId?: string;
  mercadolivreClientSecret?: string;
  shopeeId: string;
  aliexpressId: string;
  amazonId: string;
  amazonAccessKey: string;
  amazonSecretKey: string;
  geminiKey?: string;
  aiProvider?: 'gemini' | 'ollama';
  ollamaModel?: string;
  siteUrl?: string;
  copyStyle?: string;
  schedulerEnabled?: boolean;
  scheduleInterval?: number;
  scheduleMaxPosts?: number;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  fixedWhatsAppGroups?: any[];
  forbiddenWords?: string;
  igAccountId?: string;
  igAccessToken?: string;
}

export async function getSettings(): Promise<AffiliateConfig | null> {
  if (!supabase) return null;
  
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
  if (!supabase) {
    console.error('Cannot save settings: Supabase not initialized');
    return;
  }
  
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
