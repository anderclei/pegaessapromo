const fs = require('fs');
const lines = fs.readFileSync('src/app/admin/page.tsx', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes("activeTab === 'categories'"));
if(idx !== -1) {
  console.log(lines.slice(idx, idx+60).join('\n'));
} else {
  console.log("Not found");
}
