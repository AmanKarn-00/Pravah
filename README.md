<p align="center">
  <img src="https://img.shields.io/badge/Gemma-4--31b--it-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemma 4" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
</p>

<h1 align="center">🌊 PRAVAH</h1>
<h3 align="center">AI Infrastructure Decision Engine for Nepal's Road Network</h3>

<p align="center">
  <b>Multi-agent AI orchestrator powered by Gemma 4 that synthesizes traffic, infrastructure, weather, and emergency data to deliver real-time road management decisions.</b><br/>
  <b>Authors:</b> Aman Karn and Prajwal Yadav
</p>

---

## 🏆 Hackathon Achievement

> **🥈 Runner Up — Route Intelligence Track**
>
> Built at the **Build with Gemma / Margadarshan Hackathon** (Build with Gemma).
> PRAVAH was recognized as the **Runner Up in the Route Intelligence Track** for its innovative multi-agent approach to infrastructure decision-making using Google's Gemma model.

---

## 🎯 What is PRAVAH?

PRAVAH (**P**redictive **R**oad **A**nalysis **V**ia **A**I **H**euristics) is a multi-agent AI decision engine designed for Nepal's road network — specifically the Bhaktapur–Banepa corridor. It orchestrates **21 specialized tools** across **6 domains** to provide comprehensive, data-driven road management decisions in real time.

When an infrastructure event occurs (road damage, bridge stress, landslide risk, etc.), PRAVAH:

1. **Extracts** structured entities from natural language reports
2. **Gathers context** using native function calling across 21 domain-specific tools
3. **Deliberates** via four virtual expert agents (Traffic, Infrastructure, Emergency, Planning)
4. **Generates** three actionable decision scenarios (Safest → Balanced → Least Disruptive)
5. **Compares** baseline vs. AI-optimized routing using a risk-adjusted cost metric
6. **Outputs** a final decision with a Nepali public notice and SMS alert

---

## 🧠 Multi-Agent Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Report                        │
│        "Landslide on Road B near Jagati"             │
└──────────────────────┬──────────────────────────────┘
                       ▼
              ┌─────────────────┐
              │  Entity Extractor│  ← Gemma 4 (structured output)
              └────────┬────────┘
                       ▼
       ┌───────────────────────────────┐
       │   Tool Orchestration Engine   │  ← Gemma 4 (native function calling)
       │   21 Tools · 6 Domains       │
       └───────┬───────┬───────┬──────┘
               │       │       │
     ┌─────────┤  ┌────┤  ┌────┤
     ▼         ▼  ▼    ▼  ▼    ▼
 🚦 Traffic  🌉 Infra  🌧️ Weather  🚑 Emergency  🧠 Memory  📊 Planning
               │       │       │
               └───────┴───────┘
                       ▼
         ┌──────────────────────────┐
         │   4-Expert Deliberation  │
         │  Traffic · Infra · EMS   │
         │       · Planning         │
         └────────────┬─────────────┘
                      ▼
         ┌──────────────────────────┐
         │  3-Scenario Generator    │
         │  Safest · Balanced ·     │
         │  Least Disruptive        │
         └────────────┬─────────────┘
                      ▼
         ┌──────────────────────────┐
         │  Baseline vs Optimized   │
         │  Comparison Engine       │
         └────────────┬─────────────┘
                      ▼
         ┌──────────────────────────┐
         │    Final Decision        │
         │  + Nepali Public Notice  │
         │  + SMS Alert             │
         └──────────────────────────┘
```

---

## 🔧 21 Tools Across 6 Domains

| Domain | Tools |
|--------|-------|
| 🚦 **Traffic** | `get_live_traffic_status`, `predict_queue_length`, `simulate_route_closure`, `find_best_detour` |
| 🌉 **Infrastructure** | `get_bridge_health`, `predict_bridge_failure`, `get_bridge_history`, `calculate_remaining_capacity` |
| 🌧️ **Weather** | `get_weather_forecast`, `predict_landslide_probability`, `check_river_level` |
| 🚑 **Emergency** | `get_nearest_hospital`, `estimate_ambulance_delay`, `get_available_emergency_units` |
| 🧠 **Memory** | `search_similar_incidents`, `retrieve_post_incident_report` |
| 📊 **Planning** | `estimate_economic_loss`, `estimate_carbon_emissions`, `forecast_traffic`, `predict_recovery_time` |

All tools are Python callables with structured input/output, passed to Gemma 4 for **native function calling**.

---

## 🖥️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async Python API server with SSE streaming
- **[Gemma 4 (31B-IT)](https://ai.google.dev/gemma)** — via Google GenAI SDK for entity extraction, function calling, and expert deliberation
- **[NetworkX](https://networkx.org/)** — graph-based road network modeling (Bhaktapur–Banepa corridor)
- **[scikit-learn](https://scikit-learn.org/)** — cosine similarity for incident memory search
- **[httpx](https://www.python-httpx.org/)** — async HTTP client for external API calls

### Frontend
- **[React 19](https://react.dev/)** + **[Vite 8](https://vite.dev/)** — modern SPA with hot module replacement
- **[Tailwind CSS 4](https://tailwindcss.com/)** — utility-first styling
- **[Leaflet](https://leafletjs.com/)** + **[React-Leaflet](https://react-leaflet.js.org/)** — interactive map visualization of the road network
- **[Framer Motion](https://www.framer.com/motion/)** — smooth animations and transitions
- **[Lucide React](https://lucide.dev/)** — icon system
- **[Sonner](https://sonner.emilkowal.dev/)** — toast notifications for real-time pipeline updates
- **[tsParticles](https://particles.js.org/)** — animated particle background

---

## 📂 Project Structure

```
Pravah/
├── backend/
│   ├── main.py               # FastAPI server entry point
│   ├── ai_orchestrator.py    # Multi-agent orchestration pipeline
│   ├── tools.py              # 21 domain-specific tools
│   ├── schemas.py            # JSON schemas for structured output
│   ├── data/
│   │   ├── bridge_registry.json
│   │   ├── decision_memory.json
│   │   └── hospital_registry.json
│   ├── requirements.txt
│   └── .env                  # GOOGLE_API_KEY
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                        # Main application layout
│   │   └── components/
│   │       ├── GemmaOrchestrator.jsx      # Chat interface + pipeline control
│   │       ├── PipelineVisualizer.jsx     # Animated step-by-step tool pipeline
│   │       ├── MapWidget.jsx             # Leaflet map with route visualization
│   │       ├── EvidencePanel.jsx         # Evidence stats (bridge, weather, traffic, etc.)
│   │       ├── ExpertPanel.jsx           # 4 expert agent verdict cards
│   │       ├── ScenarioCards.jsx         # Safest/Balanced/Least Disruptive scenarios
│   │       ├── BaselineComparison.jsx    # Baseline vs Optimized route comparison
│   │       ├── ParticlesBackground.jsx   # Animated particle backdrop
│   │       └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- A **Google AI API key** (for Gemma model access)

### 1. Clone the Repository

```bash
git clone https://github.com/AmanKarn-00/Pravah.git
cd Pravah
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create a .env file with your Google API key:
echo GOOGLE_API_KEY=your_api_key_here > .env

# Run the server
python main.py
```

The backend will start at **http://localhost:8000**.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will start at **http://localhost:5173** (default Vite port).

---

## 💡 How to Use

1. Open the frontend in your browser
2. Type a road event scenario into the chat, for example:
   - *"There is a landslide near Jagati road. It happened 2 hours ago."*
   - *"Bridge at Sanga is showing cracks after heavy rainfall."*
   - *"Road B between Jagati and Sanga needs emergency closure for 6 hours."*
3. Watch the **Pipeline Visualizer** as Gemma orchestrates tools in real time
4. Review the **Evidence Panel**, **Expert Verdicts**, and **Scenario Cards**
5. Read the **Final Decision** with the Nepali public notice and SMS alert

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send chat messages; returns SSE stream of orchestration events |
| `GET` | `/api/weather` | Fetch live weather data for Bhaktapur |

---

## 📄 License

MIT License.

---

<p align="center">
  <b>Built with ❤️ using Google Gemma at the Margadarshan Hackathon</b><br/>
  <sub>PRAVAH — Powering smarter road decisions for Nepal 🇳🇵</sub>
</p>
