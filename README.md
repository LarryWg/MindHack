# NeuroTrace

> **Real-time cognitive biomarker analysis from speech — visualised on a live 3D brain.**

NeuroTrace listens to a person speak, extracts **30 linguistic biomarkers across 5 cognitive domains** through a multi-agent AI pipeline, and renders glowing activation overlays on an interactive MNI152 brain model — making invisible cognitive patterns visible to anyone.

Built at **MindHack**, a 3-day undergraduate cognitive science hackathon.

---

## The Problem

Cognitive decline, ADHD, depression, and early dementia all leave detectable fingerprints in how people speak — years before clinical diagnosis. Reduced lexical diversity signals aphasia. Disrupted semantic coherence appears in schizophrenia. Slower speech rate and longer pauses are early markers of Parkinson's.

These patterns exist in every conversation. Nobody has made them visible and interactive for a non-clinical audience — until now.

---

## Demo

| Phase | What you see |
|---|---|
| **Input** | Speak or type — live transcription with silence detection auto-submits |
| **Processing** | 7 agents run in parallel; step-by-step progress lights up the UI |
| **Results** | 3D brain with glowing activation regions + neural connectivity networks |
| **Report** | Cognitive risk assessment with citations, risk indicators, recommendations |
| **Dashboard** | Session history, radar chart across 5 domains, trend analytics |

---

## How It Works

```
Voice/Text Input
      │
      ▼
┌─────────────┐     Whisper API      ┌──────────────────┐
│  Frontend   │ ──────────────────▶  │  STT Preprocessor│
│  (Next.js)  │                      │  transcript +     │
│             │                      │  pause map        │
└─────┬───────┘                      └────────┬─────────┘
      │  NDJSON stream                        │
      │  (agent steps,                        ▼
      │   scores, report)        ┌────────────────────────┐
      │                          │   Langflow Pipeline     │
      ▼                          │                         │
┌─────────────┐                  │  ① Lexical Agent        │
│  FastAPI    │ ◀──────────────  │  ② Semantic Agent       │
│  Backend    │   BiomarkerScores│  ③ Prosody Agent        │
│             │   + CogReport    │  ④ Syntax Agent         │
└─────────────┘                  │  ⑤ Biomarker Mapper     │
                                 │  ⑥ Report Composer      │
                                 └────────────────────────┘
```

---

## The 5 Cognitive Domains

| Domain | Brain Region | Key Metrics | Clinical Signal |
|---|---|---|---|
| **Lexical** | Broca's Area (BA 44/45) | TTR, lexical density, filler rate | ↓ diversity → aphasia, dementia |
| **Semantic** | Wernicke's Area (BA 22) | Coherence, idea density, tangentiality | ↓ coherence → schizophrenia |
| **Prosody** | SMA (BA 6) | WPM, pause frequency, hesitation ratio | ↑ pauses + ↓ WPM → Parkinson's |
| **Syntax** | DLPFC (BA 9/46) | MLU, clause depth, passive ratio | ↓ complexity → cognitive impairment |
| **Affective** | Amygdala | Valence, arousal, certainty | ↓ valence + ↑ arousal → mood disorders |

All scores are normalised 0–1 against healthy-population baselines. MNI152 coordinates from neuroimaging literature.

---

## Tech Stack

### Frontend
- **Next.js 15** App Router + **React 19** + **TypeScript** (strict)
- **Tailwind v4** — `@import "tailwindcss"` (no config file)
- **Three.js** — custom WebGL brain viewer, OBJ mesh loading, raycasting, neural tract animations
- **Recharts** — radar chart across 5 cognitive domains
- **Web Speech API** — live in-browser transcription while recording
- **Whisper API** (`whisper-1`, `verbose_json`) — accurate post-recording STT with word timestamps

### Backend
- **FastAPI** + **uvicorn** — async streaming NDJSON responses
- **httpx** — async Langflow API calls with configurable timeout
- **python-dotenv** — environment management

### AI Pipeline
- **Langflow** — ~40-node visual pipeline, 7 agents, fan-out pattern
- **Claude claude-sonnet-4-6** (Anthropic) — report composer with scientific citations
- **spaCy** — NLP feature extraction (TTR, dependency parse depth, POS tagging)
- **sentence-transformers** — semantic coherence scoring

### Infrastructure
- **Docker Compose** — orchestrates frontend + backend + Langflow
- **Vercel** — frontend deployment

---

## Project Structure

```
mindhack/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Main app — all phases & routing
│       │   ├── globals.css           # Tailwind v4 + CSS variables
│       │   ├── layout.tsx
│       │   └── api/
│       │       ├── analyze/route.ts  # Langflow proxy → NDJSON stream
│       │       └── transcribe/route.ts  # Whisper STT
│       ├── components/
│       │   ├── brain-viewer.tsx      # Three.js 3D brain (OBJ + raycasting + neural nets)
│       │   ├── analysis-panel.tsx    # Input + live recording UI
│       │   ├── dashboard-view.tsx    # History, KPIs, radar chart
│       │   ├── report-panel.tsx      # Cognitive report with citations
│       │   ├── radar-chart.tsx       # Recharts radar across 5 domains
│       │   ├── waveform-panel.tsx    # Word-timestamp audio visualiser
│       │   ├── neurotrace-splash.tsx # Landing screen
│       │   ├── neuro-sidebar.tsx     # Navigation sidebar
│       │   ├── site-header.tsx
│       │   ├── agent-card.tsx        # Per-agent status card
│       │   ├── Dither.jsx            # WebGL animated background
│       │   └── GlassSurface.jsx      # Frosted-glass UI primitive
│       └── hooks/
│           ├── useAudioRecorder.ts   # MediaRecorder + silence detection + live STT
│           ├── useAnalysisHistory.ts # localStorage session persistence
│           └── useTheme.ts           # Light/dark theme
├── backend/
│   ├── main.py                       # FastAPI app — /analyze streaming endpoint
│   └── requirements.txt
├── langflow.json                     # Full 7-agent Langflow pipeline export
└── docker-compose.yml
```

---

## NDJSON Stream Protocol

The `/analyze` endpoint streams newline-delimited JSON events:

```jsonc
{"type":"step",  "step": {"name": "Lexical agent", "status": "running"}}
{"type":"step",  "step": {"name": "Lexical agent", "status": "done"}}
{"type":"token", "chunk": "..."}
{"type":"end",   "message": "...", "scores": <BiomarkerScores>, "report": <CognitiveReport>, "session_id": "..."}
{"type":"error", "message": "..."}
```

### BiomarkerScores Schema

```typescript
interface BiomarkerScores {
  lexical:   { ttr: number; density: number; filler_rate: number; overall: number }
  semantic:  { coherence: number; idea_density: number; tangentiality: number; overall: number }
  prosody:   { speech_rate: number; pause_freq: number; hesitation: number; overall: number }
  syntax:    { mlu: number; clause_depth: number; passive_ratio: number; overall: number }
  affective: { valence: number; arousal: number; certainty: number; overall: number }
  // all values 0–1
}
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- A running Langflow instance
- Anthropic API key
- OpenAI API key (for Whisper)

### 1. Clone & install

```bash
git clone https://github.com/your-org/mindhack
cd mindhack

# Frontend
cd frontend && npm install

# Backend
cd ../backend && pip install -r requirements.txt
```

### 2. Environment variables

**`frontend/.env.local`**
```env
OPENAI_API_KEY=sk-...
BACKEND_URL=http://localhost:8000
```

**`backend/.env`**
```env
LANGFLOW_API_URL=http://localhost:7860
LANGFLOW_FLOW_ID=your-flow-id
LANGFLOW_API_KEY=your-langflow-key
LANGFLOW_TIMEOUT=300
```

### 3. Run

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend
cd backend && uvicorn main:app --reload --port 8000

# Or with Docker Compose
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Import Langflow pipeline

In your Langflow instance → **Import flow** → select `langflow.json`.
Set your Anthropic API key in the Claude component.

---

## Scientific References

| Biomarker | Citation |
|---|---|
| Lexical diversity & dementia | Fraser, K.C. et al. (2016). *Linguistic features identify Alzheimer's disease in narrative speech.* J Alzheimers Dis, 50(3), 805–813. |
| Semantic coherence & schizophrenia | Elvevåg, B. et al. (2007). *Quantifying incoherence in speech.* Arch Gen Psychiatry, 64(8), 959–964. |
| Prosody & Parkinson's | Rusz, J. et al. (2011). *Quantitative acoustic measurements for characterization of speech disorders in early Parkinson.* JASA, 129(1), 350–367. |
| Syntactic complexity & MCI | Roark, B. et al. (2011). *Spoken language derived measures for detecting MCI.* IEEE Trans Audio Speech Lang Process, 19(7), 2081–2090. |
| Affective markers & depression | Cummins, N. et al. (2015). *A review of depression and suicide risk assessment using speech analysis.* Speech Communication, 71, 10–49. |

---

## Team

Built at MindHack — 3-day undergraduate cognitive science hackathon.

---

## License

MIT
