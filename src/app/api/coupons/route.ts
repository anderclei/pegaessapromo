import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Coupon } from '@/lib/types';

const COUPONS_FILE = path.join(process.cwd(), 'data', 'coupons.json');

function ensureFileExists() {
  const dir = path.dirname(COUPONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(COUPONS_FILE)) {
    fs.writeFileSync(COUPONS_FILE, JSON.stringify([]));
  }
}

export async function GET() {
  try {
    ensureFileExists();
    const data = JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf-8'));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read coupons' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const coupon: Coupon = await request.json();
    ensureFileExists();
    const data = JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf-8'));
    
    // Auto-generate ID if missing
    if (!coupon.id) {
      coupon.id = Math.random().toString(36).substr(2, 9);
      coupon.createdAt = new Date().toISOString();
    }
    
    data.push(coupon);
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add coupon' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    ensureFileExists();
    const data = JSON.parse(fs.readFileSync(COUPONS_FILE, 'utf-8'));
    const filtered = data.filter((c: Coupon) => c.id !== id);
    
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(filtered, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
