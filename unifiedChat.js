const { orchestrate } = require('./orchestrator');
const { routeToAgent } = require('./agents');
const { searchKnowledge } = require('./ragSearch');

/**
 * Unified Chat Handler
 * Routes requests through orchestrator to appropriate agent
 * Returns: { intent, reply, structured_data, confidence }
 */

async function handleChat(userMessage, intent, sessionHistory) {
  
  // --- NEW: RAG lookup ---
  let ragContext = '';
  try {
    const chunks = await searchKnowledge(userMessage);
    if (chunks.length > 0) {
      ragContext = `
Maklumat rujukan dari Jabatan Pertanian Malaysia (DOA):
${chunks.map((chunk, i) => [`[${i+1}] ${chunk}`]).join('\n\n')}

Sila gunakan maklumat di atas sebagai rujukan utama dalam jawapan anda.
---
`;
    }
  } catch (e) {
    // RAG failed silently — Gemini still answers from training
    console.log('RAG unavailable, proceeding without context');
  }

  // --- Your existing Gemini call, now with RAG injected ---
  const prompt = `
${ragContext}
Soalan petani: ${userMessage}

Anda adalah PadiCare, pembantu pertanian pintar Malaysia. 
Jawab dalam Bahasa Malaysia. Berikan nasihat praktikal dan spesifik.
`;

}
  
async function unifiedChat(message, imageBase64, location, history = []) {
  try {
    // Step 1: Orchestrator determines intent and extracts entities
    console.log('Orchestrator analyzing message...');
    const orchestration = await orchestrate(message, !!imageBase64, history);
    console.log('Intent detected:', orchestration.intent, 'Confidence:', orchestration.confidence);

    // Step 2: Route to appropriate agent
    const agentResult = await routeToAgent(orchestration.intent, {
      message,
      imageBase64,
      entities: orchestration.extracted_entities,
      history,
      location
    });

    // Step 3: Return standardized response
    return {
      intent: orchestration.intent,
      confidence: orchestration.confidence,
      reply: agentResult.reply,
      structured_data: agentResult.structured_data
    };

  } catch (error) {
    console.error('Unified chat error:', error.message);

    // Graceful fallback using rule-based intent detection
    const msg = message.toLowerCase();
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
      structured_data: null
    };
  }
}

function formatSimpleReply(intent, message) {
  const msg = message.toLowerCase();

  if (intent === 'crop_disease') {
    return `**Analisis Penyakit Tanaman**\n\nBerdasarkan penerangan anda, saya mengesan kemungkinan masalah penyakit. Untuk diagnosis tepat:\n\n1. **Ambil gambar** daun/batang yang rosak\n2. **Terangkan simptom** dengan detail\n3. Saya akan cadangkan rawatan sesuai\n\n_Jika masalah serius, sila hubungi pegawai pertanian terdekat._`;
  }

  if (intent === 'market') {
    const crop = msg.includes('jagung') ? 'Jagung' : msg.includes('sayur') ? 'Sayur' : 'Padi';
    return `**Analisis Pasaran: ${crop}**\n\n**Harga Semasa (anggara):**\n• ${crop}: RM 2.50 - 3.20/kg\n\n**Cadangan:**\nSila semak harga terkini di:\n• Laman FAMA: www.fama.gov.my\n• Aplikasi i-FAMA\n• Pejabat FAMA berdekatan\n\n_Faktor yang mempengaruhi harga: musim menuai, permintaan eksport, cuaca._`;
  }

  if (intent === 'plan') {
    return `**Pelan Penanaman Asas**\n\n**Musim Tanam Utama:**\n• Monsun Timur (Nov-Feb) - sesuai untuk padi\n• Monsun Barat (Mac-Mei) - sesuai untuk sayur\n\n**Langkah Permulaan:**\n1. Sediakan tapak tanah\n2. Pilih benih berkualiti\n3. Rancang pembajaan\n4. Sedia sistem pengairan\n\n_Untuk pelan terperinci, sila nyatakan:\n• Jenis tanaman\n• Saiz tanah\n• Bajet yang ada_`;
  }

  return `**Selamat datang ke PadiCare!** 🌾\n\nSaya pembantu pertanian digital anda. Anda boleh tanya saya tentang:\n\n🌱 **Penyakit tanaman** - hantar gambar daun kuning, bintik, dll\n💰 **Harga pasaran** - bila nak jual, harga semasa\n📅 **Jadual tanam** - perancangan musim, pembajaan\n\nApa yang boleh saya bantu hari ini?`;
}

module.exports = { unifiedChat };
