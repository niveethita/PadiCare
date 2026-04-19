require('dotenv').config();
const { orchestrate } = require('./orchestrator');

// Test cases representing different farmer queries
const testCases = [
  // Crop Disease cases
  { message: "Daun padi saya kuning di tepi", hasImage: false, expected: "crop_disease" },
  { message: "Pokok saya ada bintik hitam", hasImage: false, expected: "crop_disease" },
  { message: "Tanaman saya layu", hasImage: false, expected: "crop_disease" },
  { message: "Ada serangga merosakkan daun", hasImage: false, expected: "crop_disease" },
  { message: "Gambar tanaman sakit", hasImage: true, expected: "crop_disease" },

  // Planning cases
  { message: "Bila saya patut tanam padi untuk musim ini?", hasImage: false, expected: "plan" },
  { message: "Saya ada 2 hektar tanah, nak tanam sayur", hasImage: false, expected: "plan" },
  { message: "Bagaimana nak rancang penanaman jagung?", hasImage: false, expected: "plan" },
  { message: "Berapa bajet diperlukan untuk tanam padi 1 ekar?", hasImage: false, expected: "plan" },

  // Market cases
  { message: "Berapa harga beras hari ini di Kedah?", hasImage: false, expected: "market" },
  { message: "Bila masa terbaik untuk jual hasil tani?", hasImage: false, expected: "market" },
  { message: "Harga pasaran untuk jagung sekilo", hasImage: false, expected: "market" },
  { message: "Patut saya simpan atau jual padi sekarang?", hasImage: false, expected: "market" },

  // General cases
  { message: "Selamat pagi", hasImage: false, expected: "general" },
  { message: "Terima kasih", hasImage: false, expected: "general" },
  { message: "Apa itu PadiCare?", hasImage: false, expected: "general" },
  { message: "Bagaimana cuaca hari ini?", hasImage: false, expected: "general" },
];

async function runTests() {
  console.log('🧪 Testing PadiCare Orchestrator\n');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\nTest ${i + 1}/${testCases.length}:`);
    console.log(`  Message: "${test.message}"`);
    console.log(`  Has image: ${test.hasImage}`);
    console.log(`  Expected: ${test.expected}`);

    try {
      const result = await orchestrate(test.message, test.hasImage, []);
      const isCorrect = result.intent === test.expected;

      console.log(`  Result: ${result.intent}`);
      console.log(`  Confidence: ${result.confidence}`);
      console.log(`  Reasoning: ${result.reasoning}`);
      console.log(`  Entities: ${JSON.stringify(result.extracted_entities)}`);
      console.log(`  Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);

      if (isCorrect) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      console.log(`  Status: ❌ ERROR`);
      failed++;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
  console.log(`   Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
}

// Check for API key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY not found in environment');
  console.log('Please create a .env file with your API key:');
  console.log('GEMINI_API_KEY=your_key_here\n');
  process.exit(1);
}

runTests().catch(console.error);
