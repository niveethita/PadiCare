const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

async function orchestrate(message, hasImage, history) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: { maxOutputTokens: 300 }
  });

  const ORCHESTRATOR_PROMPT = `You are PadiCare's Intent Classification System.
Analyze the farmer's message and return ONLY valid JSON.

INTENT CATEGORIES:
1. "crop_disease" - sick plants, pests, yellow/brown spots, wilting
2. "plan" - farming schedules, planning, fertilization timing
3. "market" - prices, selling, market trends, FAMA prices
4. "general" - general questions, greetings

RULES:
- Image attached = always "crop_disease"
- "harga"/"jual"/"pasaran" = "market"
- "jadual"/"rancang"/"tanam" = "plan"
- symptoms like "kuning"/"bintik"/"layu"/"rosak" = "crop_disease"

Return ONLY this JSON:
{
  "intent": "crop_disease|plan|market|general",
  "confidence": 0.0-1.0,
  "extracted_entities": {
    "crop_type": "padi/sayur/jagung or null",
    "symptoms": [],
    "location": null,
    "land_size": null,
    "budget": null,
    "timeframe": null
  }
}

Message: "${message}"
Has image: ${hasImage ? 'yes' : 'no'}
Return ONLY JSON, no markdown.`;

  try {
    const result = await retryWithBackoff(() =>
      model.generateContent(ORCHESTRATOR_PROMPT)
    );
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (hasImage) {
        parsed.intent = 'crop_disease';
        parsed.confidence = Math.max(parsed.confidence, 0.95);
      }
      return {
        intent: parsed.intent || 'general',
        confidence: parsed.confidence || 0.5,
        extracted_entities: parsed.extracted_entities || {}
      };
    }
    throw new Error('Invalid JSON');
  } catch (error) {
    console.error('Orchestrator error:', error.message);
    const msg = message.toLowerCase();
    let intent = 'general';
    let confidence = 0.5;
    if (hasImage || msg.includes('kuning') || msg.includes('bintik') || msg.includes('layu') || msg.includes('rosak')) {
      intent = 'crop_disease'; confidence = 0.8;
    } else if (msg.includes('harga') || msg.includes('jual') || msg.includes('pasaran')) {
      intent = 'market'; confidence = 0.8;
    } else if (msg.includes('jadual') || msg.includes('rancang') || msg.includes('tanam')) {
      intent = 'plan'; confidence = 0.7;
    }
    return {
      intent, confidence,
      extracted_entities: {
        crop_type: msg.includes('padi') ? 'padi' : null,
        symptoms: [], location: null, land_size: null, budget: null, timeframe: null
      }
    };
  }
}

module.exports = { orchestrate, retryWithBackoff };