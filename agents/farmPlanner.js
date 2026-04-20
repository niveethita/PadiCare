const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../orchestrator');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function farmPlanner(entities, history) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { maxOutputTokens: 800 }
  });

  const PROMPT = `You are PadiCare's Farm Planning Expert for Malaysian farmers.
Create a week-by-week farming schedule. Return ONLY valid JSON:
{
  "plan_summary": "summary in BM",
  "crop_recommendation": "crop variety",
  "planting_month": "best month",
  "estimated_duration_weeks": number,
  "total_estimated_cost_rm": number,
  "expected_yield_ton": number,
  "schedule": [
    {"week": 1, "phase": "Persediaan", "tasks": ["task in BM"], "materials_needed": ["material"], "estimated_cost_rm": number, "notes": "notes in BM"}
  ],
  "critical_reminders": ["reminder in BM"],
  "risk_factors": ["risk in BM"]
}
Defaults: Padi, 1 hectare, RM 3000-5000 budget, tropical Malaysian climate.`;

  try {
    const context = Object.entries(entities || {})
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') || 'Use default values for 1 hectare padi farm.';

    const result = await retryWithBackoff(() => model.generateContent(
      `${PROMPT}\n\nFarmer inputs:\n${context}\n\nCreate the schedule now.`
    ));

    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);
      return { reply: formatPlanReply(plan), structured_data: plan };
    }
    throw new Error('Invalid JSON from Farm Planner');
  } catch (error) {
    console.error('Farm Planner error:', error.message);
    return {
      reply: `Maaf, saya menghadapi masalah membuat pelan. Sila cuba lagi.\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function formatPlanReply(plan) {
  let reply = `**Pelan Penanaman: ${plan.crop_recommendation}**\n\n${plan.plan_summary}\n\n`;
  reply += `**Masa Tanam:** ${plan.planting_month}\n`;
  reply += `**Jangka Masa:** ${plan.estimated_duration_weeks} minggu\n`;
  reply += `**Kos Anggaran:** RM ${plan.total_estimated_cost_rm}\n`;
  reply += `**Hasil Dijangka:** ${plan.expected_yield_ton} tan\n\n`;
  reply += `**Jadual:**\n${'─'.repeat(30)}\n`;
  plan.schedule.forEach(w => {
    reply += `\n**Minggu ${w.week} — ${w.phase}**\n`;
    w.tasks.forEach(t => { reply += `  • ${t}\n`; });
    reply += `Bahan: ${w.materials_needed.join(', ')}\n`;
    reply += `Kos: RM ${w.estimated_cost_rm}\n`;
    if (w.notes) reply += `Nota: ${w.notes}\n`;
  });
  if (plan.critical_reminders?.length > 0) {
    reply += `\n**Peringatan:**\n`;
    plan.critical_reminders.forEach(r => { reply += `⚠ ${r}\n`; });
  }
  return reply;
}

module.exports = { farmPlanner };