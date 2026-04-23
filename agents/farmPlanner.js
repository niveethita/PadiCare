const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff } = require('../orchestrator');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function farmPlanner(entities) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  });

  // -------------------------
  // STEP 1: SUMMARY (small)
  // -------------------------
  const SUMMARY_PROMPT = `
Return ONLY JSON:
{
  "crop": "Padi",
  "duration_weeks": number,
  "cost_rm": number,
  "yield_ton": number,
  "goal": "short description BM"
}

Context:
${Object.entries(entities || {})
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n') || "default padi farm"}
`;

  const summaryResult = await retryWithBackoff(() =>
    model.generateContent(SUMMARY_PROMPT)
  );

  const summary = JSON.parse(summaryResult.response.text());

  // -------------------------
  // STEP 2: SCHEDULE (small)
  // -------------------------
  const SCHEDULE_PROMPT = `
Return ONLY JSON:
{
  "schedule": [
    {
      "week": 1,
      "phase": "string",
      "tasks": ["short task"]
    }
  ]
}

Rules:
- Max ${summary.duration_weeks} weeks
- Max 3 tasks per week
- Short BM phrases only
`;

  const scheduleResult = await retryWithBackoff(() =>
    model.generateContent(SCHEDULE_PROMPT)
  );

  let schedule;
  try {
    schedule = JSON.parse(scheduleResult.response.text());
  } catch (e) {
    schedule = { schedule: [] };
  }

  const plan = {
    ...summary,
    schedule: schedule.schedule || []
  };

  return {
    reply: formatPlanReply(plan),
    structured_data: plan
  };
}

function formatPlanReply(plan) {
  let reply = `**Pelan Padi**\n\n`;

  reply += `Tempoh: ${plan.duration_weeks} minggu\n`;
  reply += `Kos: RM ${plan.cost_rm}\n`;
  reply += `Hasil: ${plan.yield_ton} tan\n\n`;

  reply += `**Jadual:**\n`;

  (plan.schedule || []).forEach(w => {
    reply += `\nM${w.week} - ${w.phase}\n`;
    (w.tasks || []).forEach(t => reply += `• ${t}\n`);
  });

  return reply;
}

module.exports = { farmPlanner };