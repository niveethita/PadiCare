const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Agent 2: Farm Planner
 * Creates week-by-week farming schedules based on inputs
 */
async function farmPlanner(entities, history) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const FARM_PLANNER_PROMPT = `You are PadiCare's Farm Planning Expert.

Your task: Create a detailed week-by-week farming schedule for Malaysian farmers.

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "plan_summary": "brief summary in Bahasa Malaysia",
  "crop_recommendation": "recommended crop variety",
  "planting_month": "best month to start",
  "estimated_duration_weeks": number,
  "total_estimated_cost_rm": number,
  "expected_yield_ton": number,
  "schedule": [
    {
      "week": 1,
      "phase": "Preparation|Pembajaan|Pengurusan Air|Penuaian",
      "tasks": ["task 1 in BM", "task 2 in BM"],
      "materials_needed": ["material 1", "material 2"],
      "estimated_cost_rm": number,
      "notes": "important notes in BM"
    }
  ],
  "critical_reminders": ["reminder 1 in BM", "reminder 2 in BM"],
  "risk_factors": ["risk 1 in BM", "risk 2 in BM"]
}

PLANNING GUIDELINES:
- Adapt recommendations for Malaysian climate (tropical, two planting seasons)
- Include specific local practices: pembajaan, kawalan rumpai, kawalan air
- Cost estimates in Malaysian Ringgit (RM)
- Consider water management for padi cultivation
- Include pest management checkpoints
- Add harvesting and post-harvest handling

DEFAULT VALUES (if entities incomplete):
- Crop: Padi (if not specified)
- Land size: 1 hectare
- Budget: Moderate (RM 3000-5000 per hectare for padi)
- Water: Assume adequate irrigation
- Location: General Malaysia (consider both wet and dry seasons)

SEASONS:
- Musim Monsun Timur (Nov-Feb): Main padi season
- Musim Monsun Barat (Mac-Mei): Secondary season
- Adjust schedule based on current month`;

  try {
    // Build context from entities
    const context = buildPlanningContext(entities);

    const result = await model.generateContent(
      `${FARM_PLANNER_PROMPT}\n\n${context}\n\nCreate the farming schedule based on these inputs.`
    );

    const response = result.response.text();

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);

      // Format human-readable reply
      const reply = formatPlanReply(plan);

      return {
        reply,
        structured_data: plan
      };
    }

    throw new Error('Invalid JSON from Farm Planner');

  } catch (error) {
    console.error('Farm Planner error:', error);
    return {
      reply: `Maaf, saya menghadapi masalah semasa membuat pelan penanaman. Sila cuba lagi dengan maklumat yang lebih lengkap (cth: saiz tanah, jenis tanaman, bajet).\n\n(Error: ${error.message})`,
      structured_data: null
    };
  }
}

function buildPlanningContext(entities) {
  const parts = [];

  if (entities.crop_type) parts.push(`Crop: ${entities.crop_type}`);
  if (entities.land_size) parts.push(`Land size: ${entities.land_size}`);
  if (entities.budget) parts.push(`Budget: ${entities.budget}`);
  if (entities.location) parts.push(`Location: ${entities.location}`);
  if (entities.timeframe) parts.push(`Timeframe: ${entities.timeframe}`);

  if (parts.length === 0) {
    return 'User wants general farming advice/plan. Use default values.';
  }

  return parts.join('\n');
}

function formatPlanReply(plan) {
  let reply = `**Pelan Penanaman: ${plan.crop_recommendation}**\n\n`;
  reply += `${plan.plan_summary}\n\n`;
  reply += `**Masa Tanam:** ${plan.planting_month}\n`;
  reply += `**Jangka Masa:** ${plan.estimated_duration_weeks} minggu\n`;
  reply += `**Kos Anggaran:** RM ${plan.total_estimated_cost_rm}\n`;
  reply += `**Anggaran Hasil:** ${plan.expected_yield_ton} tan\n\n`;

  reply += `**Jadual Mingguan:**\n`;
  reply += `─`.repeat(40) + '\n';

  plan.schedule.forEach(week => {
    reply += `\n**Minggu ${week.week} - ${week.phase}**\n`;
    reply += `Tugas:\n`;
    week.tasks.forEach(task => {
      reply += `  • ${task}\n`;
    });
    reply += `Bahan Diperlukan: ${week.materials_needed.join(', ')}\n`;
    reply += `Kos: RM ${week.estimated_cost_rm}\n`;
    if (week.notes) {
      reply += `Nota: ${week.notes}\n`;
    }
  });

  if (plan.critical_reminders && plan.critical_reminders.length > 0) {
    reply += `\n**Peringatan Penting:**\n`;
    plan.critical_reminders.forEach(reminder => {
      reply += `⚠ ${reminder}\n`;
    });
  }

  if (plan.risk_factors && plan.risk_factors.length > 0) {
    reply += `\n**Faktor Risiko:**\n`;
    plan.risk_factors.forEach(risk => {
      reply += `• ${risk}\n`;
    });
  }

  return reply;
}

module.exports = { farmPlanner };
