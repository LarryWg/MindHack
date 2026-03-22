import asyncio
import os
import json
import httpx
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file in same directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = FastAPI(title="NeuroTrace Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

LANGFLOW_API_URL = os.getenv("LANGFLOW_API_URL", "http://localhost:7860")
_FLOW_ID_RAW = os.getenv("LANGFLOW_FLOW_ID", "")
LANGFLOW_API_KEY = os.getenv("LANGFLOW_API_KEY", "")

# Normalise: strip any leading path so LANGFLOW_FLOW_ID can be either
# "284e7b53-..." or "/api/v1/run/284e7b53-..."
LANGFLOW_FLOW_ID = _FLOW_ID_RAW.split("/")[-1] if _FLOW_ID_RAW else ""


def _langflow_url() -> str:
    return f"{LANGFLOW_API_URL}/api/v1/run/{LANGFLOW_FLOW_ID}"


def _langflow_headers() -> dict:
    h = {"Content-Type": "application/json"}
    if LANGFLOW_API_KEY:
        h["x-api-key"] = LANGFLOW_API_KEY
    return h


# Maps brain region name fragments → BiomarkerScores agent key
_REGION_TO_AGENT: dict[str, str] = {
    "broca":    "lexical",
    "wernicke": "semantic",
    "sma":      "prosody",
    "dlpfc":    "syntax",
    "amygdala": "affective",
}


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` fences from a string."""
    t = text.strip()
    if not t.startswith("```"):
        return t
    lines = t.split("\n")
    if lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines)


def _extract_text_and_scores(data: dict) -> tuple[str, Optional[dict], Optional[dict]]:
    """Pull message text, BiomarkerScores, and full report out of a Langflow response."""
    message_text = ""
    scores = None
    report = None
    try:
        outputs = data.get("outputs", [])
        if outputs:
            inner = outputs[0].get("outputs", [])
            if inner:
                results = inner[0].get("results", {})
                msg = results.get("message", {})
                if isinstance(msg, dict):
                    message_text = msg.get("text", "")
                else:
                    message_text = str(msg)

                # Try to parse JSON embedded in the message text
                if message_text:
                    try:
                        parsed = json.loads(_strip_markdown_fences(message_text))
                        if isinstance(parsed, dict):
                            if "report" in parsed:
                                report = parsed["report"]
                                # Synthesise BiomarkerScores from highlight activations
                                highlights = report.get("highlights", [])
                                synth: dict[str, float] = {}
                                for h in highlights:
                                    rname = h.get("region", "").lower()
                                    for fragment, agent_key in _REGION_TO_AGENT.items():
                                        if fragment in rname:
                                            synth[agent_key] = float(h.get("activation", 0.0))
                                            break
                                if synth:
                                    scores = synth
                            elif any(k in parsed for k in ("lexical", "semantic", "prosody", "syntax", "affective")):
                                scores = parsed
                    except (json.JSONDecodeError, ValueError):
                        pass

                # Or returned in artifacts
                artifacts = inner[0].get("artifacts", {})
                if not scores and "scores" in artifacts:
                    scores = artifacts["scores"]
    except Exception:
        pass
    return message_text, scores, report


# ── Request models ────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    input_value: Optional[str] = None
    transcript: Optional[str] = None
    pause_map: Optional[list[float]] = None
    session_id: Optional[str] = None


class LangFlowRequest(BaseModel):
    input_value: str
    session_id: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

AGENT_STEPS = [
    "STT preprocessor",
    "Lexical agent",
    "Semantic agent",
    "Prosody agent",
    "Syntax agent",
    "Biomarker mapper",
    "Report composer",
]


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    message = req.input_value or req.transcript or ""
    if not message:
        raise HTTPException(status_code=400, detail="No input provided")

    if not LANGFLOW_FLOW_ID:
        raise HTTPException(status_code=500, detail="LANGFLOW_FLOW_ID not configured")

    payload: dict = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
        "stream": False,
    }
    if req.session_id:
        payload["session_id"] = req.session_id
    if req.pause_map:
        payload["tweaks"] = {"pause_map": req.pause_map}

    async def generate():
        # ── 1. Emit initial step status ───────────────────────────────────────
        for i, step in enumerate(AGENT_STEPS):
            status = "running" if i == 0 else "pending"
            yield json.dumps({"type": "step", "step": {"name": step, "status": status}}).encode() + b"\n"

        # ── 2. Fire the Langflow call in a background task ────────────────────
        loop = asyncio.get_event_loop()
        langflow_task = loop.create_task(
            _call_langflow_async(payload)
        )

        # ── 3. Simulate per-agent progress while waiting ──────────────────────
        step_delay = 1.8  # seconds between fake step transitions
        for i in range(1, len(AGENT_STEPS)):
            try:
                await asyncio.wait_for(asyncio.shield(langflow_task), timeout=step_delay)
                break  # response came early — stop faking
            except asyncio.TimeoutError:
                pass
            if langflow_task.done():
                break
            yield json.dumps({"type": "step", "step": {"name": AGENT_STEPS[i - 1], "status": "done"}}).encode() + b"\n"
            yield json.dumps({"type": "step", "step": {"name": AGENT_STEPS[i], "status": "running"}}).encode() + b"\n"

        # ── 4. Await result and emit end / error ──────────────────────────────
        try:
            data, error = await langflow_task
        except Exception as exc:
            yield json.dumps({"type": "error", "message": str(exc)}).encode() + b"\n"
            return

        if error:
            yield json.dumps({"type": "error", "message": error}).encode() + b"\n"
            return

        # Mark all steps done
        for step in AGENT_STEPS:
            yield json.dumps({"type": "step", "step": {"name": step, "status": "done"}}).encode() + b"\n"

        message_text, scores, report = _extract_text_and_scores(data)
        session_id = data.get("session_id") or req.session_id or str(uuid.uuid4())

        yield json.dumps({
            "type": "end",
            "message": message_text,
            "scores": scores,
            "report": report,
            "session_id": session_id,
        }).encode() + b"\n"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _call_langflow_async(payload: dict) -> tuple[dict, Optional[str]]:
    """Returns (response_data, error_message). One of them will be None."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(_langflow_url(), json=payload, headers=_langflow_headers())
        if resp.status_code >= 400:
            return {}, resp.text
        return resp.json(), None


@app.post("/langflow-test")
async def langflow_test(req: LangFlowRequest):
    """Simple non-streaming endpoint for testing the Langflow connection."""
    if not LANGFLOW_FLOW_ID:
        raise HTTPException(status_code=500, detail="LANGFLOW_FLOW_ID not configured")

    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": req.input_value,
        "session_id": req.session_id or str(uuid.uuid4()),
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(_langflow_url(), json=payload, headers=_langflow_headers())
            resp.raise_for_status()
            data = resp.json()
            message_text, scores, report = _extract_text_and_scores(data)
            return {
                "response": message_text,
                "scores": scores,
                "report": report,
                "raw": data,
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")
