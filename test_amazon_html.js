const fs = require('fs');
const ch = require('cheerio');
const html = fs.readFileSync('temp_amazon.html', 'utf8');
const $ = ch.load(html);

$('.p13n-grid-col, .a-carousel-card').each((i, el) => {
  const text = $(el).text();
  if (text.includes('Combo Vision')) {
    console.log("=== ITEM ENCONTRADO ===");
    console.log($(el).html());
  }
});
