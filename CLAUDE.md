# CLAUDE.md — NeuroTrace @ MindHack

## What we're building
**NeuroTrace** — an agentic AI pipeline that takes a person's voice or text and maps their cognitive signature onto a 3D brain atlas. Extracts 30 linguistic biomarkers across 5 categories, runs them through a Langflow multi-agent pipeline, and renders a live 3D brain with region activation overlays.

## The Problem
Cognitive decline, ADHD, depression, and early dementia all have detectable linguistic fingerprints years before clinical diagnosis. Nobody has made this visible and interactive for a non-clinical audience.

## Hackathon context
- **Event:** MindHack — 3-day undergraduate cognitive science hackathon
- **Category:** AI / HCI / Neuroscience
- **Judging:** Presentation · Execution · Technical correctness (cite your science) · Relevance · Problem-solving

## Stack
- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion, ShadCN
- **3D brain:** NiiVue (WebGL brain atlas viewer, MNI152 standard space)
- **Charts:** Recharts — radar chart (5 cognitive domains) + speech waveform
- **Backend:** Node.js + Express + FastAPI (Python NLP sidecar)
- **NLP:** spaCy, sentence-transformers, LIWC lexicon
- **STT:** Whisper API — returns transcript + word timestamps
- **Agentic pipeline:** Langflow (~40 nodes, 7 agents, fan-out pattern)
- **LLM:** Claude claude-sonnet-4-6 via Langflow
- **Database:** PostgreSQL via Supabase
- **Auth:** Clerk
- **Deploy:** Vercel (frontend) + Railway (FastAPI sidecar)

## Project structure
```
/app                  # Next.js pages + API routes
/app/api              # API routes only
/components           # All React components
/components/brain     # NiiVue 3D brain viewer
/components/charts    # Radar chart, waveform
/components/agents    # Agent activity cards (Callio-style grid)
/lib                  # Shared utils, types, Langflow client
/sidecar              # FastAPI Python NLP service
/sidecar/agents       # spaCy, sentence-transformer, LIWC logic
```

## Rules
- Always TypeScript on the Next.js side
- Python sidecar uses type hints throughout
- No hardcoded secrets — use `process.env` / `.env.local`
- Components in `/components`, pages in `/app`, API routes in `/app/api`
- Small descriptive commits — one concern per commit
- Every Langflow agent output must match a predefined JSON schema (validation gate)

## Langflow pipeline — 7 agents
1. **STT preprocessor** — transcript + pause map from Whisper
2. **Lexical agent** — TTR, lexical density, filler rate → Broca's area
3. **Semantic agent** — coherence, idea density, tangentiality → Wernicke's
4. **Prosody agent** — WPM, pause frequency, hesitation ratio → SMA
5. **Syntax agent** — MLU, clause depth, passive ratio → DLPFC
6. **Biomarker mapper** — normalizes all scores → MNI region activation JSON
7. **Report composer** — Claude writes cited narrative + recommendations

## Brain region targets (MNI152)
| Region | MNI coords | Driven by |
|---|---|---|
| Broca's area (IFG) | [-44, 20, 8] | Lexical agent |
| Wernicke's (STG) | [-54, -40, 14] | Semantic agent |
| DLPFC | [-46, 20, 32] | Syntax agent |
| SMA | [0, -4, 60] | Prosody agent |
| Amygdala | [-24, -4, -22] | Affective markers |

## Science citations (use in report output)
- Snowdon et al. (2001) — idea density predicts Alzheimer's decades early
- Elvevåg et al. (2010) — semantic coherence as schizophrenia biomarker
- DementiaBank corpus studies — speech markers for cognitive decline
- LIWC (Pennebaker et al.) — affective and cognitive word categories
- Baddeley (2000) — working memory model (syntactic complexity anchor)

## Key component: NiiVue brain viewer
- Load `MNI152_T1_1mm.nii.gz` as base atlas
- Generate `.nii` overlay from biomarker mapper JSON output
- Color scale: gray → blue → amber → coral (low → high activation)
- Click region → slide-in panel showing which markers + sentences drove it
- Fallback: SVG brain silhouette with D3 circles at projected MNI coords

## Output UI (mirrors Callio Labs layout)
- Left sidebar: nav (New Analysis, History, Reports)
- Center: 3D NiiVue brain (hero) + waveform below
- Right: 4 agent cards showing top markers per agent
- Bottom drawer: radar chart + full cited report
- Top bar: mic button, file upload, model selector