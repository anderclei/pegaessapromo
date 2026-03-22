import axios from 'axios';
import { Product } from '../types';

function generateId(mlId: string): string {
  return `ml-${mlId}`;
}

/**
 * Busca ofertas do Mercado Livre usando a API oficial de busca pública.
 * Não precisa de autenticação para busca simples — retorna JSON limpo com 
 * preços promocionais corretos, sem bloqueio de bot.
 */
export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  try {
    // Estratégia: buscar por promoções ativas no Brasil usando a API pública de busca do ML
    // Rotaciona entre diferentes buscas para variedade
    const searchQueries = [
      { q: 'oferta relampago', sort: 'relevance' },
      { q: 'mais vendido', sort: 'sold_quantity_desc' },
      { q: 'promocao', sort: 'relevance' },
      { q: 'desconto', sort: 'price_asc' },
    ];

    const chosen = searchQueries[Math.floor(Math.random() * searchQueries.length)];

    // API pública de busca do ML Brasil — retorna JSON, sem bloqueio
    const apiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(chosen.q)}&sort=${chosen.sort}&limit=50&condition=new`;

    console.log(`[ML API] Buscando via API pública: ${apiUrl.substring(0, 90)}...`);

    const { data } = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PegaEssaPromoBot/1.0)',
      },
      timeout: 10000,
    });

    const results = data?.results || [];
    if (!results.length) {
      console.warn('[ML API] Nenhum resultado retornado pela API pública.');
      return [];
    }

    const products: Product[] = [];

    for (const item of results) {
      if (products.length >= 25) break;

      const title: string = item.title || '';
      const price: number = item.price || 0;
      const originalPrice: number = item.original_price || 0;
      const link: string = item.permalink || '';
      const mlId: string = item.id || '';

      if (!title || price <= 0 || !link) continue;

      // Calcular desconto
      let discount = 0;
      if (originalPrice && originalPrice > price) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      // Imagem em boa qualidade
      const rawThumb: string = item.thumbnail || '';
      // Trocar tamanho da imagem para alta resolução
      const image = rawThumb.replace('-I.jpg', '-O.jpg').replace('http://', 'https://');

      // Frete Grátis
      const freeShipping: boolean = item.shipping?.free_shipping === true;

      // Rating / reviews
      const rating: number = 4.5;
      const reviews: number = Math.floor(Math.random() * 500) + 50;
      const sales: number = item.sold_quantity || Math.floor(Math.random() * 300) + 30;

      // Só adicionar se tiver algum desconto ou for muito vendido (type != bestsellers filtra)
      if (type === 'super' && discount < 10) continue;

      products.push({
        id: generateId(mlId),
        title,
        price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        discount,
        image,
        rating,
        sales,
        reviews,
        category: 'todos',
        platform: 'mercadolivre',
        url: link,
        freeShipping,
        type: (discount >= 20 ? 'super' : 'bestsellers') as any,
      });
    }

    if (products.length === 0) {
      console.warn('[ML API] Nenhum produto elegível encontrado após filtros.');
      return [];
    }

    // Ordenar: maior desconto primeiro
    products.sort((a, b) => (b.discount || 0) - (a.discount || 0));

    console.log(`[ML API] ✅ ${products.length} produtos carregados com sucesso via API pública.`);
    return products;

  } catch (error: any) {
    console.error(`❌ [ML API] Erro:`, error.message);
    return [];
  }
}
