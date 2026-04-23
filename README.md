# PadiCare

PadiCare is an AI-powered agricultural assistant chatbot designed for Malaysian farmers. Built with Google's Generative AI and Vertex AI, it provides intelligent guidance on crop diseases, market prices, farm planning, and general agricultural queries in Bahasa Malaysia.

## Features

- **Multi-Agent Architecture**: Specialized agents for different domains:
  - Crop Doctor - Plant disease diagnosis from images and descriptions
  - Market Advisor - Real-time market price information from FAMA
  - Farm Planner - Planting schedules and farming planning
- **RAG-Powered Responses**: Retrieves contextual information from a knowledge base of Department of Agriculture (DOA) Malaysia documents
- **Intent Classification**: Automatically detects user intent and routes to appropriate specialist agent
- **Multilingual Support**: Responds in Bahasa Malaysia for better accessibility
- **Image Analysis**: Upload plant photos for disease diagnosis

## Project Structure

```
PadiCare/
├── server.js              # Express backend server
├── orchestrator.js        # Intent classification and entity extraction
├── unifiedChat.js         # Main chat handler with RAG integration
├── ragSearch.js           # Vertex AI Search for knowledge base retrieval
├── agents/
│   ├── index.js           # Agent router
│   ├── cropDoctor.js      # Plant disease diagnosis agent
│   ├── marketAdvisor.js   # Market price and selling advice
│   ├── farmPlanner.js     # Farming schedule and planning
│   └── prompts.js         # System prompts for agents
├── js/
│   ├── scanner.js         # Frontend image scanning logic
│   ├── planner.js         # Farm planning UI logic
│   └── market.js          # Market price display logic
├── knowledge/             # RAG knowledge base documents
│   ├── rice_diseases.txt
│   ├── vegetable_diseases.txt
│   ├── pest_control.txt
│   ├── fertiliser_guide.txt
│   ├── planting_calendar.txt
│   ├── market_strategy.txt
│   ├── government_schemes.txt
│   ├── soil.txt
│   ├── water_management.txt
│   └── fama_prices.txt
├── chatbot-dashboard.html # Main chatbot UI
├── scanner.html           # Plant disease scanner interface
├── market.html            # Market price interface
├── planner.html           # Farm planning interface
└── package.json
```

## Tech Stack

- **Backend**: Node.js, Express
- **AI/ML**: Google Generative AI (Gemini 2.0 Flash Lite), Vertex AI Search
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **RAG**: Google Cloud Discovery Engine for semantic search

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd PadiCare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (copy `.env.example` to `.env`):
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   VERTEX_PROJECT_ID=your_gcp_project_id
   VERTEX_ENGINE_ID=your_vertex_search_engine_id
   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
   ```

4. Add your Google Cloud service account key as `service-account-key.json`

5. Start the server:
   ```bash
   npm start        # Production
   npm run dev      # Development with nodemon
   ```

6. Open `chatbot-dashboard.html` in your browser or access via `http://localhost:3000`

## API Endpoints

### POST /api/chat

Main chat endpoint for unified conversation handling.

**Request Body:**
```json
{
  "message": "Daun padi saya kuning dan ada bintik coklat",
  "image_base64": "optional_base64_encoded_image",
  "session_id": "optional_session_id",
  "location": "optional_location"
}
```

**Response:**
```json
{
  "intent": "crop_disease",
  "reply": "Berdasarkan penerangan anda, kemungkinan tanaman anda diserang penyakit...",
  "structured_data": { ... },
  "confidence": 0.92,
  "session_id": "12345",
  "timestamp": "2026-04-22T10:30:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-22T10:30:00.000Z"
}
```

## Intent Categories

The orchestrator classifies user queries into four categories:

| Intent | Triggers |
|--------|----------|
| `crop_disease` | Images, "kuning", "bintik", "layu", "rosak", pest/disease descriptions |
| `market` | "harga", "jual", "pasaran", FAMA, selling queries |
| `plan` | "jadual", "rancang", "tanam", farming schedules |
| `general` | Greetings, general questions |

## Knowledge Base

The RAG system indexes documents from Malaysia's Department of Agriculture covering:
- Rice and vegetable diseases
- Pest control methods
- Fertilizer guides
- Planting calendars
- Soil management
- Water management
- Government schemes
- Market strategies
- FAMA price data

## Development

The project uses a modular agent architecture where each specialist agent handles specific domains. The orchestrator uses Gemini to classify intent and extract entities before routing to the appropriate agent.

### Adding New Agents

1. Create a new agent file in `agents/`
2. Add routing logic to `agents/index.js`
3. Update the intent prompt in `orchestrator.js`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | API key for Google Generative AI |
| `VERTEX_PROJECT_ID` | Google Cloud project ID for Vertex AI |
| `VERTEX_ENGINE_ID` | Vertex Search engine ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key |
| `PORT` | Server port (default: 3000) |

## License

MIT

## Acknowledgements

- Google Generative AI for conversational AI capabilities
- Vertex AI Search for RAG functionality
- Malaysia Department of Agriculture for reference materials
- FAMA for market price data
