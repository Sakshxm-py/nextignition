const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('frontend/src', function(err, results) {
  if (err) throw err;
  
  // This matches opening tags for input, textarea, and select
  // We make sure not to capture the closing > or /> here, but we match it
  const regex = /<(input|textarea|select)([^>]*?)(\/?)>/g;
  
  let totalFixed = 0;
  let filesModified = 0;
  
  results.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    let fileMatches = 0;
    
    const newContent = content.replace(regex, (match, tag, attrs, closingSlash) => {
      // Very basic check to avoid existing id or name attributes
      // Also avoids things like className="...name..." but works mostly
      if (/\s+id\s*=/i.test(attrs) || /\s+name\s*=/i.test(attrs)) {
        return match;
      }
      if (match.includes(" id=") || match.includes(" name=")) {
         return match;
      }
      
      fileMatches++;
      modified = true;
      const uniqueSuffix = crypto.randomBytes(3).toString('hex');
      const newId = tag + '-' + uniqueSuffix;
      
      // Return the new tag with injected id and name
      return '<' + tag + ' id="' + newId + '" name="' + newId + '"' + attrs + closingSlash + '>';
    });
    
    if (modified) {
      fs.writeFileSync(file, newContent, 'utf8');
      totalFixed += fileMatches;
      filesModified++;
    }
  });
  
  console.log('Fixed ' + totalFixed + ' form fields across ' + filesModified + ' files.');
});
