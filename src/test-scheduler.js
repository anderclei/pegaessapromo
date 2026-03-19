const fetch = require('node-fetch');

async function check() {
  try {
    const resS = await fetch('http://localhost:3000/api/bots/schedule');
    const resW = await fetch('http://localhost:3000/api/bots/whatsapp');
    const sch = await resS.json();
    const bot = await resW.json();
    console.log('Scheduler State:', JSON.stringify(sch, null, 2));
    console.log('WhatsApp Bot Status:', bot.status);
    console.log('WhatsApp Bot Groups Count:', bot.groups?.length);
    console.log('Latest WhatsApp Bot Logs:', JSON.stringify(bot.logs?.slice(0, 5), null, 2));
  } catch (e) {
    console.error('Error fetching state:', e.message);
  }
}

check();
