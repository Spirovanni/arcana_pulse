import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID;
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_DEFAULT_MODEL_ID ?? "eleven_turbo_v2";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    workspaceId?: string;
  };

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey || !DEFAULT_VOICE_ID) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured on this server" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: body.text.trim().slice(0, 2500),
          model_id: DEFAULT_MODEL_ID,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
          },
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs request failed (${response.status})`, details },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate ElevenLabs speech",
      },
      { status: 500 }
    );
  }
}
