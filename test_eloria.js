const axios = require('axios');
const ch = require('cheerio');

async function test() {
  try {
    const url = 'https://www.amazon.com.br/ELORIA-Bicicleta-Equilibrio-Desenvolve-Coordena%C3%A7%C3%A3o/dp/B01C3O17CU/';
    const r = await axios.get(url, {
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html'}
    });
    const $ = ch.load(r.data);
    console.log('Price (.a-price .a-offscreen):', $('.a-price .a-offscreen').first().text().trim());
    console.log('List Price:', $('.a-price.a-text-price .a-offscreen').first().text().trim());
    console.log('Pix:', $('.savingPriceOverride').text().trim() || $('.basisPrice').text().trim());
    console.log('All a-price offscreen:', $('.a-price .a-offscreen').map((i, el) => $(el).text()).get());
    
    let priceText = $('.a-price .a-offscreen').first().text().trim();
    // Sometimes pix price is inside savings override
    const pixText = $('.savingPriceOverride').first().text().trim();
    // Some pages show pix text in a specific format near price
    const listPriceText = $('.a-price.a-text-price .a-offscreen').first().text().trim();
    
    console.log("Extracted PriceText:", priceText);
  } catch(e) {
    console.log('Error', e.message);
  }
}
test();
