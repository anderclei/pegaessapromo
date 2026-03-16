const axios = require('axios');
const ch = require('cheerio');

async function test() {
  const url = 'https://www.amazon.com.br/gp/bestsellers/toys/';
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const $ = ch.load(data);
  $('.p13n-grid-col').each((i, el) => {
    const title = $(el).find('img').attr('alt') || $(el).text();
    if (title.includes('Bicicleta de Equ')) {
      console.log('--- FOUND ITEM ---');
      console.log('priceText HTML:', $(el).find('.a-price .a-offscreen').html());
      console.log('priceText HTML2:', $(el).find('.p13n-sc-price, .a-size-base.a-color-price').html());
      console.log('originalText HTML:', $(el).find('.a-price.a-text-price .a-offscreen').html());
      console.log('strike HTML:', $(el).find('.a-text-strike').html());
      console.log('All text:', $(el).text());
    }
  });
}
test();
