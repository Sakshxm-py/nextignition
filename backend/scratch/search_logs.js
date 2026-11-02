const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\045ab0dc-a5f8-4f3d-876e-eb81f700aa2d\\.system_generated\\logs\\transcript.jsonl';

async function search() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Searching logs...");
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('exec_sql') || line.includes('exec') || line.includes('password') || line.includes('migration')) {
      // Print truncated line
      console.log(`[Line ${lineNum}] ${line.substring(0, 300)}...`);
    }
  }
  console.log("Search done.");
}

search().catch(console.error);
