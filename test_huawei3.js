const axios = require('axios');
const ch = require('cheerio');

async function test() {
  const url = 'https://www.amazon.com.br/gp/bestsellers/electronics/';
  const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = ch.load(r.data);
  $('.p13n-grid-col').each((i, el) => {
    if ($(el).text().includes('HUAWEI Band')) {
      let title = $(el).find('img').attr('alt') || $(el).text();
      let priceText = $(el).find('.a-price .a-offscreen').first().text().trim() ||
                      $(el).find('.p13n-sc-price').first().text().trim();
      let oPriceText = $(el).find('.a-text-strike').first().text().trim();
      console.log('Title:', title.substring(0, 40));
      console.log('Price:', priceText);
      console.log('Old Price:', oPriceText);
    }
  });
}
test();
