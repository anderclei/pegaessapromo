const { hydrateAmazonPrice } = require('./src/lib/scrapers/amazon');

async function testHydrate() {
    const product = {
        id: 'test',
        title: 'Apple Watch',
        url: 'https://www.amazon.com.br/dp/B0FQFPKB9D', // Starlight
    };
    console.log('Hydrating:', product.url);
    const hydrated = await hydrateAmazonPrice(product);
    console.log('Hydrated:', JSON.stringify(hydrated, null, 2));
}
testHydrate();
