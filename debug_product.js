const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/ander/Documents/vendas/data/hot_products.json', 'utf-8'));
const el = data.eletronicos || [];
const found = el.find(p => p.title.includes('Apple Watch SE 3'));
console.log(JSON.stringify(found, null, 2));
