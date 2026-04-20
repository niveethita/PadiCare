/**
 * PadiCare Agents Registry
 * Exports all specialist agents for the orchestrator to route to
 */

const { cropDoctor } = require('./cropDoctor');
const { farmPlanner } = require('./farmPlanner');
const { marketAdvisor } = require('./marketAdvisor');

/**
 * Route request to appropriate agent based on intent
 * @param {string} intent - detected intent from orchestrator
 * @param {object} params - { message, imageBase64, entities, history, location }
 * @returns {Promise<{reply: string, structured_data: object}>}
 */
async function routeToAgent(intent, params) {
  const { message, imageBase64, entities, history, location } = params;

  switch (intent) {
    case 'crop_disease':
      return await cropDoctor(imageBase64, message, history);

    case 'plan':
      return await farmPlanner(entities, history);

    case 'market':
      const cropType = entities?.crop_type || 'padi';
      return await marketAdvisor(cropType, location || entities?.location, history);

    default:
      // General response - no specific agent
      return {
        reply: getGeneralReply(message),
        structured_data: null
      };
  }
}

function getGeneralReply(message) {
  return `**Selamat datang ke PadiCare!** 🌾\n\nSaya pembantu pertanian digital anda. Anda boleh tanya saya tentang:\n\n🌱 **Penyakit tanaman** - hantar gambar daun kuning, bintik, dll\n💰 **Harga pasaran** - bila nak jual, harga semasa\n📅 **Jadual tanam** - perancangan musim, pembajaan\n\nApa yang boleh saya bantu hari ini?`;
}

module.exports = {
  cropDoctor,
  farmPlanner,
  marketAdvisor,
  routeToAgent
};
