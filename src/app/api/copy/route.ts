import { NextResponse } from 'next/server';
import { generateAllCopies, buildAffiliateLink } from '@/lib/copywriter';
import { Product } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, affiliateConfig } = body as {
      product: Product;
      affiliateConfig: { mercadolivreId: string; shopeeId: string };
    };

    const affiliateLink = buildAffiliateLink(product, affiliateConfig);
    const copies = generateAllCopies(product, affiliateLink);

    return NextResponse.json({ copies, affiliateLink });
  } catch (error) {
    console.error('Copy API Error:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar copys' },
      { status: 500 }
    );
  }
}
