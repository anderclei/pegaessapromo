const fs = require('fs');
const ch = require('cheerio');
const html = fs.readFileSync('temp_movers.html', 'utf8');
const $ = ch.load(html);

$('.p13n-grid-col').each((i, el) => {
  if ($(el).text().includes('HUAWEI Band')) {
    console.log($(el).html());
    let priceText = $(el).find('.a-price .a-offscreen').first().text().trim() ||
                    $(el).find('.p13n-sc-price, .a-size-base.a-color-price').first().text().trim();
    console.log('Price found:', priceText);
  }
});
