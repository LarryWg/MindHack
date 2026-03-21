import os
import json
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="NeuroTrace Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

LANGFLOW_API_URL = os.getenv("LANGFLOW_API_URL", "http://localhost:7860")
LANGFLOW_FLOW_ID = os.getenv("LANGFLOW_FLOW_ID", "")
LANGFLOW_API_KEY = os.getenv("LANGFLOW_API_KEY", "")


class AnalyzeRequest(BaseModel):
    input_value: Optional[str] = None
    transcript: Optional[str] = None
    pause_map: Optional[list[float]] = None
    session_id: Optional[str] = None


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    message = req.input_value or req.transcript or ""
    if not message:
        raise HTTPException(status_code=400, detail="No input provided")

    langflow_body: dict = {
        "input_value": message,
        "output_type": "chat",
        "input_type": "chat",
        "tweaks": {**({"pause_map": req.pause_map} if req.pause_map else {})},
    }
    if req.session_id:
        langflow_body["session_id"] = req.session_id

    headers = {"Content-Type": "application/json"}
    if LANGFLOW_API_KEY:
        headers["Authorization"] = f"Bearer {LANGFLOW_API_KEY}"

    url = f"{LANGFLOW_API_URL}/api/v1/run/{LANGFLOW_FLOW_ID}?stream=true"

    async def stream_langflow() -> bytes:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=langflow_body, headers=headers) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    yield json.dumps({"type": "error", "detail": body.decode()}).encode() + b"\n"
                    return
                async for chunk in resp.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        stream_langflow(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
