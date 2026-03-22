import axios from 'axios';

const APP_ID = '1753323587758242';
const SECRET = 'EynD9HdQT9y9o7CuJ8KOgA81Y7vgV3VL';

const params = new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: APP_ID,
  client_secret: SECRET,
});

const { data: authData } = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 10000,
});

const token = authData.access_token;
const uid = authData.user_id;
console.log('UID:', uid, 'SCOPE:', authData.scope);

const toTest = [
  `https://api.mercadolibre.com/deal_print_run/MLB779362-1/items?limit=5`,
  `https://api.mercadolibre.com/deal_print_run/MLB1298579-1/items?limit=5`,
  `https://api.mercadolibre.com/users/${uid}/items/search?status=active&limit=5`,
  `https://api.mercadolibre.com/items/MLB3951499481`,
  `https://api.mercadolibre.com/sites/MLB/search?category=MLB1648&sort=sold_quantity_desc&limit=5&official_store_id=all`,
];

for (const url of toTest) {
  try {
    const r = await axios.get(url, { headers: { Authorization: 'Bearer ' + token }, timeout: 8000 });
    const preview = JSON.stringify(r.data).substring(0, 200);
    console.log('✅ OK:', url.substring(36));
    console.log('   DATA:', preview);
  } catch (e) {
    console.log('❌ FAIL', e.response?.status, ':', url.substring(36));
    console.log('   MSG:', JSON.stringify(e.response?.data).substring(0, 100));
  }
}
