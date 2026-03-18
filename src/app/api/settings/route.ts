import { NextResponse } from 'next/server';
import { getSettings, saveSettings, AffiliateConfig } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings || {});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const config = await req.json() as AffiliateConfig;
    await saveSettings(config);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save settings' 
    }, { status: 500 });
  }
}
