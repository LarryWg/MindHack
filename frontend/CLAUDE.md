# CLAUDE.md — NeuroTrace @ MindHack

## What we're building
**NeuroTrace** — takes a person's voice or text, extracts 30 linguistic biomarkers across 5 categories through a Langflow multi-agent pipeline, and renders a live 3D MNI152 brain with glowing activation overlays at exact neuroimaging coordinates.

## The Problem
Cognitive decline, ADHD, depression, and early dementia all have detectable linguistic fingerprints years before clinical diagnosis. Nobody has made this visible and interactive for a non-clinical audience.

## Hackathon context
- **Event:** MindHack — 3-day undergraduate cognitive science hackathon
- **Judging:** Presentation · Execution · Technical correctness (cite your science) · Relevance · Problem-solving

---

## Stack
- **Frontend:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4
- **Tailwind:** `@import "tailwindcss"` in globals.css — NO tailwind.config.js
- **3D brain:** NiiVue (WebGL MNI152 atlas viewer) — `dynamic(() => import(...), { ssr: false })`
- **Charts:** Recharts — radar chart (5 cognitive domains) + speech waveform
- **Background:** Dither.jsx (WebGL, Three.js) — `dynamic`, ssr: false
- **Glass panels:** GlassSurface.jsx — use `width={"100%" as unknown as number}` for fluid
- **Icons:** `@tabler/icons-react` only — no heroicons, no react-icons
- **NLP backend:** FastAPI (Python) — spaCy, sentence-transformers, LIWC
- **STT:** Whisper API (`whisper-1`, `verbose_json`, `timestamp_granularities[]=word`)
- **Pipeline:** Langflow (~40 nodes, 7 agents, fan-out pattern)
- **LLM:** Claude claude-sonnet-4-6 via Langflow

---

## Project structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                  ← main dashboard
│   │   ├── globals.css               ← @import "tailwindcss"
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── analyze/route.ts      ← Langflow proxy, NDJSON stream
│   │       └── transcribe/route.ts   ← Whisper STT
│   └── components/
│       ├── Dither.jsx + .css         ← WebGL background, ssr:false
│       ├── GlassSurface.jsx + .css   ← frosted glass primitive
│       ├── brain-viewer.tsx          ← NiiVue 3D brain (Person 2 owns)
│       ├── neuro-sidebar.tsx
│       ├── site-header.tsx
│       ├── agent-card.tsx
│       ├── radar-chart.tsx
│       ├── waveform-display.tsx
│       ├── analysis-panel.tsx
│       └── neurotrace-splash.tsx
backend/
├── main.py                           ← FastAPI, POST /analyze
└── agents/
    ├── lexical.py                    ← spaCy TTR, density, fillers
    ├── semantic.py                   ← sentence-transformers coherence
    ├── prosody.py                    ← pause map + WPM
    ├── syntax.py                     ← spaCy dep parse depth
    └── mapper.py                     ← normalise → BiomarkerScores JSON
```

---

## Coding rules
- TypeScript strict throughout the frontend — no `any`
- `"use client"` on every component with state or effects
- No `<form>` tags — use `onClick`/`onChange` handlers
- No hardcoded secrets — `process.env` / `.env.local` only
- `Shift+P` toggles side panels (keydown useEffect in page.tsx)
- Side panels toggle via opacity/pointerEvents — never mount/unmount
- Every Langflow agent output must match a predefined JSON schema

---

## Langflow pipeline — 7 agents
1. **STT preprocessor** — transcript + pause map from Whisper
2. **Lexical agent** — TTR, lexical density, filler rate → Broca's area
3. **Semantic agent** — coherence, idea density, tangentiality → Wernicke's
4. **Prosody agent** — WPM, pause frequency, hesitation ratio → SMA
5. **Syntax agent** — MLU, clause depth, passive ratio → DLPFC
6. **Biomarker mapper** — normalises all scores → MNI region activation JSON
7. **Report composer** — Claude writes cited narrative + recommendations

### NDJSON stream protocol (api/analyze/route.ts ↔ page.tsx)
```
{"type":"step", "step":{"name":"Lexical agent","status":"running"}}
{"type":"token", "chunk":"..."}
{"type":"end", "message":"...", "scores":<BiomarkerScores>, "session_id":"..."}
{"type":"error", "message":"..."}
```

### BiomarkerScores schema (locked — agree with Person 1 / Langflow owner)
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

## Brain region targets (MNI152 standard space)
**Key principle:** MNI coordinates are hardcoded from neuroimaging literature.  
Langflow agents control activation **intensity** (0–1), not location.

| Region | MNI [x, y, z] | Agent | Science anchor |
|---|---|---|---|
| Broca's area (IFG) | [-44, 20, 8] | Lexical | Phonological / lexical retrieval |
| Wernicke's area (STG) | [-54, -40, 14] | Semantic | Semantic comprehension |
| DLPFC | [-46, 20, 32] | Syntax | Executive / working memory |
| SMA | [0, -4, 60] | Prosody | Speech timing / motor planning |
| Amygdala | [-24, -4, -22] | Affective | Emotional language processing |

---

## NiiVue brain viewer — Person 2 owns this entirely

### File: `frontend/src/components/brain-viewer.tsx`
- Default export `BrainViewer` — loaded in page.tsx with `dynamic(..., { ssr: false })`
- Must export `DEFAULT_REGIONS` so Person 3 can render without the backend running
- Must export `RegionActivation` type

### Core types
```typescript
export type RegionActivation = {
  region: string
  mni: [number, number, number]
  activation: number   // 0–1, driven by agent overall score
  agent: string
}

export const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area",    mni: [-44, 20, 8],   activation: 0.72, agent: "Lexical"   },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic"  },
  { region: "DLPFC",           mni: [-46, 20, 32],  activation: 0.83, agent: "Syntax"    },
  { region: "SMA",             mni: [0, -4, 60],    activation: 0.44, agent: "Prosody"   },
  { region: "Amygdala",        mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
]
```

### Props
```typescript
type BrainViewerProps = {
  activations?: RegionActivation[]    // defaults to DEFAULT_REGIONS
  onRegionClick?: (r: RegionActivation) => void
}
```

## Brain viewer — Three.js 3D interactive (brain-viewer.tsx)

Status: NiiVue REMOVED. Brain is now a self-contained Three.js component.
No atlas file required. No external dependencies beyond @react-three/fiber + drei.

Architecture:
- Semi-transparent brain mesh (SphereGeometry + vertex displacement)
- 5 glowing activation spheres at MNI-projected 3D positions  
- OrbitControls (drag rotate, scroll zoom, auto-rotate when idle)
- Raycasting click → onRegionClick(RegionActivation)
- HTML overlay panel on click showing region description + science

MNI → 3D projection:
  x = mni[0] / 90   (left-right)
  y = mni[2] / 72   (up-down, MNI z maps to Y)
  z = -mni[1] / 126 (anterior-posterior, inverted)

Region science descriptions (hardcoded):
- Broca's [-44,20,8]: lexical retrieval, expressive aphasia substrate
- Wernicke's [-54,-40,14]: semantic comprehension, coherence processing  
- DLPFC [-46,20,32]: executive function, syntactic working memory
- SMA [0,-4,60]: speech motor timing, prosodic control
- Amygdala [-24,-4,-22]: emotional salience, affective language

Score shape from Langflow — handle BOTH:
  flat:   { lexical: 0.72, semantic: 0.58, ... }
  nested: { lexical: { overall: 0.72 }, ... }

Exports: default BrainViewer, named DEFAULT_REGIONS, type RegionActivation
Loaded via: dynamic(() => import('@/components/brain-viewer'), { ssr: fal