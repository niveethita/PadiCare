const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agent 1: Crop Doctor
 * Analyzes crop images and symptoms to diagnose diseases
 * Returns structured diagnosis with treatment steps
 */
async function cropDoctor(imageBase64, textDescription, history) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const CROP_DOCTOR_PROMPT = `You are PadiCare's Crop Doctor, an expert plant pathologist specializing in Malaysian agriculture.

Your task: Analyze the crop image and/or description to provide a diagnosis.

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "disease_name": "scientific or common name of disease/pest",
  "confidence": 0.0-1.0,
  "severity": "mild|moderate|severe",
  "explanation_bm": "explanation in Bahasa Malaysia about what the disease is",
  "treatment_steps": [
    "step 1 in Bahasa Malaysia",
    "step 2 in Bahasa Malaysia",
    "step 3 in Bahasa Malaysia"
  ],
  "prevention_tips": [
    "prevention tip 1 in Bahasa Malaysia",
    "prevention tip 2 in Bahasa Malaysia"
  ],
  "urgency": "immediate|within_3_days|within_week|not_urgent",
  "recommended_products": ["product 1", "product 2"],
  "when_to_consult_expert": "conditions when they should see DOA officer"
}

DIAGNOSIS GUIDELINES:
- Be specific about the disease name (e.g., "Penyakit Hawar Daun Bakteria" not just "sakit")
- Severity based on visible damage:
  * mild = early stage, few affected plants
  * moderate = spreading, some yield impact
  * severe = widespread, major yield loss risk
- Treatment steps must be actionable and practical for farmers
- Always use Bahasa Malaysia for farmer-facing content
- If unsure, express lower confidence and suggest expert consultation

Common Malaysian rice diseases to recognize:
- Penyakit Blast Padi (neck blast, leaf blast)
- Hawar Daun Bakteria (bacterial leaf blight)
- Hawar Daun Perang (brown spot)
- Kuning Kerdil (tungro virus - yellow orange leaves)
- Putih Beras (rice white tip nematode)
- Busuk Batang (stem rot)
- Padi Angin (lodging/falling)`;

  try {
    let result;

    if (imageBase64) {
      // Analyze image with vision model
      const imageData = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg'
        }
      };

      result = await model.generateContent([
        CROP_DOCTOR_PROMPT,
        imageData,
        textDescription ? `User description: ${textDescription}` : ''
      ]);
    } else {
      // Text-only diagnosis (flash handles both text and vision)
      result = await model.generateContent(
        `${CROP_DOCTOR_PROMPT}\n\nUser description of symptoms: ${textDescription}`
      );
    }

    const response = result.response.text();

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const diagnosis = JSON.parse(jsonMatch[0]);

      // Format human-readable reply
      const reply = formatDiagnosisReply(diagnosis);

      return {
        reply,
        structured_data: diagnosis
      };
    }

    throw new Error('Invalid JSON from Crop Doctor');

  } catch (error) {
    console.error('Crop Doctor error:', error);
    return {
      reply: `Maaf, saya menghadapi masalah semasa menganalisis tanaman anda. Sila cuba lagi atau hubungi pegawai pertanian terdekat untuk bantuan lanjut.\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function formatDiagnosisReply(diagnosis) {
  const urgencyMap = {
    'immediate': 'Segera',
    'within_3_days': 'Dalam 3 hari',
    'within_week': 'Dalam seminggu',
    'not_urgent': 'Tidak mendesak'
  };

  let reply = `**Diagnosis: ${diagnosis.disease_name}**\n\n`;
  reply += `${diagnosis.explanation_bm}\n\n`;
  reply += `**Paras Keparahan:** ${diagnosis.severity}\n`;
  reply += `**Keperluan Tindakan:** ${urgencyMap[diagnosis.urgency] || diagnosis.urgency}\n\n`;
  reply += `**Langkah-Langkah Rawatan:**\n`;
  diagnosis.treatment_steps.forEach((step, i) => {
    reply += `${i + 1}. ${step}\n`;
  });

  if (diagnosis.prevention_tips && diagnosis.prevention_tips.length > 0) {
    reply += `\n**Tips Pencegahan:**\n`;
    diagnosis.prevention_tips.forEach((tip, i) => {
      reply += `• ${tip}\n`;
    });
  }

  if (diagnosis.when_to_consult_expert) {
    reply += `\n**Bila Perlu Rujuk Pakar:** ${diagnosis.when_to_consult_expert}`;
  }

  return reply;
}

module.exports = { cropDoctor };
