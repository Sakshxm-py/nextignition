const fs = require('fs');
const { execSync } = require('child_process');

const files = [
  'frontend/src/assets/faed1dd832314fe381fd34c35312b9faa571832d.png',
  'frontend/src/assets/c1daa721302db62b744322e73e636f7b8f029976.png'
];

files.forEach(file => {
  try {
    const stats = fs.statSync(file);
    console.log(`${file}: ${stats.size} bytes`);
  } catch (e) {
    console.log(`${file} not found`);
  }
});
