const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const srcDir = 'd:\\nextignition\\frontend\\src';

walkDir(srcDir, function(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace toast action with conditional action
  // action: { label: '...Upgrade...', onClick: () => window.location.hash = '#pricing' }
  const actionRegex = /action:\s*\{\s*label:\s*['"]([^'"]+)['"],\s*onClick:\s*\(\)\s*=>\s*\(?window\.location\.hash\s*=\s*['"]#pricing['"]\)?\s*\}/g;
  
  if (actionRegex.test(content)) {
    content = content.replace(actionRegex, "...(Capacitor.getPlatform() === 'ios' ? {} : { action: { label: '$1', onClick: () => window.location.hash = '#pricing' } })");
    
    // Ensure Capacitor is imported
    if (!content.includes("import { Capacitor }")) {
      // add import at top
      content = "import { Capacitor } from '@capacitor/core';\n" + content;
    }
  }

  // Handle direct <a href="#pricing"> or similar
  const hrefRegex = /href=['"]#pricing['"]/g;
  if (hrefRegex.test(content) && !filePath.includes('MarketingPages.tsx')) {
    // Just a basic warning, we might need manual fix for these
    console.log(`Manual check needed for href="#pricing" in ${filePath}`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${filePath}`);
  }
});
