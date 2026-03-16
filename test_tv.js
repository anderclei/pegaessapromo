const ch = require('cheerio');
const http = require('http');

http.get('http://localhost:3000/api/amazon?category=todos', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    const tv = json.products.find(p => p.title.includes('Samsung Combo Vision'));
    if (tv) {
      console.log('TV found in API. Fetching detail page...');
      http.get('http://localhost:3000/p/' + tv.id, (r2) => {
        let html = '';
        r2.on('data', c => html += c);
        r2.on('end', () => {
          const $ = ch.load(html);
          console.log('Title:', $('.main-title').text());
          console.log('Pricing:', $('.pricing-box').text().replace(/\s+/g, ' ').trim());
        });
      });
    } else {
      console.log('TV not found in API. Fetching new arrivals...');
    }
  });
});
