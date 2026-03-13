import { supabase } from './supabase';
import { Product, Promotion } from './types';

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (const i of Array(length).keys()) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function savePromotion(product: Product, affiliateLink: string): Promise<string> {
  const id = generateId();
  
  const { error } = await supabase
    .from('promotions')
    .insert({
      id,
      product,
      affiliate_link: affiliateLink,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving promotion to Supabase:', error);
    throw error;
  }
  
  return id;
}

export async function getPromotion(id: string): Promise<Promotion | null> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching promotion from Supabase:', error);
    return null;
  }

  return {
    id: data.id,
    product: data.product,
    affiliateLink: data.affiliate_link,
    createdAt: data.created_at,
  };
}

export async function getLatestPromotions(limit: number = 20): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching latest promotions from Supabase:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    product: item.product,
    affiliateLink: item.affiliate_link,
    createdAt: item.created_at,
  }));
}
