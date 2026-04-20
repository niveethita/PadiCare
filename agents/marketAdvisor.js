const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../orchestrator');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function marketAdvisor(cropType, location, history) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: 800 }
  });

  const PROMPT = `You are PadiCare's Market Expert for Malaysian farmers.
Analyze market and recommend sell_now, wait, or hold. Return ONLY valid JSON:
{
  "recommendation": "sell_now|wait|hold",
  "confidence": 0.0-1.0,
  "current_price_per_kg": number,
  "price_trend": "rising|stable|falling",
  "market_summary": "summary in BM",
  "detailed_advice": "advice in BM",
  "optimal_selling_window": "when to sell in BM",
  "price_forecast": {"next_week": "higher|similar|lower", "next_month": "higher|similar|lower"},
  "factors_affecting_price": ["factor in BM"],
  "selling_tips": ["tip in BM"]
}
Prices: Padi RM2.50-3.20/kg, Jagung RM1.80-2.50/kg, Cabai RM8-15/kg, Tomato RM2.50-4/kg.`;

  try {
    const famaData = getMockFAMAData(cropType, location);
    const result = await retryWithBackoff(() => model.generateContent(
      `${PROMPT}\n\nCrop: ${cropType}\nLocation: ${location || 'Malaysia'}\nFAMA Data: ${JSON.stringify(famaData)}`
    ));

    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const market = JSON.parse(jsonMatch[0]);
      return { reply: formatMarketReply(market, famaData), structured_data: market };
    }
    throw new Error('Invalid JSON from Market Advisor');
  } catch (error) {
    console.error('Market Advisor error:', error.message);
    return {
      reply: `Maaf, maklumat pasaran tidak tersedia. Sila semak www.fama.gov.my\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function getMockFAMAData(cropType, location) {
  const prices = {
    'padi': { current: 2.85, trend: 'stable', grade: 'Grade A' },
    'beras': { current: 2.85, trend: 'stable', grade: 'Grade A' },
    'jagung': { current: 2.20, trend: 'rising', grade: 'Manis' },
    'sawi': { current: 3.80, trend: 'falling', grade: 'Segar' },
    'cabai': { current: 11.50, trend: 'rising', grade: 'Merah' },
    'tomato': { current: 3.20, trend: 'stable', grade: 'Segar' }
  };
  const price = prices[cropType?.toLowerCase()] || { current: 3.00, trend: 'stable', grade: 'Standard' };
  return {
    crop: cropType, location: location || 'Semenanjung Malaysia',
    current_price_rm_per_kg: price.current, price_trend: price.trend,
    grade: price.grade, last_updated: new Date().toISOString()
  };
}

function formatMarketReply(market, famaData) {
  const recMap = { 'sell_now': 'Jual Sekarang', 'wait': 'Tunggu', 'hold': 'Pantau' };
  let reply = `**Analisis Pasaran: ${famaData.crop}**\n\n`;
  reply += `**Harga:** RM ${famaData.current_price_rm_per_kg.toFixed(2)}/kg\n`;
  reply += `**Trend:** ${famaData.price_trend === 'rising' ? 'Naik ↑' : famaData.price_trend === 'falling' ? 'Turun ↓' : 'Stabil →'}\n\n`;
  reply += `**Cadangan:** ${recMap[market.recommendation] || market.recommendation}\n\n`;
  reply += `${market.market_summary}\n\n${market.detailed_advice}\n\n`;
  if (market.selling_tips?.length > 0) {
    reply += `**Tips:**\n`;
    market.selling_tips.forEach(t => { reply += `💡 ${t}\n`; });
  }
  return reply;
}

module.exports = { marketAdvisor };