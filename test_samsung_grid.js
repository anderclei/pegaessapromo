const axios = require('axios');
const ch = require('cheerio');

async function test() {
  try {
    const r = await axios.get('https://www.amazon.com.br/gp/bestsellers/appliances/', {
      headers: {'User-Agent': 'Mozilla/5.0'}
    });
    const $ = ch.load(r.data);
    $('.p13n-grid-col').each((i, el) => {
      if ($(el).text().includes('Samsung Lavadora')) {
        console.log('--- FOUND IN LIST ---');
        console.log('Title:', $(el).find('img').attr('alt'));
        
        let originalPriceText = $(el).find('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                                  $(el).find('.a-text-strike').first().text().trim() ||
                                  $(el).find('.basisPrice').text().trim() ||
                                  $(el).find('.a-color-secondary.a-text-strike').text().trim();
        console.log('Original Text:', originalPriceText);
        
        const cleanPrice = (text) => {
          if (!text) return 0;
          const match = text.match(/R\$\s*([\d.,]+)/);
          if (match) {
            return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
          }
          const num = text.replace(/[^\d,]/g, '').replace(',', '.').trim();
          return parseFloat(num) || 0;
        };
        console.log('Cleaned:', cleanPrice(originalPriceText));
      }
    });
  } catch (e) {
    console.error(e.message);
  }
}
test();
