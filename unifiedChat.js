const { orchestrate } = require('./orchestrator');
const { routeToAgent } = require('./agents');
const { searchKnowledge } = require('./ragSearch');

/**
 * Unified Chat Handler
 * 1. Orchestrator classifies intent
 * 2. RAG fetches relevant knowledge
 * 3. Agent generates response with RAG context injected
 */
async function unifiedChat(message, imageBase64, location, history = []) {
  try {
    // Step 1: Classify intent and extract entities
    console.log('Orchestrator analyzing message...');
    const orchestration = await orchestrate(message, !!imageBase64, history);
    console.log('Intent:', orchestration.intent, '| Confidence:', orchestration.confidence);

    // Step 2: RAG — fetch relevant knowledge chunks
    let ragContext = '';
    try {
      const chunks = await searchKnowledge(message);
      if (chunks.length > 0) {
        ragContext = [
          '--- Maklumat rujukan dari Jabatan Pertanian Malaysia (DOA) ---',
          ...chunks.map((chunk, i) => `[${i + 1}] ${chunk}`),
          '--- Gunakan maklumat di atas sebagai rujukan utama ---',
        ].join('\n\n');
        console.log('RAG context injected:', chunks.length, 'chunks');
      } else {
        console.log('RAG: No chunks found, Gemini will answer from training data');
      }
    } catch (ragError) {
      console.warn('RAG unavailable, continuing without context:', ragError.message);
    }

    // Step 3: Route to agent — now WITH ragContext passed in
    const agentResult = await routeToAgent(orchestration.intent, {
      message,
      imageBase64,
      entities: orchestration.extracted_entities,
      history,        // ← conversation memory
      location,
      ragContext,     // ← RAG knowledge injected here
    });

    return {
      intent: orchestration.intent,
      confidence: orchestration.confidence,
      reply: agentResult.reply,
      structured_data: agentResult.structured_data,
    };

  } catch (error) {
    console.error('Unified chat error:', error.message);

    // Rule-based fallback intent detection
    const msg = (message || '').toLowerCase();
    let intent = 'general';
    if (imageBase64 || msg.includes('kuning') || msg.includes('bintik') || msg.includes('layu')) {
      intent = 'crop_disease';
    } else if (msg.includes('harga') || msg.includes('jual') || msg.includes('pasaran')) {
      intent = 'market';
    } else if (msg.includes('jadual') || msg.includes('rancang') || msg.includes('tanam')) {
      intent = 'plan';
    }

    return {
      intent,
      confidence: 0.3,
      reply: formatSimpleReply(intent, message),
      structured_data: null,
    };
  }
}

function formatSimpleReply(intent, message) {
  const msg = (message || '').toLowerCase();

  if (intent === 'crop_disease') {
    return `**Analisis Penyakit Tanaman**\n\nBerdasarkan penerangan anda, saya mengesan kemungkinan masalah penyakit. Untuk diagnosis tepat:\n\n1. **Ambil gambar** daun/batang yang rosak\n2. **Terangkan simptom** dengan detail\n3. Saya akan cadangkan rawatan sesuai\n\n_Jika masalah serius, sila hubungi pegawai pertanian terdekat._`;
  }
  if (intent === 'market') {
    const crop = msg.includes('jagung') ? 'Jagung' : msg.includes('sayur') ? 'Sayur' : 'Padi';
    return `**Analisis Pasaran: ${crop}**\n\n**Harga Semasa (anggaran):**\n• ${crop}: RM 2.50 - 3.20/kg\n\nSila semak harga terkini di:\n• www.fama.gov.my\n• Aplikasi i-FAMA`;
  }
  if (intent === 'plan') {
    return `**Pelan Penanaman Asas**\n\nSila nyatakan:\n• Jenis tanaman\n• Saiz tanah\n• Bajet yang ada\n\nSaya akan hasilkan pelan terperinci untuk anda.`;
  }
  return `**Selamat datang ke PadiCare!** 🌾\n\nSaya boleh bantu dengan:\n\n🌱 **Penyakit tanaman** — hantar gambar atau hurai simptom\n💰 **Harga pasaran** — semak harga semasa\n📅 **Jadual tanam** — perancangan musim\n\nApa yang boleh saya bantu?`;
}

module.exports = { unifiedChat };
