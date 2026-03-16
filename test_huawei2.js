const axios = require('axios');
const ch = require('cheerio');

async function test() {
  const url = 'https://www.amazon.com.br/gp/movers-and-shakers/electronics/';
  const url2 = 'https://www.amazon.com.br/gp/bestsellers/electronics/';
  const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = ch.load(r.data);
  $('.p13n-grid-col').each((i, el) => {
    if ($(el).text().includes('HUAWEI')) {
      console.log('Found in', url);
      console.log('HTML:', $(el).html());
    }
  });

  const r2 = await axios.get(url2, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $2 = ch.load(r2.data);
  $2('.p13n-grid-col').each((i, el) => {
    if ($2(el).text().includes('HUAWEI')) {
      console.log('Found in', url2);
      console.log('HTML:', $2(el).html());
    }
  });
}
test();
