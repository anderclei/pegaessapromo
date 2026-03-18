const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
  const url = 'https://www.amazon.com.br/gp/bestsellers/computers/';
  console.log('Fetching:', url);
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000,
    });
    
    // Save sample HTML to debug if needed
    // const fs = require('fs');
    // fs.writeFileSync('temp_amz_test.html', data);
    
    const $ = cheerio.load(data);
    const products = [];
    
    // Using the same selectors as in amazon.ts
    $('.zg-grid-general-faceout, [id^="post-"], .p13n-grid-col, .p13n-sc-uncentered-faceout').each((i, el) => {
        if (products.length >= 5) return;
        const $el = $(el);
        const title = $el.find('.p13n-sc-truncate, .p13n-sc-truncate-desktop-type2, [class*="sc-truncate"]').text().trim() || 
                      $el.find('img').attr('alt');
        const price = $el.find('.a-price .a-offscreen').first().text().trim();
        if (title) {
            products.push({ title, price });
        }
    });
    
    console.log('Found products:', products.length);
    products.forEach((p, i) => console.log(`${i+1}: ${p.title} - ${p.price}`));
    
    if (products.length === 0) {
        console.log('No products found. Checking if CAPTCHA was served...');
        if (data.includes('validate') || data.includes('api-services-support@amazon.com')) {
            console.log('Amazon is asking for CAPTCHA.');
        } else {
            console.log('No CAPTCHA, but selectors might be broken.');
            // console.log(data.slice(0, 1000));
        }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testScrape();
