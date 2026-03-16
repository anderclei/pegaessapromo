const axios = require('axios');
const ch = require('cheerio');

async function test() {
  try {
    const r = await axios.get('https://www.amazon.com.br/gp/bestsellers/electronics/', {
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
    });
    const $ = ch.load(r.data);
    $('.p13n-grid-col').each((i, el) => {
      if ($(el).text().includes('HUAWEI Band')) {
        console.log('--- FOUND ITEM ---');
        console.log('Title:', $(el).find('img').attr('alt') || $(el).text().substring(0, 30));
        
        let priceText = $(el).find('.a-price .a-offscreen').first().text().trim() ||
                        $(el).find('.p13n-sc-price, .a-size-base.a-color-price').first().text().trim();
        let originalPriceText = $(el).find('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                                $(el).find('.a-text-strike').first().text().trim();

        console.log('Extracted priceText:', priceText);
        console.log('Extracted originalPriceText:', originalPriceText);
        
        const cleanPrice = (text) => {
          if (!text) return 0;
          const match = text.match(/R\$\s*([\d.,]+)/);
          if (match) {
            return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
          }
          const num = text.replace(/[^\d,]/g, '').replace(',', '.').trim();
          return parseFloat(num) || 0;
        };

        console.log('Final Price:', cleanPrice(priceText));
        console.log('Final Original:', cleanPrice(originalPriceText));
      }
    });
  } catch (e) {
    console.error(e.message);
  }
}
test();
