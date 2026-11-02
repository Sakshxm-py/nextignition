const fs = require('fs');
const path = require('path');

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
  
  // The previous script added: id="tag-xxxxxx" name="tag-xxxxxx"
  // Where tag is input | select | textarea and xxxxxx is a 6-char hex string
  // Let's remove the id part so we don't have duplicate IDs in the DOM when a component renders multiple times.
  const regex = / id="(input|select|textarea)-([a-f0-9]{6})"/g;
  
  let totalFixed = 0;
  let filesModified = 0;
  
  results.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let fileMatches = 0;
    
    // Replace by stripping out the id match completely
    const newContent = content.replace(regex, (match) => {
      fileMatches++;
      return ''; // remove the entire id attribute
    });
    
    if (fileMatches > 0) {
      fs.writeFileSync(file, newContent, 'utf8');
      totalFixed += fileMatches;
      filesModified++;
    }
  });
  
  console.log('Removed ' + totalFixed + ' duplicate static IDs across ' + filesModified + ' files.');
});
