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

### NiiVue setup
```typescript
import { Niivue, SLICE_TYPE } from '@niivue/niivue'

// Init on mount
const nv = new Niivue({ backColor: [1,1,1,0], crosshairColor: [0.8,0.3,0.1,0.6] })
nv.attachToCanvas(canvasRef.current)
await nv.loadVolumes([{ url: '/MNI152_T1_1mm.nii.gz' }])
nv.setSliceType(SLICE_TYPE.RENDER)  // 3D render mode
```

### Atlas file
Place at `frontend/public/MNI152_T1_1mm.nii.gz` (~20MB).
```bash
# Download
curl -L https://github.com/neurolabusc/niivue/raw/main/demos/images/mni152.nii.gz \
  -o frontend/public/MNI152_T1_1mm.nii.gz
```

### Overlay generation — updateOverlay()
Called every time `activations` prop changes. Paints a Gaussian blob centred on each MNI coord, scaled by activation score. Max-blends overlapping regions.

```typescript
function mniToVoxel(mni: [number,number,number]): [number,number,number] {
  // MNI152 1mm isotropic: origin at [90, 126, 72]
  return [
    Math.round(90  - mni[0]),
    Math.round(126 + mni[1]),
    Math.round(72  + mni[2]),
  ]
}

function updateOverlay(nv: Niivue, activations: RegionActivation[]) {
  const hdr = nv.volumes[0]?.hdr
  if (!hdr) return
  const { dims, pixDims } = hdr
  const [nx, ny, nz] = [dims[1], dims[2], dims[3]]
  const data = new Float32Array(nx * ny * nz).fill(0)

  for (const r of activations) {
    const [vx, vy, vz] = mniToVoxel(r.mni)
    const sigVox = 8 / pixDims[1]   // 8mm Gaussian blob
    for (let x = Math.max(0,vx-15); x < Math.min(nx,vx+15); x++)
    for (let y = Math.max(0,vy-15); y < Math.min(ny,vy+15); y++)
    for (let z = Math.max(0,vz-15); z < Math.min(nz,vz+15); z++) {
      const d2 = ((x-vx)**2 + (y-vy)**2 + (z-vz)**2) / (sigVox**2)
      const val = r.activation * Math.exp(-d2 / 2)
      const idx = x + y*nx + z*nx*ny
      if (val > data[idx]) data[idx] = val   // max blend
    }
  }

  if (nv.volumes.length > 1) nv.removeVolumeByIndex(1)
  nv.addVolumeFromBuffer(data, hdr, {
    colormap: 'warm',   // gray → blue → amber → coral
    opacity: 0.7,
    cal_min: 0.1,
    cal_max: 1.0,
  })
}
```

### Region click interaction
```typescript
// Fired by canvas onClick
const handleClick = () => {
  if (!nvRef.current || !onRegionClick) return
  const mm = nvRef.current.frac2mm(nvRef.current.scene.crosshairPos)
  const closest = activations.reduce((best, r) => {
    const d  = Math.hypot(r.mni[0]-mm[0], r.mni[1]-mm[1], r.mni[2]-mm[2])
    const bd = Math.hypot(best.mni[0]-mm[0], best.mni[1]-mm[1], best.mni[2]-mm[2])
    return d < bd ? r : best
  })
  // Only fire if click is within 20mm of a known region
  const dist = Math.hypot(...activations.map((_,i) => closest.mni[i] - mm[i]) as any)
  if (dist < 20) onRegionClick(closest)
}
```

### SVG fallback
When NiiVue fails to load (WebGL unsupported), render the SVG silhouette with projected MNI dots. MNI → SVG projection (lateral view, viewBox 0 0 400 320):
```typescript
const project = (mni: [number,number,number]): [number,number] => [
  ((mni[0] + 80) / 160) * 280 + 60,
  280 - ((mni[2] + 50) / 130) * 220,
]
```
Activation color scale: >0.75 → `#D85A30`, >0.5 → `#EF9F27`, >0.25 → `#1D9E75`, else `#B4B2A9`

### How page.tsx wires the brain
```typescript
// In page.tsx — Person 3's file
const [activations, setActivations] = useState<RegionActivation[]>(DEFAULT_REGIONS)
const [clickedRegion, setClickedRegion] = useState<RegionActivation | null>(null)

// On type:end from NDJSON stream:
// Convert BiomarkerScores → RegionActivation[]
const newActivations = BRAIN_REGIONS.map(r => ({
  ...r,
  activation: scores[r.agent.toLowerCase()].overall
}))
setActivations(newActivations)

// In JSX:
<BrainViewer activations={activations} onRegionClick={setClickedRegion} />
{clickedRegion && <RegionPanel region={clickedRegion} onClose={() => setClickedRegion(null)} />}
```

---

## Whisper STT — api/transcribe/route.ts
```typescript
// POST multipart/form-data { audio: File }
// Returns: { transcript, pauseMap, wordTimestamps, duration }

whisperFormData.append("model", "whisper-1")
whisperFormData.append("response_format", "verbose_json")
whisperFormData.append("timestamp_granularities[]", "word")   // critical

// Pause map extraction
function extractPauseMap(words): number[] {
  return words.slice(0,-1)
    .map((w,i) => words[i+1].start - w.end)
    .filter(gap => gap > 0.1)   // >100ms only
}
```

---

## Science citations (use in report + demo)
- **Snowdon et al. (2001)** — idea density predicts Alzheimer's decades early
- **Elvevåg et al. (2010)** — semantic coherence as schizophrenia biomarker
- **DementiaBank corpus** — speech markers for cognitive decline
- **LIWC (Pennebaker et al.)** — affective and cognitive word categories
- **Baddeley (2000)** — working memory model (syntactic complexity anchor)

Demo line when brain lights up:
> *"Each glowing region corresponds to a real MNI152 coordinate. The blob size and colour reflect the activation score from that domain's agent — the same coordinate space used in clinical neuroimaging research."*

---

## Team ownership
| Person | Owns |
|---|---|
| Person 1 | Langflow nodes, FastAPI agents, Whisper STT |
| **Person 2** | **brain-viewer.tsx, NiiVue, MNI overlay, region click, /api/transcribe** |
| Person 3 | page.tsx shell, agent cards, radar chart, waveform, sidebar |
| Person 4 | Claude system prompts, science citations, demo script, slides |

### Person 2 handoff contract
- Export `BrainViewer` as default, `DEFAULT_REGIONS` + `RegionActivation` as named exports
- `DEFAULT_REGIONS` must work with zero backend (Person 3 unblocked immediately)
- Brain lights up within 3s of receiving `activations` prop update
- `onRegionClick` fires `RegionActivation` when canvas clicked within 20mm of a region
- `/api/transcribe` returns `{ transcript, pauseMap, wordTimestamps, duration }`