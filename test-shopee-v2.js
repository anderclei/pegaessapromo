const axios = require('axios');

async function testShopee() {
  try {
    // Attempting a common frontend API endpoint used by Shopee
    // Note: This often requires a 'SPC_EC' or similar cookie, but let's try base headers
    const url = 'https://shopee.com.br/api/v4/recommend/recommend?bundle=daily_discover_main&limit=10&offset=0';
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-source': 'pc',
        'Referer': 'https://shopee.com.br/'
      },
      timeout: 10000
    });
    
    if (data && data.data && data.data.sections) {
      const items = data.data.sections[0]?.index || [];
      console.log("Success! Items found in recommendations:", items.length);
    } else {
      console.log("Response status 200 but structure unexpected.");
      console.log("Raw response keys:", Object.keys(data));
    }
  } catch (error) {
    if (error.response) {
      console.error(`Error status: ${error.response.status}`);
      // console.log(error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testShopee();
