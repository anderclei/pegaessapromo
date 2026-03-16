const axios = require('axios');
const ch = require('cheerio');
const fs = require('fs');

async function test() {
  const url = fs.readFileSync('samsung_url.txt', 'utf8').trim();
  console.log('Fetching', url);
  try {
    const r = await axios.get(url, {
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Accept-Language': 'pt-BR,pt'}
    });
    const $ = ch.load(r.data);

    let basePriceText = '';
    const priceSelectors = [
      '.priceToPay .a-price-whole',
      '#corePriceDisplay_desktop_feature_div .a-price-whole',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price.a-text-price.a-size-medium .a-offscreen',
      '.a-price .a-offscreen',
      '.a-color-price'
    ];

    for (const selector of priceSelectors) {
      let pt = $(selector).first().text().trim();
      if (pt) {
        if (selector.includes('a-price-whole')) {
          const fraction = $(selector).first().next('.a-price-fraction').text().trim() || '00';
          pt = pt.replace(/\./g, '') + ',' + fraction;
        }
        const match = pt.match(/[\d.,]+/);
        if (match) {
           basePriceText = match[0];
           break;
        }
      }
    }

    const cleanPriceStr = (text) => {
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
    const bodyText = $('body').text().replace(/\s+/g, ' '); 
    const pixMatch = bodyText.match(/R\$\s*([\d.,]+)\s*(à vista no Pix|no Pix)/i) || 
                     bodyText.match(/([\d.,]+)\s*(à vista no Pix|no Pix)/i);
    if (pixMatch) {
       pixPrice = cleanPriceStr(pixMatch[1]);
    }

    let finalPrice = pixPrice > 0 ? pixPrice : cleanPriceStr(basePriceText);

    let pText = $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                $('.basisPrice .a-offscreen').first().text().trim() ||
                $('#listPrice').text().trim() ||
                $('.a-text-strike').first().text().trim() ||
                $('span.a-size-small.a-color-secondary.a-text-strike').first().text().trim();
    
    let originalPriceText = 0;
    console.log('Original Text found:', pText);
    if (pText && pText.includes('R$')) {
       const match = pText.match(/R\$\s*([\d.,]+)/);
       if (match) {
         originalPriceText = cleanPriceStr(match[1]);
       }
    }

    console.log('FINAL PRICE:', finalPrice);
    console.log('ORIGINAL PRICE:', originalPriceText);
    
    // Dump strike-through elements to identify the exact class
    console.log('Text strikes in HTML:');
    $('.a-text-strike').each((i, el) => {
        console.log($(el).text().trim());
    });
    
  } catch(e) {
    console.log('Error', e.message);
  }
}
test();
