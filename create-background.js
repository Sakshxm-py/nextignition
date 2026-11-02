const fs = require('fs');
const path = require('path');

const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Data, 'base64');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

fs.writeFileSync(path.join(assetsDir, 'icon-background.png'), buffer);
console.log('Created assets/icon-background.png');
