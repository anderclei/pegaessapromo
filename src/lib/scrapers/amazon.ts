import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '../types';

function generateId(url?: string): string {
  if (url) {
    // Try to extract Amazon ASIN (B07... etc) which is usually 10 characters
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asinMatch) return asinMatch[1];
    
    // Fallback: use a simple hash of the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = (hash << 5) - hash + url.charCodeAt(i);
        hash |= 0;
    }
    return 'amz-' + Math.abs(hash).toString(36);
  }
  return 'amz-' + Math.random().toString(36).substring(2, 12);
}

const CATEGORY_MAP: Record<string, string> = {
  'alimentos_bebidas': 'grocery',
  'apps_jogos': 'mobile-apps',
  'automotivo': 'automotive',
  'bebes': 'baby',
  'beleza': 'beauty',
  'beleza_premium': 'luxury-beauty',
  'brinquedos_jogos': 'toys',
  'casa': 'home',
  'cd_vinil': 'music',
  'informatica': 'computers',
  'cozinha': 'kitchen',
  'dispositivos_amazon': 'amazon-devices',
  'dvd_bluray': 'dvd',
  'eletrodomesticos': 'appliances',
  'eletronicos': 'electronics',
  'esporte': 'sports',
  'ferramentas': 'hi',
  'games_consoles': 'videogames',
  'gift_cards': 'gift-cards',
  'instrumentos_musicais': 'musical-instruments',
  'jardim_piscina': 'garden',
  'livros': 'books',
  'loja_kindle': 'digital-text',
  'moda': 'apparel',
  'moveis': 'furniture',
  'papelaria': 'officeproduct',
  'pet_shop': 'pet-products',
  'saude_beleza': 'hpc',
  'todos': 'electronics'
};

// Prefixos ref= para cada tipo de lista (padrão que a Amazon aceita)
const LIST_TYPE_REF: Record<string, string> = {
  'bestsellers':        'zg_bs_nav',
  'new-releases':       'zg_new_nav',
  'movers-and-shakers': 'zg_mover_nav',
  'most-wished-for':    'zg_wished_nav',
  'lightning':          'zg_bs_nav',
  'super':              'zg_bs_nav',
};

/**
 * Monta a URL correta da Amazon BR.
 * Formato: https://www.amazon.com.br/gp/bestsellers/{slug}/ref=zg_bs_nav_{slug}_0
 */
function buildAmazonUrl(category: string, type: string, amazonSlug?: string): string {
  const slug = amazonSlug || CATEGORY_MAP[category] || 'electronics';
  const refPrefix = LIST_TYPE_REF[type] || 'zg_bs_nav';
  const listPath = type === 'new-releases' ? 'gp/new-releases'
    : type === 'movers-and-shakers' ? 'gp/movers-and-shakers'
    : type === 'most-wished-for' ? 'gp/most-wished-for'
    : 'gp/bestsellers';

  return `https://www.amazon.com.br/${listPath}/${slug}/ref=${refPrefix}_${slug}_0`;
}

export async function scrapeAmazon(category: string = 'todos', type: string = 'bestsellers', amazonSlug?: string): Promise<Product[]> {
  // Ler amazonId das settings para montar URLs de afiliado
  let amazonTag = '';
  try {
    const { getSettings } = await import('../settings');
    const s = await getSettings();
    amazonTag = s?.amazonId || '';
  } catch {}

  try {
    const url = buildAmazonUrl(category, type, amazonSlug);
    console.log(`[Amazon Scraper] Buscando: ${url} (cat: ${category}, type: ${type})`);
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const products: Product[] = [];

    const isStandardList = ['bestsellers', 'new-releases', 'movers-and-shakers', 'most-wished-for', 'super'].includes(type);

    if (isStandardList) {
      // Robust Grid Selector for all Amazon lists (Bestsellers, New Releases, etc)
      $('.zg-grid-general-faceout, [id^="post-"], .p13n-grid-col, .p13n-sc-uncentered-faceout').each((i, el) => {
        if (products.length >= 20) return; // Allow more than 10 for better variety
        const $el = $(el);
        
        // Very robust title selection
        const title = $el.find('.p13n-sc-truncate, .p13n-sc-truncate-desktop-type2, [class*="sc-truncate"]').text().trim() || 
                      $el.find('img').attr('alt') || 
                      $el.find('.a-link-normal span').first().text().trim();
                      
        let priceWhole = $el.find('.a-price-whole').first().text().trim();
        let priceFraction = $el.find('.a-price-fraction').first().text().trim();
        let priceText = '';
        if (priceWhole) {
            priceText = `${priceWhole.replace(/[.,]/g, '')},${priceFraction || '00'}`;
        } else {
            priceText = $el.find('.a-price .a-offscreen').first().text().trim() || 
                        $el.find('.p13n-sc-price, .a-size-base.a-color-price').text().trim();
        }
                          
        const originalPriceText = $el.find('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                                  $el.find('.a-text-strike').first().text().trim() ||
                                  $el.find('.basisPrice').first().text().trim() ||
                                  $el.find('.a-color-secondary.a-text-strike').first().text().trim() ||
                                  $el.find('[data-a-strike="true"]').first().text().trim();

        // NEW: Capture discount percentage directly from list if available
        const discountText = $el.find('.savingsPercentage, .reinventPriceSavingsPercentageMargin').first().text().trim() ||
                             $el.find('.a-color-price').filter((_, e) => $(e).text().includes('%')).first().text().trim();
                                  
        const image = $el.find('img').attr('src');
        const relativeLink = $el.find('a.a-link-normal').attr('href');
        const ratingText = $el.find('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt').text().trim();
        const reviewsText = $el.find('span.a-size-small, .a-size-small .a-link-normal').text().trim();

        if (title && (priceText || relativeLink)) {
          const cleanPrice = (text: string) => {
            if (!text) return 0;
            
            // Check if it's a range (e.g., "R$ 100 - R$ 200")
            if (text.includes('-') || text.toLowerCase().includes(' a ')) {
               // It's a range. We'll return the lower bound but mark it
               const match = text.match(/R\$\s*([\d.,]+)/);
               if (match) {
                 return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
               }
            }

            const match = text.match(/R\$\s*([\d.,]+)/);
            if (match) {
              return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
            }
            const num = text.replace(/[^\d,]/g, '').replace(',', '.').trim();
            return parseFloat(num) || 0;
          };
          const price = cleanPrice(priceText);
          let originalPrice = originalPriceText ? cleanPrice(originalPriceText) : undefined;
          
          let discount = 0;
          if (discountText && discountText.includes('%')) {
            const dMatch = discountText.match(/(\d+)%/);
            if (dMatch) discount = parseInt(dMatch[1]);
          }

          if (originalPrice && originalPrice <= price) {
            originalPrice = undefined;
          }
          
          // Validação: desconto > 70% é provavelmente erro de captura
          if (originalPrice && originalPrice > price) {
            const impliedDiscount = Math.round(((originalPrice - price) / originalPrice) * 100);
            if (impliedDiscount > 70) {
              originalPrice = undefined; // Descarta — provavelmente parcela capturada errado
            }
          }
          
          // If we have originalPrice but no discount, calculate it
          if (!discount && originalPrice && originalPrice > price) {
            discount = Math.round(((originalPrice - price) / originalPrice) * 100);
          }

          const rating = parseFloat(ratingText.split(' ')[0].replace(',', '.')) || 0;
          const reviews = parseInt(reviewsText.replace(/[^\d]/g, '')) || 0;
          
          // NUNCA inventar dados — usar apenas o que vem da página
          let sales = 0;
          const textLower = $el.text().toLowerCase();
          const salesMatch = textLower.match(/([\d\.]+)\+?\s*(mil\s*)?compras no/);
          if (salesMatch) {
            let num = parseFloat(salesMatch[1].replace(/\./g, '')) || 0;
            if (salesMatch[2] && salesMatch[2].includes('mil')) num *= 1000;
            sales = num;
          }

          const productUrl = relativeLink?.startsWith('http') ? relativeLink : `https://www.amazon.com.br${relativeLink}`;
          products.push({
            id: generateId(productUrl),
            title,
            price: price,
            originalPrice: originalPrice,
            discount: discount,
            image: image || '',
            rating: rating,
            sales: sales,
            reviews: reviews,

            category: category,
            platform: 'amazon',
            url: amazonTag ? `${productUrl}${productUrl.includes('?') ? '&' : '?'}tag=${amazonTag}` : productUrl,
            freeShipping: true,
            type: type as any,
          });
        }
      });
    } else {
      // Deals Selector (for Lightning and Super Deals)
      $('div[class*="ProductCard-module__card_"], .a-section.a-spacing-base.a-spacing-top-base, .octopus-dlp-asin-section').each((i, el) => {
        if (products.length >= 50) return; // More for deals page to allow filtering
        const $el = $(el);
        
        let title = $el.find('p[class*="ProductCard-module__title_"] span, .a-size-base-plus, .octopus-dlp-asin-title').first().text().trim();
        if (!title) {
           title = $el.find('span.a-truncate-full').text().trim() || $el.find('h2').text().trim();
        }

        const priceWhole = $el.find('span.a-price-whole').first().text().trim();
        const priceFraction = $el.find('span.a-price-fraction').first().text().trim();
        let priceText = priceWhole && priceFraction ? `${priceWhole},${priceFraction}` : $el.find('.a-price .a-offscreen').first().text().trim();
        
        const originalPriceText = $el.find('span:contains("De: ")').next().text().trim() || 
                               $el.find('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                               $el.find('.a-text-strike').first().text().trim();

        const image = $el.find('img').attr('src');
        const relativeLink = $el.find('a[class*="ProductCard-module__link_"], a.a-link-normal').attr('href');
        
        const cardText = $el.text().toLowerCase();
        const isLightning = cardText.includes('relâmpago') || cardText.includes('lightning') || cardText.includes('acaba em');
        
        const discountBadge = $el.find('div[class*="style_filledRoundedBadgeLabel_"] span').text().trim() || 
                             $el.find('.a-badge-text').text().trim() || 
                             $el.find('.octopus-dlp-saving-percentage').text().trim();
        
        let discount = discountBadge ? parseInt(discountBadge.replace(/[^\d]/g, '')) : undefined;

        if (title && (priceText || relativeLink)) {
          const cleanPrice = (text: string) => {
            if (!text) return 0;
            const match = text.match(/R\$\s*([\d.,]+)/);
            if (match) {
              return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
            }
            return parseFloat(text.replace(/[^\d,]/g, '').replace(',', '.').trim()) || 0;
          };
          const price = cleanPrice(priceText);
          const originalPrice = originalPriceText ? cleanPrice(originalPriceText) : undefined;

          if (!discount && originalPrice && originalPrice > price) {
            discount = Math.round(((originalPrice - price) / originalPrice) * 100);
          }

          // FILTERING LOGIC
          if (type === 'lightning' && !isLightning) return;
          if (type === 'super' && (!discount || discount < 20)) return; 

          // Try to extract rating/reviews from deal card, or fallback
          const ratingText = $el.find('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt').text().trim();
          const reviewsText = $el.find('.a-size-small, .a-color-base').text().trim();
          
          const rating = parseFloat(ratingText.split(' ')[0].replace(',', '.')) || 0;
          const reviews = parseInt(reviewsText.replace(/[^\d]/g, '')) || 0;

          // NUNCA inventar dados — usar apenas o que vem da página
          let sales = 0;
          const textLower = $el.text().toLowerCase();
          const salesMatch = textLower.match(/([\d\.]+)\+?\s*(mil\s*)?compras no/);
          if (salesMatch) {
            let num = parseFloat(salesMatch[1].replace(/\./g, '')) || 0;
            if (salesMatch[2] && salesMatch[2].includes('mil')) num *= 1000;
            sales = num;
          }

          const productUrl = relativeLink?.startsWith('http') ? relativeLink : `https://www.amazon.com.br${relativeLink}`;
          products.push({
            id: generateId(productUrl),
            title,
            price,
            originalPrice,
            image: image || '',
            rating: rating,
            sales: sales,
            reviews: reviews,
            category: isLightning ? 'relampago' : 'ofertas',
            platform: 'amazon',
            url: amazonTag ? `${productUrl}${productUrl.includes('?') ? '&' : '?'}tag=${amazonTag}` : productUrl,
            freeShipping: true,
            discount,
            type: type as any,
          });
        }
      });

    }

    // Aplicar filtro de focado exclusivo do usuário (ignorar produtos ruins que não vendem)
    const defaultBadWords = ['cabo', 'adaptador', 'fone com fio', 'fone intra-auricular com fio', 'capinha', 'película', 'carregador de parede', 'componente', 'circuito', 'conversor step', 'placa de rede', 'módulo'];
    let badWords = defaultBadWords;
    try {
      const { getSettings } = await import('../settings');
      const settings = await getSettings();
      if (settings && settings.forbiddenWords && settings.forbiddenWords.trim() !== '') {
        badWords = settings.forbiddenWords.split(',').map((w: string) => w.trim().toLowerCase()).filter(Boolean);
      }
    } catch (e) {}
    
    let filteredProducts = products.filter(p => {
       const titleLower = p.title.toLowerCase();
       return !badWords.some((bw: string) => titleLower.includes(bw));
    });

    if (filteredProducts.length === 0) {
      console.log(`Nenhum produto (após filtros de palavra) encontrado em ${url} para o tipo ${type}`);
      return [];
    }

    // Special handling for "Unbeatable Deals" (Highest discount) globally
    if (type === 'super') {
      filteredProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      return filteredProducts.slice(0, 20);
    }

    return filteredProducts;
  } catch (error) {
    console.error(`Erro ao buscar Amazon (${type}):`, error);
    return [];
  }
}

async function scrapeBySearch(category: string): Promise<Product[]> {
  // Disabling search for the niche focus to ensure only Best Sellers are shown
  return [];
}

function getSampleAmazonProducts(category: string, type: string = 'bestsellers'): Product[] {
  return [];
}

export async function hydrateAmazonPrice(product: Product): Promise<Product> {
  if (!product || product.platform !== 'amazon' || !product.url) return product;
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 OPR/104.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  ];

  let retries = 0;
  let success = false;
  let $;
  
  while (retries < 2 && !success) {
    try {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      const { data } = await axios.get(product.url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'pt-BR,pt',
        },
        timeout: 10000,
      });
      $ = cheerio.load(data);
      success = true;
    } catch (e) {
      retries++;
      if (retries < 2) await new Promise(r => setTimeout(r, 1500));
    }
  }

  if (!success || !$) return product;

  try {
    
    let basePriceText = '';
    const priceSelectors = [
      '#corePriceDisplay_desktop_feature_div .a-price-whole',
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
      '.priceToPay .a-price-whole',
      '.priceToPay .a-price .a-offscreen',
      '.a-price.a-text-price.a-size-medium .a-offscreen',
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-color-price'
    ];

    for (const selector of priceSelectors) {
      const element = $(selector).first();
      let pt = element.text().trim();
      
      if (pt) {
        if (selector.includes('.a-price-whole')) {
          // If we got the whole part, try to find the fraction part near it
          const fraction = element.parent().find('.a-price-fraction').text().trim() || '00';
          pt = pt.replace(/\./g, '') + ',' + fraction;
        }
        
        const match = pt.match(/[\d.,]+/);
        if (match) {
           basePriceText = match[0];
           break;
        }
      }
    }

    const cleanPriceStr = (text: string) => {
        if (!text) return 0;
        const numText = text.replace(/[^\d.,]/g, '');
        const match = numText.match(/([\d.]+),(\d{2})/);
        if (match) {
            return parseFloat(match[1].replace(/\./g, '') + '.' + match[2]);
        }
        const cleanStr = numText.replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(cleanStr) || 0;
    };

    let pixPrice = 0;
    // Look for Pix price specifically in the price display areas first to avoid false positives
    const priceContext = $('#corePriceDisplay_desktop_feature_div, #corePrice_desktop, #priceBlock, #price_feature_div, .priceToPay').text().replace(/\s+/g, ' '); 
    
    const pixRegex1 = /R\$\s*([\d.,]+)\s*(?:à\s+vista\s+)?no\s+Pix/i;
    const pixRegex2 = /(?:à\s+vista\s+)?no\s+Pix[^R]*R\$\s*([\d.,]+)/i;
    
    const m1 = priceContext.match(pixRegex1) || $('body').text().replace(/\s+/g, ' ').match(pixRegex1);
    const m2 = priceContext.match(pixRegex2) || $('body').text().replace(/\s+/g, ' ').match(pixRegex2);
    
    if (m1 || m2) {
       const pixStr = m1 ? m1[1] : m2![1];
       const potentialPix = cleanPriceStr(pixStr);
       if (potentialPix > 10) { 
         pixPrice = potentialPix;
       }
    }

    let detectedBasePrice = cleanPriceStr(basePriceText);
    
    // Choose the lowest valid price found
    let finalPrice = 0;
    if (pixPrice > 0 && detectedBasePrice > 0) {
      finalPrice = Math.min(pixPrice, detectedBasePrice);
    } else {
      finalPrice = pixPrice || detectedBasePrice;
    }

    let pText = $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                $('.basisPrice .a-offscreen').first().text().trim() ||
                $('#listPrice').text().trim() ||
                $('.a-text-strike').first().text().trim() ||
                $('.a-size-small.a-color-secondary.a-text-strike').first().text().trim() ||
                $('[data-a-strike="true"]').first().text().trim() ||
                $('#priceblock_listprice').text().trim() ||
                // Text-based fallback
                $('span:contains("Preço anterior")').next().text().trim() ||
                $('span:contains("Preço de tabela")').next().text().trim();
    
    let originalPriceValue = 0;
    if (pText) {
       originalPriceValue = cleanPriceStr(pText);
    }
    
    // Removing the flawed fallback that captured installment prices as original price.
    // Real original price should always come from strike-through or 'De:' selectors.

    // New: Attempt to find the discount percentage directly if available (e.g., "-24%")
    let directDiscount = 0;
    const discountElementText = $('.savingsPercentage, .reinventPriceSavingsPercentageMargin').first().text().trim() || 
                                $('.savingPriceOverride, .priceBlockSavingsString, .bundle-v2-savings-badge').first().text().trim() ||
                                $('.a-size-large.a-color-price.savingPriceOverride').text().trim();
    
    if (discountElementText && discountElementText.includes('%')) {
       const dMatch = discountElementText.match(/(\d+)%/);
       if (dMatch) directDiscount = parseInt(dMatch[1]);
    } else {
      // Fallback: search for "(XX% off)" or similar in the whole body
      const bodyStr = $('body').text();
      const offMatch = bodyStr.match(/\(?(\d+)%\s*off\)?/i);
      if (offMatch) directDiscount = parseInt(offMatch[1]);
    }

    if (finalPrice === 0 && originalPriceValue === 0) {
      // Scrape entirely failed (likely CAPTCHA). Do not wipe out existing grid prices.
      return product;
    }

    if (finalPrice > 0) {
      product.price = finalPrice;
    }
    
    // Validação anti-invenção: Descartar originalPrice se parece ser parcela ou é absurdo
    if (originalPriceValue > 0 && product.price > 0) {
      const impliedDiscount = Math.round(((originalPriceValue - product.price) / originalPriceValue) * 100);
      // Desconto > 70% é muito provavelmente um erro de captura (parcela, preço de outro vendedor, etc.)
      if (impliedDiscount > 70 || impliedDiscount < 3) {
        console.log(`[Amazon Hydrate] ⚠️ Descartando originalPrice ${originalPriceValue} (desconto implícito ${impliedDiscount}% é suspeito) para ${product.title?.substring(0, 40)}`);
        originalPriceValue = 0;
      }
    }

    // Priority 1: Use detected original price only if it's higher than the current one and seems valid
    if (originalPriceValue && originalPriceValue > product.price + 1) {
      // Don't overwrite if the new original price is WORSE (lower) than what the grid already found!
      if (!product.originalPrice || originalPriceValue > product.originalPrice) {
         product.originalPrice = originalPriceValue;
         product.discount = Math.round(((originalPriceValue - product.price) / originalPriceValue) * 100);
      }
    } 
    // Priority 2: Use direct discount badge from this hydration (but don't invent DE price)
    else if (directDiscount > 0 && product.price > 0) {
      product.discount = directDiscount;
      // NUNCA reconstruir originalPrice a partir do desconto — só mostra "De:" com dados REAIS
    }
    // Fallback: Se não encontrou dados válidos, limpar dados inválidos
    else if (!product.originalPrice || product.originalPrice <= product.price) {
       product.originalPrice = undefined;
       product.discount = 0;
    }
  } catch (e) {
    console.error(`Error hydrating amazon price for ${product.id}`, (e as Error).message);
  }
  return product;
}
