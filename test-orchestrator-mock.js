// Mock test for orchestrator - simulates responses without API calls

// Simple rule-based classifier (mimics what Gemini would do)
function mockOrchestrate(message, hasImage) {
  const msg = message.toLowerCase();

  // Rule 1: Image always = crop_disease
  if (hasImage) {
    return {
      intent: 'crop_disease',
      confidence: 0.98,
      extracted_entities: {
        crop_type: extractCropType(msg),
        symptoms: ['visible in image'],
        location: null, land_size: null, budget: null, timeframe: null
      },
      reasoning: 'Image attached, defaulting to crop_disease agent'
    };
  }

  // Rule 2: Disease keywords
  const diseaseKeywords = ['kuning', 'bintik', 'layu', 'serangga', 'sakit', 'rosak', 'kulat', 'bercak', 'hawar'];
  if (diseaseKeywords.some(k => msg.includes(k))) {
    return {
      intent: 'crop_disease',
      confidence: 0.92,
      extracted_entities: {
        crop_type: extractCropType(msg),
        symptoms: diseaseKeywords.filter(k => msg.includes(k)),
        location: null, land_size: null, budget: null, timeframe: null
      },
      reasoning: `Found disease keywords: ${diseaseKeywords.filter(k => msg.includes(k)).join(', ')}`
    };
  }

  // Rule 3: Planning keywords
  const planKeywords = ['tanam', 'rancang', 'bila', 'jadual', 'bajet', 'kos', 'hektar', 'ekar', 'musim'];
  if (planKeywords.some(k => msg.includes(k))) {
    return {
      intent: 'plan',
      confidence: 0.88,
      extracted_entities: {
        crop_type: extractCropType(msg),
        symptoms: [],
        location: extractLocation(msg),
        land_size: extractLandSize(msg),
        budget: extractBudget(msg),
        timeframe: extractTimeframe(msg)
      },
      reasoning: `Found planning keywords: ${planKeywords.filter(k => msg.includes(k)).join(', ')}`
    };
  }

  // Rule 4: Market keywords
  const marketKeywords = ['harga', 'jual', 'pasaran', 'simpan', 'tunggu', 'beras', 'se kilo', 'rm'];
  if (marketKeywords.some(k => msg.includes(k))) {
    return {
      intent: 'market',
      confidence: 0.90,
      extracted_entities: {
        crop_type: extractCropType(msg),
        symptoms: [],
        location: extractLocation(msg),
        land_size: null, budget: null, timeframe: null
      },
      reasoning: `Found market keywords: ${marketKeywords.filter(k => msg.includes(k)).join(', ')}`
    };
  }

  // Default: general
  return {
    intent: 'general',
    confidence: 0.85,
    extracted_entities: { crop_type: null, symptoms: [], location: null, land_size: null, budget: null, timeframe: null },
    reasoning: 'No specific agricultural intent detected'
  };
}

// Helper extraction functions
function extractCropType(msg) {
  const crops = ['padi', 'beras', 'jagung', 'sayur', 'sawi', 'tomato', 'cili', 'cabai', 'durian'];
  for (const crop of crops) {
    if (msg.includes(crop)) return crop;
  }
  return null;
}

function extractLocation(msg) {
  const states = ['kedah', 'kelantan', 'terengganu', 'pahang', 'johor', 'selangor', 'perak', 'perlis', 'melaka', 'negeri sembilan', 'sabah', 'sarawak'];
  for (const state of states) {
    if (msg.includes(state)) return state;
  }
  return null;
}

function extractLandSize(msg) {
  const match = msg.match(/(\d+)\s*(hektar|ekar|ha)/);
  return match ? match[0] : null;
}

function extractBudget(msg) {
  const match = msg.match(/rm\s*(\d+)/);
  return match ? `RM ${match[1]}` : null;
}

function extractTimeframe(msg) {
  const timeKeywords = ['hari ini', 'minggu ini', 'bulan ini', 'musim ini', 'tahun ini'];
  for (const t of timeKeywords) {
    if (msg.includes(t)) return t;
  }
  return null;
}

// Test cases
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

// Run tests
console.log('🧪 Testing PadiCare Orchestrator (MOCK)\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

for (let i = 0; i < testCases.length; i++) {
  const test = testCases[i];
  console.log(`\nTest ${i + 1}/${testCases.length}:`);
  console.log(`  Message: "${test.message}"`);
  console.log(`  Has image: ${test.hasImage}`);
  console.log(`  Expected: ${test.expected}`);

  const result = mockOrchestrate(test.message, test.hasImage);
  const isCorrect = result.intent === test.expected;

  console.log(`  Result: ${result.intent}`);
  console.log(`  Confidence: ${result.confidence}`);
  console.log(`  Reasoning: ${result.reasoning}`);
  console.log(`  Entities: ${JSON.stringify(result.extracted_entities)}`);
  console.log(`  Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);

  if (isCorrect) passed++;
  else failed++;
}

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
console.log(`   Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

// Show routing summary
console.log('📋 Routing Summary:');
console.log('─'.repeat(70));
const intents = { crop_disease: [], plan: [], market: [], general: [] };
testCases.forEach(t => {
  intents[t.expected].push(t.message);
});

for (const [intent, messages] of Object.entries(intents)) {
  if (messages.length > 0) {
    console.log(`\n${intent.toUpperCase()}:`);
    messages.forEach(m => console.log(`  • ${m}`));
  }
}
