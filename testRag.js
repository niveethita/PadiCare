// testRag.js
require('dotenv').config();
const { searchKnowledge } = require('./ragSearch');

async function test() {
  console.log('Testing RAG...');
  const results = await searchKnowledge('daun padi kuning penyakit');
  console.log(`Found ${results.length} chunks:`);
  results.forEach((chunk, i) => {
    console.log(`\n[${i+1}] ${chunk.substring(0, 200)}...`);
  });
}

test();