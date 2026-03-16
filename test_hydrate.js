require('ts-node').register();
const fs = require('fs');
const { hydrateAmazonPrice } = require('./src/lib/scrapers/amazon.ts');

async function test() {
  const url = fs.readFileSync('frigurl.txt', 'utf8').trim();
  console.log('Testing hydration on:', url);
  const p = {
      price: 0,
      originalPrice: 0,
      discount: 0,
      url: url
  };
  await hydrateAmazonPrice(p);
  console.log('Final product object:', JSON.stringify(p, null, 2));
}
test();
