const axios = require('axios');
const cheerio = require('cheerio');

async function debugWatch() {
    // The ASIN from hot_products.json for this title
    const url = 'https://www.amazon.com.br/dp/B0F9FPK89D';
    console.log('Scraping:', url);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        const $ = cheerio.load(data);
        
        const priceWhole = $('.priceToPay .a-price-whole').first().text().trim();
        const priceFraction = $('.priceToPay .a-price-fraction').first().text().trim();
        console.log('Price to Pay:', priceWhole, priceFraction);
        
        const pixPriceText = $('body').text().match(/R\$\s*([\d.,]+)\s*(?:à\s+vista\s+)?no\s+Pix/i);
        console.log('Pix Price Match:', pixPriceText ? pixPriceText[0] : 'Not found');
        
        const installments = $('.best-offer-name:contains("Parcelamento")').next().text() || $('.a-size-base.a-color-secondary:contains("em até")').text();
        console.log('Installments:', installments.trim());
        
        // Check for other sellers
        const moreOffers = $('#olpLinkWidget_feature_div').text().trim();
        console.log('More Offers:', moreOffers);

    } catch (e) {
        console.error(e.message);
    }
}
debugWatch();
