const crypto = require('crypto');
const axios = require('axios');

async function test() {
  const payload = {
    query: `
      query {
        productOfferV2(keyword: "smart tv", limit: 5) {
          nodes {
            itemId
            productName
            price
            offerLink
          }
        }
      }
    `
  };
  
  const payloadStr = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const f = '18329141011' + ts + payloadStr + '2CEZ4IBEPJAPFN3CZKWPP66AJPYMOEKW';
  const s = crypto.createHash('sha256').update(f, 'utf8').digest('hex');
  
  try {
    const r = await axios.post('https://open-api.affiliate.shopee.com.br/graphql', payloadStr, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=18329141011, Timestamp=${ts}, Signature=${s}`
      }
    });
    console.log(JSON.stringify(r.data, null, 2));
  } catch(e) {
    console.log(e.response?.data || e.message);
  }
}
test();
