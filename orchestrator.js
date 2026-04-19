const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Orchestrator: Determines intent and extracts entities from farmer message
 * Returns: { intent, confidence, extracted_entities }
 */
async function orchestrate(message, hasImage, history) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const ORCHESTRATOR_PROMPT = `You are PadiCare's Intent Classification System.

Your job is to analyze the farmer's message and determine which specialist agent should handle it.

INTENT CATEGORIES:
1. "crop_disease" - Questions about sick plants, pests, yellow/brown spots, wilting, damaged crops
2. "plan" - Questions about farming schedules, planning, fertilization timing, crop rotation
3. "market" - Questions about prices, selling, when to sell, market trends, FAMA prices
4. "general" - General agriculture questions, greetings, or unclear queries

RULES:
- If the message mentions an image or photo, ALWAYS classify as "crop_disease"
- If the message mentions "harga" (price), "jual" (sell), "pasaran" (market), classify as "market"
- If the message mentions "jadual" (schedule), "rancang" (plan), "bila tanam" (when to plant), classify as "plan"
- If the message mentions disease symptoms (yellow leaves, spots, dying, "kuning", "bintik", "layu", "rosak"), classify as "crop_disease"

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "intent": "crop_disease|plan|market|general",
  "confidence": 0.0-1.0,
  "extracted_entities": {
    "crop_type": "detected crop (padi, sayur, jagung, etc.)",
    "symptoms": ["list of symptoms mentioned"],
    "location": "location if mentioned",
    "land_size": "size if mentioned",
    "budget": "budget if mentioned",
    "timeframe": "timeframe if mentioned"
  },
  "reasoning": "brief explanation of why this intent was chosen"
}

Examples:

Input: "Daun padi saya kuning di tepi"
Output: {"intent":"crop_disease","confidence":0.95,"extracted_entities":{"crop_type":"padi","symptoms":["daun kuning di tepi"],"location":null,"land_size":null,"budget":null,"timeframe":null},"reasoning":"Mentions padi crop with yellow leaf symptoms, classic crop disease query"}

Input: "Berapa harga beras hari ini di Kedah?"
Output: {"intent":"market","confidence":0.92,"extracted_entities":{"crop_type":"beras","symptoms":[],"location":"Kedah","land_size":null,"budget":null,"timeframe":"hari ini"},"reasoning":"Asks about price (harga) with location and crop specified"}

Input: "Bila saya patut tanam padi untuk musim ini?"
Output: {"intent":"plan","confidence":0.88,"extracted_entities":{"crop_type":"padi","symptoms":[],"location":null,"land_size":null,"budget":null,"timeframe":"musim ini"},"reasoning":"Asks about when to plant - this is planning/scheduling question"}

Input: "Selamat pagi"
Output: {"intent":"general","confidence":0.99,"extracted_entities":{"crop_type":null,"symptoms":[],"location":null,"land_size":null,"budget":null,"timeframe":null},"reasoning":"Simple greeting, no specific agricultural intent"}

Now analyze this farmer message:
"${message}"

Has image attached: ${hasImage ? 'yes' : 'no'}

Return ONLY the JSON response, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(ORCHESTRATOR_PROMPT);
    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // If image is present, force crop_disease
      if (hasImage) {
        parsed.intent = 'crop_disease';
        parsed.confidence = Math.max(parsed.confidence, 0.95);
      }

      return {
        intent: parsed.intent || 'general',
        confidence: parsed.confidence || 0.5,
        extracted_entities: parsed.extracted_entities || {},
        reasoning: parsed.reasoning || ''
      };
    }

    throw new Error('Invalid JSON response from Gemini');

  } catch (error) {
    console.error('Orchestrator error:', error);
    // Fallback to general if parsing fails
    return {
      intent: 'general',
      confidence: 0.3,
      extracted_entities: {},
      reasoning: 'Error in classification, falling back to general'
    };
  }
}

module.exports = { orchestrate };
