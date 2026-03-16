const axios = require('axios');
const ch = require('cheerio');
const fs = require('fs');

async function test() {
  const url = fs.readFileSync('smart_url.txt', 'utf8').trim();
  console.log('Testing', url);
  try {
    const r = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'pt-BR,pt'
      },
      timeout: 10000
    });
    const $ = ch.load(r.data);
    
    fs.writeFileSync('temp_smart.html', r.data);

    let priceToPay = $('.priceToPay .a-price-whole').first().text().trim();
    let priceToPayFraction = $('.priceToPay .a-price-fraction').first().text().trim();
    console.log('priceToPay:', priceToPay + ',' + priceToPayFraction);

    let corePrice = $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().trim();
    let corePriceFraction = $('#corePriceDisplay_desktop_feature_div .a-price-fraction').first().text().trim();
    console.log('corePrice:', corePrice + ',' + corePriceFraction);

    const cleanPrice = (text) => {
        if (!text) return 0;
        const numText = text.replace(/[^\d.,]/g, '');
        const match = numText.match(/([\d.]+),(\d{2})/);
        if (match) return parseFloat(match[1].replace(/\./g, '') + '.' + match[2]);
        return parseFloat(numText.replace(/\./g, '').replace(',', '.')) || 0;
    };

    // PIX Logic
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const pixMatches = bodyText.matchAll(/R\$\s*([\d.,]+)\s*(à vista no Pix|no Pix)/gi);
    for (const match of pixMatches) {
        console.log('Pix Found:', match[0], 'Value:', cleanPrice(match[1]));
    }

    // Is there 3108 somewhere?
    const allMatches = bodyText.matchAll(/([\d.,]+)/g);
    for (const m of allMatches) {
        if (m[1].includes('3.108') || m[1].includes('3108')) {
            console.log('Found 3108 match in text:', m[0]);
        }
    }

  } catch(e) {
    console.log('Error', e.message);
  }
}
test();
