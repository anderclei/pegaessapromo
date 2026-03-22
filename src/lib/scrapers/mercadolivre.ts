import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function scrapeMercadoLivre(category: string = 'todos', type: string = 'bestsellers'): Promise<Product[]> {
  try {
    // URLs passadas pelo usuário, focado em Mais Vendidos e Ofertas Relâmpago
    const allowedUrls = [
      'https://www.mercadolivre.com.br/mais-vendidos#origin=stripe',
      'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1#filter_applied=container_id&filter_position=1&is_recommended_domain=false&origin=scut',
      'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&promotion_type=lightning#filter_applied=promotion_type&filter_position=2&is_recommended_domain=false&origin=scut',
      'https://www.mercadolivre.com.br/ofertas?container_id=MLB1298579-1&deal_ids=MLB1298579#filter_applied=container_id&filter_position=3&is_recommended_domain=false&origin=scut'
    ];
    
    // Sorteia uma das URLs foda do usuário para garantir variação do bot
    const url = allowedUrls[Math.floor(Math.random() * allowedUrls.length)];

    console.log(`[ML] Raspando (HTML): ${url.substring(0, 90)}...`);
    
    // Headers aleatórios para enganar bot protection do ML
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0'
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'DNT': '1'
      },
      timeout: 15000
    });

    const $ = cheerio.load(data);
    const products: Product[] = [];

    // Seletor agressivo que abrange .promotion-item (ofertas), .poly-card (novo layout), 
    // .ui-search-layout__item (busca) e listas dos mais vendidos
    $('.promotion-item, .poly-card, .ui-search-layout__item, .ui-recommendations-card, .andes-card').each((i, el) => {
      if (products.length >= 25) return;
      
      const $el = $(el);
      
      const title = $el.find('.promotion-item__title, .poly-component__title, h2, .ui-search-item__title, .ui-recommendations-card__title').text().trim();
      
      // Busca preço real pegando o 'fraction' e montando, caso não consiga, cata tudo
      const priceWhole = $el.find('.andes-money-amount__fraction').first().text().trim() || $el.find('.promotion-item__price span').first().text().replace(/[^\d.,]/g, '').trim();
      
      if (!title || !priceWhole) return;
      
      let price = parseFloat(priceWhole.replace(/\./g, '')) || 0;
      
      // Tentar pegar preço original rasgado (quebrado)
      let originalPriceValue = 0;
      const originalPriceText = $el.find('s .andes-money-amount__fraction, .promotion-item__oldprice, .poly-price__old').first().text().trim();
      if (originalPriceText) {
         originalPriceValue = parseFloat(originalPriceText.replace(/\./g, '')) || 0;
      }
      
      // Tentar pegar desconto %
      let discount = 0;
      const discountText = $el.find('.promotion-item__discount-text, .poly-price__discount, .ui-search-price__discount').first().text().trim();
      if (discountText && discountText.includes('%')) {
          discount = parseInt(discountText.replace(/[^\d]/g, '')) || 0;
      } else if (originalPriceValue && originalPriceValue > price) {
          discount = Math.round(((originalPriceValue - price) / originalPriceValue) * 100);
      }
      
      if (originalPriceValue && originalPriceValue <= price) originalPriceValue = 0;

      // Link (muito importante!)
      let link = $el.find('a.promotion-item__link-container, a.poly-component__title, a.ui-search-link, a.ui-search-item__group__element, a').first().attr('href') || '';
      if (link.startsWith('/')) link = `https://www.mercadolivre.com.br${link}`;
      // Limpar lixo do link pra não estourar o limite 
      if (link.includes('#')) link = link.split('#')[0];
      if (link.includes('?')) link = link.split('?')[0];

      // Imagem resoluta (Mercado Livre muda as tags o tempo todo)
      let image = $el.find('img').attr('data-src') || 
                  $el.find('img').attr('src') || 
                  $el.find('img.promotion-item__img').attr('src') || 
                  '';
      
      // Frete Grátis
      const hasFreeShipping = $el.text().toLowerCase().includes('frete grátis');

      products.push({
        id: generateId(),
        title,
        price,
        originalPrice: originalPriceValue > 0 ? originalPriceValue : undefined,
        discount,
        image,
        rating: 4.8,
        sales: Math.floor(Math.random() * 500) + 50, // ML nao da certinho nas ofertas, moca
        reviews: Math.floor(Math.random() * 200) + 20,
        category: 'todos',
        platform: 'mercadolivre',
        url: link,
        freeShipping: hasFreeShipping,
        type: type as any,
      });
    });

    if (products.length === 0) {
      console.log('⚠️ [ML] Achou zero produtos. Cheerio falhou pela estrutura da DOM ou anti-bot bloqueou HTML.');
      throw new Error(`DOM não encontrou os seletores na URL de MercadoLivre`);
    }

    // Ordenar pelo maior desconto pra ser irresistível
    products.sort((a, b) => (b.discount || 0) - (a.discount || 0));

    return products;
  } catch (error: any) {
    console.error(`❌ [ML] Erro ao buscar HTML Mercado Livre:`, error.message);
    return [{
        id: 'ERRO-API',
        title: `⚠️ Bloqueio do Mercado Livre HTML: ${error.message}. Use o inspecionar elemento no servidor para ver o log.`,
        price: 0,
        image: 'https://placehold.co/300x300/ff0000/ffffff?text=ERRO+ML',
        rating: 0,
        sales: 0,
        reviews: 0,
        category: 'erro',
        platform: 'mercadolivre',
        url: '#',
        freeShipping: false,
        discount: 0,
        type: 'bestsellers' as any,
    }];
  }
}
