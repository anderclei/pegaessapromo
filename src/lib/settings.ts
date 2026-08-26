import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

import { AffiliateConfig } from './types';
export type { AffiliateConfig };

function readLocalSettings(): AffiliateConfig | null {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function writeLocalSettings(config: AffiliateConfig): void {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[Settings] Erro ao salvar settings.json local:', e);
  }
}

export async function getSettings(): Promise<AffiliateConfig | null> {
  // 1. Tentar Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('config')
        .eq('id', 'global')
        .single();

      if (!error && data?.config) {
        return data.config as AffiliateConfig;
      }
    } catch (e) {
      console.warn('[Settings] Supabase indisponível, usando arquivo local.');
    }
  }

  // 2. Fallback: arquivo local
  const local = readLocalSettings();
  if (local) return local;

  console.warn('[Settings] Nenhuma configuração encontrada (Supabase offline e settings.json ausente).');
  return null;
}

export async function saveSettings(config: AffiliateConfig): Promise<void> {
  // 1. Salvar sempre localmente (garante persistência offline)
  writeLocalSettings(config);

  // 2. Salvar no Supabase se disponível
  if (supabase) {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 'global',
          config,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('[Settings] Erro ao salvar no Supabase (settings salvo localmente):', error.message);
      }
    } catch (e) {
      console.warn('[Settings] Supabase indisponível. Settings salvo apenas localmente.');
    }
  }
}
