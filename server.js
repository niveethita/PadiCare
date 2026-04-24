const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { unifiedChat } = require('./unifiedChat');

const app = express();
const START_PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(__dirname + '/chatbot-dashboard.html'));

// In-memory session store (use Redis in production)
const sessions = new Map();

app.get('/', (req, res) => {
  console.log('Looking for:', __dirname + '/chatbot-dashboard.html');
  res.sendFile(__dirname + '/chatbot-dashboard.html');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image_base64, session_id, location } = req.body;

    if (!message && !image_base64) {
      return res.status(400).json({ error: 'Message or image required' });
    }

    const sessionId = session_id || Date.now().toString();
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    console.log('Processing request (unified mode)...');

    const result = await unifiedChat(message, image_base64, location, history);
    console.log('Intent detected:', result.intent, '| Confidence:', result.confidence);

    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: result.reply });
    sessions.set(sessionId, history.slice(-20));

    res.json({
      intent: result.intent,
      reply: result.reply,
      structured_data: result.structured_data,
      confidence: result.confidence,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`PadiCare server running on port ${port}`);
    console.log(`Health check: http://127.0.0.1:${port}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(START_PORT);