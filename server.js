const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { orchestrate } = require('./orchestrator');
const { cropDoctor } = require('./agents/cropDoctor');
const { farmPlanner } = require('./agents/farmPlanner');
const { marketAdvisor } = require('./agents/marketAdvisor');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store conversation history in memory (use Redis in production)
const sessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main chat endpoint - This is the contract for Person C (Frontend)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, image_base64, session_id, location } = req.body;

    if (!message && !image_base64) {
      return res.status(400).json({ error: 'Message or image required' });
    }

    // Get or create session
    if (!session_id || !sessions.has(session_id)) {
      const newSessionId = session_id || Date.now().toString();
      sessions.set(newSessionId, []);
    }
    const sessionId = session_id || Date.now().toString();
    const history = sessions.get(sessionId);

    // Step 1: Orchestrator determines intent
    const orchestration = await orchestrate(message, image_base64, history);
    console.log('Intent detected:', orchestration.intent, 'Confidence:', orchestration.confidence);

    // Step 2: Route to appropriate agent
    let agentResponse;
    switch (orchestration.intent) {
      case 'crop_disease':
        agentResponse = await cropDoctor(image_base64, message, history);
        break;

      case 'plan':
        // Extract entities from orchestrator for structured input
        agentResponse = await farmPlanner(orchestration.extracted_entities, history);
        break;

      case 'market':
        agentResponse = await marketAdvisor(
          orchestration.extracted_entities?.crop_type || 'padi',
          location,
          history
        );
        break;

      case 'general':
      default:
        // General conversation - use simple Gemini response
        agentResponse = {
          reply: await getGeneralResponse(message, history),
          structured_data: null
        };
    }

    // Update conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: agentResponse.reply });
    sessions.set(sessionId, history.slice(-20)); // Keep last 20 messages

    // Return standardized response
    res.json({
      intent: orchestration.intent,
      reply: agentResponse.reply,
      structured_data: agentResponse.structured_data || null,
      confidence: orchestration.confidence,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Simple general response function
async function getGeneralResponse(message, history) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are PadiCare, a Malaysian agriculture expert assistant.

Rules:
- Always respond in Bahasa Malaysia.
- Be friendly, practical, and clear.
- Only answer agriculture-related questions.

User message: ${message}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

app.listen(PORT, () => {
  console.log(`PadiCare server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /health    - Health check');
  console.log('  POST /api/chat  - Main chat endpoint');
});
