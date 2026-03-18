const axios = require('axios');
const cheerio = require('cheerio');

const cleanPriceStr = (text) => {
    if (!text) return 0;
    const numText = text.replace(/[^\d.,]/g, '');
    const match = numText.match(/([\d.]+),(\d{2})/);
    if (match) {
        return parseFloat(match[1].replace(/\./g, '') + '.' + match[2]);
    }
    const cleanStr = numText.replace(/\./g, '').replace(',', '.').trim();
    return parseFloat(cleanStr) || 0;
};

async function testDebug() {
    const url = 'https://www.amazon.com.br/dp/B0FQFPKB9D'; // Starlight
    console.log('Scraping:', url);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        const $ = cheerio.load(data);
        
        let basePriceText = '';
        const priceSelectors = [
          '#corePriceDisplay_desktop_feature_div .a-price-whole',
          '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
          '.priceToPay .a-price-whole',
          '.priceToPay .a-price .a-offscreen',
          '.a-price .a-offscreen'
        ];

        for (const selector of priceSelectors) {
          const element = $(selector).first();
          let pt = element.text().trim();
          if (pt) {
            if (selector.includes('.a-price-whole')) {
              const fraction = element.parent().find('.a-price-fraction').text().trim() || '00';
              pt = pt.replace(/\./g, '') + ',' + fraction;
            }
            const match = pt.match(/[\d.,]+/);
            if (match) {
               basePriceText = match[0];
               break;
            }
          }
        }
        
        const price = cleanPriceStr(basePriceText);
        console.log('Base Price:', price);

        const priceContext = $('#corePriceDisplay_desktop_feature_div, #corePrice_desktop, .priceToPay').text().replace(/\s+/g, ' ');
        const pixRegex1 = /R\$\s*([\d.,]+)\s*(?:à\s+vista\s+)?no\s+Pix/i;
        const m1 = priceContext.match(pixRegex1);
        if (m1) console.log('Pix Match:', m1[0], 'Value:', cleanPriceStr(m1[1]));

        let pText = $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
                    $('.basisPrice .a-offscreen').first().text().trim() ||
                    $('#listPrice').text().trim() ||
                    $('.a-text-strike').first().text().trim() ||
                    $('.a-size-small.a-color-secondary.a-text-strike').first().text().trim();
        
        let originalPrice = cleanPriceStr(pText);
        const installmentText = $('#corePriceDisplay_desktop_feature_div, #corePrice_desktop, .priceToPay').parent().text().replace(/\s+/g, ' ');
        console.log('Context Text snippet:', installmentText.substring(0, 500));
        const instMatch = installmentText.match(/ou\s+R\$\s*([\d.,]+)\s+em/i);
        if (instMatch) {
          originalPrice = cleanPriceStr(instMatch[1]);
        }
        console.log('Original Price (from match):', originalPrice);
        console.log('Original Price:', originalPrice);

        const wholeText = $('body').text().replace(/\s+/g, ' ');
        const offMatch = wholeText.match(/\((\d+)%\s*off\)/i);
        if (offMatch) directDiscount = parseInt(offMatch[1]);
        console.log('Direct Discount (from body):', directDiscount);

    } catch (e) {
        console.error(e.message);
    }
}
testDebug();
