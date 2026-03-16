const axios = require('axios');
const ch = require('cheerio');

async function test() {
  const url = 'https://www.amazon.com.br/Frigobar-45L-INOX-127V-Midea/dp/B07R11Y75V';
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = ch.load(res.data);
    
    // Simulating hydrateAmazonPrice exactly
    const priceSelectors = [
      '.priceToPay .a-price-whole',
      '#corePriceDisplay_desktop_feature_div .a-price-whole',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price.a-text-price.a-size-medium .a-offscreen',
      '.a-price .a-offscreen',
      '.a-color-price'
    ];

    let extractedPrice = 0;
    for (const selector of priceSelectors) {
      let pt = $(selector).first().text().trim();
      if (pt) {
        if (selector.includes('a-price-whole')) {
          const fraction = $(selector).first().next('.a-price-fraction').text().trim() || '00';
          pt = pt.replace(/\./g, '') + ',' + fraction;
        }
        const match = pt.match(/[\d.,]+/);
        if (match) {
          extractedPrice = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
          if (extractedPrice > 0) {
            console.log('Got price from selector:', selector, '->', extractedPrice);
            break;
          }
        }
      }
    }

    let pixPrice = 0;
    const allText = $('body').text();
    // Test a vista no Pix match
    const pixMatch = allText.match(/R\$\s*([\d.,]+)\s*à vista no Pix/i) || 
                     allText.match(/R\$\s*([\d.,]+)\s*no Pix/i);
    if (pixMatch) {
      pixPrice = parseFloat(pixMatch[1].replace(/\./g, '').replace(',', '.'));
      console.log('Got pix price:', pixPrice);
    }

    let extractedOriginal = 0;
    const pText = $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                  $('.basisPrice .a-offscreen').first().text().trim() ||
                  $('#listPrice').text().trim();
    if (pText && pText.includes('R$')) { // Must include R$ to be a price
      const match = pText.match(/R\$\s*([\d.,]+)/);
      if (match) {
         extractedOriginal = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
         console.log('Got original price:', extractedOriginal);
      }
    }

    console.log({ extractedPrice, pixPrice, extractedOriginal });
  } catch (err) {
    console.error(err.message);
  }
}
test();
