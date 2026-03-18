const axios = require('axios');
const cheerio = require('cheerio');

async function checkMovers() {
    const url = 'https://www.amazon.com.br/gp/movers-and-shakers/electronics/';
    console.log('Scraping:', url);
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        const $ = cheerio.load(data);
        
        $('.zg-grid-general-faceout, .p13n-grid-col').each((i, el) => {
            const title = $(el).find('.p13n-sc-truncate').first().text().trim();
            if (title.includes('Apple Watch')) {
                const price = $(el).find('.a-price .a-offscreen').first().text().trim() || $(el).find('.p13n-sc-price').text().trim();
                console.log('Found Apple Watch in List:');
                console.log('Title:', title);
                console.log('Price displayed in list:', price);
                console.log('---');
            }
        });

    } catch (e) {
        console.error(e.message);
    }
}
checkMovers();
