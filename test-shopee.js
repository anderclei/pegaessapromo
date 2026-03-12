const axios = require('axios');

async function testShopee() {
  try {
    // API endpoint for search results
    const url = 'https://shopee.com.br/api/v4/search/search_items?keyword=promocao&limit=5';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://shopee.com.br/',
        'x-requested-with': 'XMLHttpRequest'
      },
      timeout: 10000
    });
    
    if (data && data.items) {
      console.log("Success! Items found:", data.items.length);
      console.log("Example title:", data.items[0]?.item_basic?.name);
    } else {
      console.log("Response successful but no items in array.");
      console.log("Raw response (first 200 chars):", JSON.stringify(data).substring(0, 200));
    }
  } catch (error) {
    console.error("Error fetching Shopee:", error.response ? `Status: ${error.response.status}` : error.message);
  }
}

testShopee();
