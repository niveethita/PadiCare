const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { unifiedChat } = require('./unifiedChat');

const app = express();

// Auto-find available port starting from 3000
const START_PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store conversation history in memory (use Redis in production)
const sessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main chat endpoint - UNIFIED: Only 1 API call per request
app.post('/api/chat', async (req, res) => {
  try {
    const { message, image_base64, session_id, location } = req.body;

    if (!message && !image_base64) {
      return res.status(400).json({ error: 'Message or image required' });
    }

    // Get or create session
    const sessionId = session_id || Date.now().toString();
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    // UNIFIED APPROACH: Single API call for intent + response
    console.log('Processing request (unified mode)...');
    const result = await unifiedChat(message, image_base64, location);
    console.log('Intent detected:', result.intent, 'Confidence:', result.confidence);

    // Update conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: result.reply });
    sessions.set(sessionId, history.slice(-20)); // Keep last 20 messages

    // Return standardized response
    res.json({
      intent: result.intent,
      reply: result.reply,
      structured_data: result.structured_data,
      confidence: result.confidence,
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

// Try ports until one works
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`PadiCare server running on port ${port}`);
    console.log(`Test it: curl http://127.0.0.1:${port}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const newPort = parseInt(port) + 1;
      console.log(`Port ${port} busy, trying ${newPort}...`);
      startServer(newPort);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(START_PORT);
