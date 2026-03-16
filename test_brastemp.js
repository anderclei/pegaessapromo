const axios = require('axios');
const ch = require('cheerio');
const fs = require('fs');

async function test() {
  const url = fs.readFileSync('bra_url.txt', 'utf8').trim();
  console.log('Fetching', url);
  try {
    const r = await axios.get(url, {
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'pt-BR,pt'
      }
    });

    const $ = ch.load(r.data);
    fs.writeFileSync('temp_brastemp.html', r.data);

    // 1. Check all price elements
    console.log('--- Price Selections ---');
    console.log('.priceToPay .a-price-whole:', $('.priceToPay .a-price-whole').first().text());
    console.log('.priceToPay .a-price-fraction:', $('.priceToPay .a-price-whole').first().next('.a-price-fraction').text());
    console.log('.a-price .a-offscreen (all):', $('.a-price .a-offscreen').map((i, el) => $(el).text()).get());

    // 2. Check Pix text
    console.log('--- Pix Detection ---');
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const pixMatch = bodyText.match(/R\$\s*([\d.,]+)\s*(à vista no Pix|no Pix)/i) || 
                     bodyText.match(/([\d.,]+)\s*(à vista no Pix|no Pix)/i);
    console.log('Pix Match Result:', pixMatch ? pixMatch[0] : 'None');

    // 3. Check Original Price
    console.log('--- Original Price Detection ---');
    console.log('.a-price.a-text-price .a-offscreen:', $('.a-price.a-text-price .a-offscreen').first().text());
    console.log('.basisPrice .a-offscreen:', $('.basisPrice .a-offscreen').first().text());
    console.log('.a-text-strike:', $('.a-text-strike').first().text());

  } catch (e) {
    console.log('Error', e.message);
  }
}
test();
