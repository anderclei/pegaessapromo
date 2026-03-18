const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function downloadHTML() {
    const url = 'https://www.amazon.com.br/dp/B0FQFPKB9D';
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });
        fs.writeFileSync('apple_watch_amz.html', data);
        
        const $ = cheerio.load(data);
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        
        const match = bodyText.match(/ou\s*R\$\s*([\d.,]+)\s*em/i);
        console.log("Installment Original Price Match:", match ? match[1] : 'NONE');
        
        const mPix = bodyText.match(/R\$\s*([\d.,]+)\s*(?:à\s+vista\s+)?no\s+Pix/i);
        console.log("Pix Match:", mPix ? mPix[1] : 'NONE');

        // Look for 10% off
        const offMatch = bodyText.match(/\(?(\d+)%\s*off\)?/i);
        console.log("Off Match:", offMatch ? offMatch[1] : 'NONE');
        
        // Find installment element directly
        const instlEles = $('span').filter((i, el) => $(el).text().includes('em até 10x')).text();
        console.log("direct span:", instlEles.substring(0, 100));

    } catch (e) {
        console.error(e.message);
    }
}
downloadHTML();
