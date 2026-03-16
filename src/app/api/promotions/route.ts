import { NextResponse } from 'next/server';
import { savePromotion, getLatestPromotions } from '@/lib/promotions';

export async function GET() {
  try {
    const promotions = await getLatestPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: 'Erro ao buscar promoções' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { product, affiliateLink } = await request.json();
    console.log('API: Creating promotion for product:', { title: product?.title, type: product?.type });
    
    if (!product || !affiliateLink) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const id = await savePromotion(product, affiliateLink);
    
    return NextResponse.json({ id, url: `https://tempromo.app.br/p/${id}` });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Erro interno ao criar promoção' }, { status: 500 });
  }
}
