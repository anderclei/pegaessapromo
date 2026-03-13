import fs from 'fs';
import path from 'path';
import { Product, Promotion, PromotionStore } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'promotions.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
  }
}

function readStore(): PromotionStore {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading promotions store:', error);
    return {};
  }
}

function writeStore(store: PromotionStore) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Error writing promotions store:', error);
  }
}

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function savePromotion(product: Product, affiliateLink: string): Promise<string> {
  const store = readStore();
  const id = generateId();
  
  const promotion: Promotion = {
    id,
    product,
    affiliateLink,
    createdAt: new Date().toISOString(),
  };

  store[id] = promotion;
  writeStore(store);
  
  return id;
}

export async function getPromotion(id: string): Promise<Promotion | null> {
  const store = readStore();
  return store[id] || null;
}

export async function getLatestPromotions(limit: number = 20): Promise<Promotion[]> {
  const store = readStore();
  return Object.values(store)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
