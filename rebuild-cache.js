const axios = require('./node_modules/axios').default;
const cheerio = require('./node_modules/cheerio');
const fs = require('fs');
const path = require('path');

const AFFILIATE_TAG = 'andercleipino-20';
const FILE = path.join(__dirname, 'data', 'hot_products.json');

function generateId(url) {
  const m = url && url.match(/\/dp\/([A-Z0-9]{10})/i);
  return m ? m[1] : 'amz-' + Math.random().toString(36).substr(2, 9);
}

async function scrapeUrl(url, listType, category) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    timeout: 20000
  });

  const load = cheerio.load || (cheerio.default && cheerio.default.load);
  const $ = load(data);
  const products = [];

  $('.zg-grid-general-faceout, [id^="post-"], .p13n-grid-col, .p13n-sc-uncentered-faceout').each((i, el) => {
    if (products.length >= 20) return;
    const $el = $(el);
    const title = $el.find('.p13n-sc-truncate, .p13n-sc-truncate-desktop-type2, [class*="sc-truncate"]').text().trim()
      || $el.find('img').attr('alt');
    const image = $el.find('img').attr('src');
    const relLink = $el.find('a.a-link-normal').attr('href');
    const priceW = $el.find('.a-price-whole').first().text().replace(/[.,]/g, '').trim();
    const priceF = $el.find('.a-price-fraction').first().text().trim() || '00';
    const price = parseFloat(priceW + '.' + priceF) || 0;
    const discountText = $el.find('.savingsPercentage, .reinventPriceSavingsPercentageMargin').text().trim();
    const discount = discountText ? parseInt(discountText.replace(/[^0-9]/g, '')) || 0 : 0;

    if (title && relLink) {
      let pUrl = relLink.startsWith('http') ? relLink : 'https://www.amazon.com.br' + relLink;
      if (!pUrl.includes('tag=')) pUrl += (pUrl.includes('?') ? '&' : '?') + 'tag=' + AFFILIATE_TAG;
      products.push({
        id: generateId(pUrl),
        title,
        price,
        discount,
        image: image || '',
        rating: 4.5,
        reviews: 100,
        sales: 300,
        category,
        platform: 'amazon',
        url: pUrl,
        freeShipping: true,
        type: listType,
        listType,
        createdAt: new Date().toISOString(),
      });
    }
  });
  return products;
}

async function main() {
  const tasks = [
    { url: 'https://www.amazon.com.br/gp/bestsellers/electronics/', type: 'bestsellers', cat: 'eletronicos' },
    { url: 'https://www.amazon.com.br/gp/new-releases/electronics/', type: 'new-releases', cat: 'eletronicos' },
    { url: 'https://www.amazon.com.br/gp/movers-and-shakers/electronics/', type: 'movers-and-shakers', cat: 'eletronicos' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/computers/', type: 'bestsellers', cat: 'informatica' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/videogames/', type: 'bestsellers', cat: 'games_consoles' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/home/', type: 'bestsellers', cat: 'casa' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/kitchen/', type: 'bestsellers', cat: 'cozinha' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/appliances/', type: 'bestsellers', cat: 'eletrodomesticos' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/hpc/', type: 'bestsellers', cat: 'saude_beleza' },
    { url: 'https://www.amazon.com.br/gp/bestsellers/sports/', type: 'bestsellers', cat: 'esporte' },
  ];

  const resultsByCategory = {};

  for (const task of tasks) {
    try {
      process.stdout.write(`Scraping ${task.cat}/${task.type}... `);
      const products = await scrapeUrl(task.url, task.type, task.cat);
      console.log(`${products.length} produtos`);
      if (!resultsByCategory[task.cat]) resultsByCategory[task.cat] = [];
      resultsByCategory[task.cat].push(...products);
      await new Promise(r => setTimeout(r, 2500));
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
    }
  }

  const total = Object.values(resultsByCategory).flat().length;

  if (total > 0) {
    const hotData = {
      ...resultsByCategory,
      ofertas_gerais: Object.values(resultsByCategory).flat().filter(p => p.discount >= 15),
      lastSync: new Date().toISOString(),
      syncMode: 'manual_scrape',
      metadata: { totalProducts: total, mode: 'Web Scraping' },
    };

    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(hotData, null, 2));
    console.log(`\n✅ Cache salvo: ${total} produtos em data/hot_products.json`);
  } else {
    console.log('\n❌ Nenhum produto extraído. Amazon pode estar bloqueando.');
  }
}

main().catch(console.error);
