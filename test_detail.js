const axios = require('axios');
const ch = require('cheerio');
const fs = require('fs');

async function test() {
  const url = fs.readFileSync('frigurl.txt', 'utf8').trim();
  console.log('Fetching', url);
  try {
    const r = await axios.get(url, {
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
    });
    const $ = ch.load(r.data);
    fs.writeFileSync('temp_midea.html', r.data);

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
           console.log('BasePrice text found from', selector, '->', basePriceText);
           break;
        }
      }
    }

    const cleanPrice = (text) => {
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
    // Amazon BR Pix format: "R$ 1.234,00 à vista no Pix" or "R$ 1.234,00 no Pix"
    const bodyText = $('body').text().replace(/\s+/g, ' '); // Normalize spaces
    const pixMatch = bodyText.match(/R\$\s*([\d.,]+)\s*(à vista no Pix|no Pix)/i);
    if (pixMatch) {
       pixPrice = cleanPrice(pixMatch[1]);
       console.log('Pix price text:', pixMatch[1], '->', pixPrice);
    }

    let finalPrice = pixPrice > 0 ? pixPrice : cleanPrice(basePriceText);

    let pText = $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                $('.basisPrice .a-offscreen').first().text().trim() ||
                $('#listPrice').text().trim() ||
                $('.a-text-strike').first().text().trim();
    
    let originalPrice = 0;
    // STRICT CHECK: R$ must be present for it to be a valid original price to avoid picking "-17%"
    if (pText && pText.includes('R$')) {
       console.log('Original Text found:', pText);
       const match = pText.match(/R\$\s*([\d.,]+)/);
       if (match) {
         originalPrice = cleanPrice(match[1]);
       }
    }

    console.log('FINAL PRICE:', finalPrice);
    console.log('BASE PRICE:', cleanPrice(basePriceText));
    console.log('PIX PRICE:', pixPrice);
    console.log('ORIGINAL PRICE:', originalPrice);

  } catch(e) {
    console.log('Error', e.message);
  }
}
test();
