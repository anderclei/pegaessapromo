const fs = require('fs');
const lines = fs.readFileSync('src/app/admin/page.tsx', 'utf8').split('\n');
const start = lines.findIndex((l, i) => i > 1500 && l.includes("activeTab === 'categories'"));
if (start !== -1) {
  console.log(lines.slice(start, start + 30).join('\n'));
} else {
  console.log('Not found');
}
