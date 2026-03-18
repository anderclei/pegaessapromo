const axios = require('axios');

async function triggerSync() {
  console.log('Hitting sync API at localhost:3000...');
  try {
    const start = Date.now();
    const response = await axios.get('http://localhost:3000/api/amazon/sync', {
        timeout: 10 * 60 * 1000 // 10 minutes
    });
    const elapsed = Math.floor((Date.now() - start) / 1000);
    console.log('Sync finished in', elapsed, 'seconds!');
    console.log('Response:', response.data);
  } catch (err) {
    console.error('Error triggering sync:', err.message);
    if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
    }
  }
}

triggerSync();
