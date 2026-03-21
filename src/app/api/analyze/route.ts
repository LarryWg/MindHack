import { type NextRequest, NextResponse } from "next/server";

const LANGFLOW_URL = process.env.LANGFLOW_API_URL ?? "http://localhost:7860";
const LANGFLOW_FLOW_ID = process.env.LANGFLOW_FLOW_ID ?? "";
const LANGFLOW_API_KEY = process.env.LANGFLOW_API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input_value, transcript, pause_map, session_id } = body;

    // Build the message to send to Langflow
    const message = input_value ?? transcript ?? "";
    if (!message) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    const langflowBody = {
      input_value: message,
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        // Attach pause map as metadata if from STT
        ...(pause_map ? { pause_map } : {}),
      },
      ...(session_id ? { session_id } : {}),
    };

    const res = await fetch(
      `${LANGFLOW_URL}/api/v1/run/${LANGFLOW_FLOW_ID}?stream=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(LANGFLOW_API_KEY ? { Authorization: `Bearer ${LANGFLOW_API_KEY}` } : {}),
        },
        body: JSON.stringify(langflowBody),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    // If Langflow returns streaming, pipe it through
    if (res.headers.get("content-type")?.includes("text/event-stream") || res.body) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-streaming fallback
    const data = await res.json();
    const message_out =
      data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ??
      data?.outputs?.[0]?.outputs?.[0]?.messages?.[0]?.message ??
      "No response received.";

    // Emit in NDJSON format matching Callio's stream protocol
    const lines = [
      JSON.stringify({ type: "end", message: message_out, session_id: data.session_id ?? session_id }),
    ].join("\n");

    return new Response(lines, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
