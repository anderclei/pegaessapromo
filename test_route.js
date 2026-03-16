const ax = require('axios');
const ch = require('cheerio');
ax.get('http://localhost:3000/p/d3ykgndec4i').then(r => {
  const $ = ch.load(r.data);
  console.log('Main title:', $('.main-title').text());
  console.log('Pricing:', $('.pricing-box').text().replace(/\s+/g, ' '));
  console.log('Discount:', $('.discount-badge-detail').text() || 'None');
}).catch(e => console.log('Error:', e.message));
