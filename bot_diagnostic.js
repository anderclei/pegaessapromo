const { Client, LocalAuth } = require('whatsapp-web.js');
// Diagnóstico sem qrcode-terminal

console.log('Iniciando diagnóstico do bot...');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('📱 QR CODE RECEBIDO NO MOTOR!');
});

client.on('ready', () => {
    console.log('BOT PRONTO!');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('FALHA DE AUTENTICAÇÃO:', msg);
});

client.initialize().catch(err => {
    console.error('ERRO FATAL NA INICIALIZAÇÃO:', err);
    process.exit(1);
});
