const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Retry wrapper for rate-limited API calls
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`Rate limited. Retrying in ${delay.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Unified Chat Handler
 * Determines intent AND generates response in a SINGLE API call
 * Returns: { intent, reply, structured_data, confidence }
 */
async function unifiedChat(message, imageBase64, location) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Determine which prompt to use based on message content (rule-based pre-filter)
  const msg = message.toLowerCase();
  const hasImage = !!imageBase64;
  const mentionsPrice = msg.includes('harga') || msg.includes('jual') || msg.includes('pasaran');
  const mentionsPlan = msg.includes('jadual') || msg.includes('rancang') || msg.includes('bila tanam') || msg.includes('tanam');
  const mentionsDisease = hasImage || msg.includes('kuning') || msg.includes('bintik') || msg.includes('layu') || msg.includes('rosak') || msg.includes('penyakit') || msg.includes('sakit');

  let intent = 'general';
  if (mentionsDisease) intent = 'crop_disease';
  else if (mentionsPrice) intent = 'market';
  else if (mentionsPlan) intent = 'plan';

  // Build the unified prompt
  const UNIFIED_PROMPT = `You are PadiCare, a Malaysian agriculture expert assistant for farmers.

TASK: Analyze the farmer's message and provide a complete response in Bahasa Malaysia.

DETECTED INTENT: "${intent}"
${hasImage ? 'IMAGE ATTACHED: Yes (analyze the image for crop disease)' : ''}
${location ? `FARMER LOCATION: ${location}` : ''}

INTENT-SPECIFIC INSTRUCTIONS:

${intent === 'crop_disease' ? `CROP DISEASE ANALYSIS:
- Diagnose the disease from image and/or description
- Provide treatment steps in Bahasa Malaysia
- Return structured data:
{
  "disease_name": "name of disease",
  "severity": "mild|moderate|severe",
  "explanation_bm": "explanation in BM",
  "treatment_steps": ["step 1", "step 2", "step 3"],
  "prevention_tips": ["tip 1", "tip 2"],
  "urgency": "immediate|within_3_days|within_week|not_urgent",
  "when_to_consult_expert": "when to see expert"
}

Common diseases: Penyakit Blast Padi, Hawar Daun Bakteria, Hawar Daun Perang, Kuning Kerdil (tungro).` : ''}

${intent === 'market' ? `MARKET ADVICE:
- Analyze if farmer should sell now, wait, or hold
- Provide price estimates and trends
- Return structured data:
{
  "recommendation": "sell_now|wait|hold",
  "current_price_per_kg": number,
  "price_trend": "rising|stable|falling",
  "market_summary": "summary in BM",
  "detailed_advice": "detailed advice in BM",
  "optimal_selling_window": "when to sell",
  "price_forecast": {"next_week": "higher|similar|lower", "next_month": "higher|similar|lower"},
  "factors_affecting_price": ["factor 1", "factor 2"],
  "selling_tips": ["tip 1", "tip 2"]
}

Price ranges: Padi RM 2.50-3.20/kg, Jagung RM 1.80-2.50/kg, Sayur RM 3.00-5.00/kg.` : ''}

${intent === 'plan' ? `FARM PLANNING:
- Create week-by-week farming schedule
- Include cost estimates in RM
- Return structured data:
{
  "plan_summary": "summary in BM",
  "crop_recommendation": "crop variety",
  "planting_month": "best month",
  "estimated_duration_weeks": number,
  "total_estimated_cost_rm": number,
  "expected_yield_ton": number,
  "schedule": [
    {"week": 1, "phase": "Preparation", "tasks": ["task 1", "task 2"], "materials_needed": ["material"], "estimated_cost_rm": number, "notes": "notes"}
  ],
  "critical_reminders": ["reminder 1", "reminder 2"],
  "risk_factors": ["risk 1", "risk 2"]
}

Default: Padi, 1 hectare, RM 3000-5000 budget.` : ''}

${intent === 'general' ? `GENERAL RESPONSE:
- Answer general agriculture questions
- Be friendly, practical, and clear
- structured_data can be null` : ''}

REQUIRED OUTPUT FORMAT:
Return ONLY a JSON object like this:
{
  "intent": "${intent}",
  "confidence": 0.0-1.0,
  "reply": "Your full response in Bahasa Malaysia with formatting using **bold** and emojis",
  "structured_data": { /* the appropriate structured data based on intent above, or null for general */ }
}

Rules:
- ALWAYS respond in Bahasa Malaysia
- Be friendly and practical
- If unsure, lower the confidence and suggest consulting an expert
- Format the reply with **bold headers**, bullet points, and emojis for readability`;

  try {
    let result;

    if (imageBase64) {
      // Image + text input
      const imageData = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg'
        }
      };

      result = await retryWithBackoff(() => model.generateContent([
        UNIFIED_PROMPT,
        imageData,
        `Farmer message: "${message}"`
      ]));
    } else {
      // Text only
      result = await retryWithBackoff(() => model.generateContent(
        `${UNIFIED_PROMPT}\n\nFarmer message: "${message}"`
      ));
    }

    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: parsed.intent || intent,
        confidence: parsed.confidence || 0.7,
        reply: parsed.reply || formatSimpleReply(intent, message),
        structured_data: parsed.structured_data || null
      };
    }

    throw new Error('Invalid JSON response');

  } catch (error) {
    console.error('Unified chat error:', error.message);

    // Graceful fallback
    return {
      intent,
      confidence: 0.5,
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
