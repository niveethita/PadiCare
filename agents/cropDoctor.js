const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../orchestrator');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function cropDoctor(imageBase64, textDescription, history) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: 800 }
  });

  const PROMPT = `You are PadiCare's Crop Doctor, expert in Malaysian agriculture.
Analyze the crop image and/or description and return ONLY valid JSON:
{
  "disease_name": "name of disease",
  "confidence": 0.0-1.0,
  "severity": "mild|moderate|severe",
  "explanation_bm": "explanation in Bahasa Malaysia",
  "treatment_steps": ["step 1 in BM", "step 2 in BM", "step 3 in BM"],
  "prevention_tips": ["tip 1 in BM", "tip 2 in BM"],
  "urgency": "immediate|within_3_days|within_week|not_urgent",
  "recommended_products": ["product 1", "product 2"],
  "when_to_consult_expert": "when to see DOA officer"
}
Common diseases: Penyakit Blast Padi, Hawar Daun Bakteria, Hawar Daun Perang, Kuning Kerdil, Busuk Batang.
Always use Bahasa Malaysia for all text fields.`;

  try {
    let result;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      result = await retryWithBackoff(() => model.generateContent([
        PROMPT,
        { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
        textDescription ? `User description: ${textDescription}` : 'Analyze this crop image.'
      ]));
    } else {
      result = await retryWithBackoff(() => model.generateContent(
        `${PROMPT}\n\nUser description: ${textDescription}`
      ));
    }

    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const diagnosis = JSON.parse(jsonMatch[0]);
      return { reply: formatDiagnosisReply(diagnosis), structured_data: diagnosis };
    }
    throw new Error('Invalid JSON from Crop Doctor');
  } catch (error) {
    console.error('Crop Doctor error:', error.message);
    return {
      reply: `Maaf, saya menghadapi masalah semasa menganalisis tanaman anda. Sila cuba lagi.\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function formatDiagnosisReply(diagnosis) {
  const urgencyMap = {
    'immediate': 'Segera', 'within_3_days': 'Dalam 3 hari',
    'within_week': 'Dalam seminggu', 'not_urgent': 'Tidak mendesak'
  };
  let reply = `**Diagnosis: ${diagnosis.disease_name}**\n\n`;
  reply += `${diagnosis.explanation_bm}\n\n`;
  reply += `**Keparahan:** ${diagnosis.severity}\n`;
  reply += `**Tindakan:** ${urgencyMap[diagnosis.urgency] || diagnosis.urgency}\n\n`;
  reply += `**Langkah Rawatan:**\n`;
  diagnosis.treatment_steps.forEach((step, i) => { reply += `${i + 1}. ${step}\n`; });
  if (diagnosis.prevention_tips?.length > 0) {
    reply += `\n**Tips Pencegahan:**\n`;
    diagnosis.prevention_tips.forEach(tip => { reply += `• ${tip}\n`; });
  }
  if (diagnosis.when_to_consult_expert) {
    reply += `\n**Bila Rujuk Pakar:** ${diagnosis.when_to_consult_expert}`;
  }
  return reply;
}

module.exports = { cropDoctor };