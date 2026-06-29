import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";

const DEFAULT_STT_MODEL = "scribe_v1";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured on this server" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "audio file is empty" }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio file exceeds 10MB limit" }, { status: 413 });
  }

  try {
    const payload = new FormData();
    payload.append("model_id", DEFAULT_STT_MODEL);
    payload.append(
      "file",
      new Blob([await audio.arrayBuffer()], { type: audio.type || "audio/webm" }),
      audio.name || "voice.webm"
    );

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
      },
      body: payload,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs transcription failed (${response.status})`, details },
        { status: 502 }
      );
    }

    const data = (await response.json().catch(() => ({}))) as {
      text?: string;
      transcript?: string;
    };

    const transcript = (data.text ?? data.transcript ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to transcribe audio",
      },
      { status: 500 }
    );
  }
}
