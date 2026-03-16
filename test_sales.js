const fs = require('fs');
const ch = require('cheerio');
const html = fs.readFileSync('temp_amz_sales.html', 'utf8');
const $ = ch.load(html);

$('.p13n-grid-col').slice(0, 5).each((i, el) => {
  const text = $(el).text();
  console.log('--- Item', i);
  const reviewsText = $(el).find('span.a-size-small, .a-size-small .a-link-normal').text().trim();
  console.log('Reviews raw:', reviewsText);
  // See if there's any text like "compras no mês passado"
  console.log('All text snippet:', $(el).text().replace(/\s+/g, ' ').substring(0, 200));
});
