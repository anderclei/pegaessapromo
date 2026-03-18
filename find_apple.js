const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
        if (content.toLowerCase().includes('apple watch se 3')) {
            console.log(`FOUND in ${file}`);
            const data = JSON.parse(content);
            // Search inside the data structure
            Object.entries(data).forEach(([key, val]) => {
                const str = JSON.stringify(val).toLowerCase();
                if (str.includes('apple watch se 3')) {
                    console.log(`Key: ${key}`);
                    console.log(JSON.stringify(val, null, 2));
                }
            });
        }
    } catch (e) {}
});
