import { NextResponse } from 'next/server';
import { scrapeShopee } from '@/lib/scrapers/shopee';
import { getSettings } from '@/lib/settings';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'eletronicos';
  const type = searchParams.get('type') || 'bestsellers';

  try {
    // Busca das settings as credentials da Shopee
    const settings = await getSettings();
    const credentials = settings?.shopeePartnerId ? {
      partnerId: settings.shopeePartnerId,
      partnerKey: settings.shopeePartnerKey,
      shopId: settings.shopeeShopId,
      shopToken: settings.shopeeShopToken,
      affiliateId: settings.shopeeId,
    } : undefined;

    const products = await scrapeShopee(category, type, credentials);
    
    return NextResponse.json({
      products,
      source: products.length > 0
        ? (credentials ? 'shopee_api' : 'shopee_cache')
        : 'none',
      type,
      message: products.length === 0
        ? 'Nenhum produto Shopee disponível. Configure as credenciais da API em Configurações → Shopee.'
        : undefined,
    });
  } catch (error) {
    console.error('Shopee API Error:', error);
    // Em caso de erro, retorna vazio em vez de erro 500
    return NextResponse.json({
      products: [],
      source: 'error',
      message: 'Falha ao buscar produtos da Shopee',
    });
  }
}
