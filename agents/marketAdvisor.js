const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../orchestrator');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agent 3: Market Advisor
 * Provides price recommendations and selling advice
 */
async function marketAdvisor(cropType, location, history) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const MARKET_ADVISOR_PROMPT = `You are PadiCare's Market Intelligence Expert.

Your task: Analyze market conditions and recommend whether farmers should sell now, wait, or hold their crops.

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "recommendation": "sell_now|wait|hold",
  "confidence": 0.0-1.0,
  "current_price_per_kg": number,
  "price_trend": "rising|stable|falling",
  "market_summary": "summary in Bahasa Malaysia",
  "detailed_advice": "detailed advice in Bahasa Malaysia",
  "optimal_selling_window": "when to sell",
  "price_forecast": {
    "next_week": "higher|similar|lower",
    "next_month": "higher|similar|lower"
  },
  "factors_affecting_price": [
    "factor 1 in BM",
    "factor 2 in BM"
  ],
  "selling_tips": [
    "tip 1 in BM",
    "tip 2 in BM"
  ],
  "alternative_options": [
    { "option": "option name", "description": "description in BM" }
  ]
}

PRICE DATA (hackathon demo - use these realistic ranges):
- Padi (beras): RM 2.50 - 3.20/kg depending on grade
- Jagung: RM 1.80 - 2.50/kg
- Sayur sawi: RM 3.00 - 5.00/kg
- Cabai: RM 8.00 - 15.00/kg
- Tomato: RM 2.50 - 4.00/kg

MARKET FACTORS:
- Festival seasons (Ramadan, CNY, Deepavali) = higher demand
- Harvest season = lower prices (oversupply)
- Weather disasters = price spikes
- Export demand affects local prices

RECOMMENDATION LOGIC:
- "sell_now" = prices are good, risk of falling
- "wait" = prices expected to rise soon
- "hold" = uncertain, monitor situation

Always explain your reasoning in Bahasa Malaysia for farmers.`;

  try {
    // Get mock FAMA data (replace with actual API in production)
    const famaData = getMockFAMAData(cropType, location);

    const result = await retryWithBackoff(() => model.generateContent(
      `${MARKET_ADVISOR_PROMPT}\n\nCrop: ${cropType}\nLocation: ${location || 'Malaysia'}\n\nCurrent FAMA Data:\n${JSON.stringify(famaData, null, 2)}\n\nProvide market recommendation.`
    ));

    const response = result.response.text();

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const market = JSON.parse(jsonMatch[0]);

      // Format human-readable reply
      const reply = formatMarketReply(market, famaData);

      return {
        reply,
        structured_data: market
      };
    }

    throw new Error('Invalid JSON from Market Advisor');

  } catch (error) {
    console.error('Market Advisor error:', error);
    return {
      reply: `Maaf, saya tidak dapat mengakses maklumat pasaran sekarang. Sila semak harga terkini di laman web FAMA atau hubungi pejabat FAMA berdekatan.\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function getMockFAMAData(cropType, location) {
  // Mock data for hackathon - replace with actual FAMA API calls
  const prices = {
    'padi': { current: 2.85, trend: 'stable', grade: 'Grade A' },
    'beras': { current: 2.85, trend: 'stable', grade: 'Grade A' },
    'jagung': { current: 2.20, trend: 'rising', grade: 'Manis' },
    'sawi': { current: 3.80, trend: 'falling', grade: 'Segar' },
    'cabai': { current: 11.50, trend: 'rising', grade: 'Merah' },
    'tomato': { current: 3.20, trend: 'stable', grade: 'Segar' }
  };

  const crop = cropType.toLowerCase();
  const price = prices[crop] || { current: 3.00, trend: 'stable', grade: 'Standard' };

  return {
    crop: cropType,
    location: location || 'Semenanjung Malaysia',
    current_price_rm_per_kg: price.current,
    price_trend: price.trend,
    grade: price.grade,
    last_updated: new Date().toISOString(),
    source: 'FAMA (mock data for demo)'
  };
}

function formatMarketReply(market, famaData) {
  const recommendationMap = {
    'sell_now': 'Jual Sekarang',
    'wait': 'Tunggu',
    'hold': 'Pantau'
  };

  let reply = `**Analisis Pasaran: ${famaData.crop}**\n\n`;

  reply += `**Harga Semasa:** RM ${famaData.current_price_rm_per_kg.toFixed(2)}/kg\n`;
  reply += `**Trend:** ${famaData.price_trend === 'rising' ? 'Naik ↑' : famaData.price_trend === 'falling' ? 'Turun ↓' : 'Stabil →'}\n`;
  reply += `**Gred:** ${famaData.grade}\n`;
  reply += `**Lokasi:** ${famaData.location}\n\n`;

  reply += `**Cadangan:** ${recommendationMap[market.recommendation] || market.recommendation}\n\n`;

  reply += `${market.market_summary}\n\n`;
  reply += `${market.detailed_advice}\n\n`;

  if (market.optimal_selling_window) {
    reply += `**Window Jualan Optimum:** ${market.optimal_selling_window}\n\n`;
  }

  if (market.price_forecast) {
    reply += `**Ramalan Harga:**\n`;
    reply += `• Minggu depan: ${market.price_forecast.next_week}\n`;
    reply += `• Bulan depan: ${market.price_forecast.next_month}\n\n`;
  }

  if (market.factors_affecting_price && market.factors_affecting_price.length > 0) {
    reply += `**Faktor yang Mempengaruhi Harga:**\n`;
    market.factors_affecting_price.forEach(factor => {
      reply += `• ${factor}\n`;
    });
    reply += '\n';
  }

  if (market.selling_tips && market.selling_tips.length > 0) {
    reply += `**Tips Menjual:**\n`;
    market.selling_tips.forEach(tip => {
      reply += `💡 ${tip}\n`;
    });
  }

  reply += `\n*Data dikemaskini: ${new Date(famaData.last_updated).toLocaleDateString('ms-MY')}*`;

  return reply;
}

module.exports = { marketAdvisor };
