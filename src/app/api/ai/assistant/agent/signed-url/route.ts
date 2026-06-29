import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";

type SignedUrlResponse = {
  signed_url?: string;
  signedUrl?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
  };

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const agentId =
    process.env.ELEVENLABS_AGENT_ID ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  if (!elevenLabsKey || !agentId) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs agent mode is not configured on this server.",
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(
        agentId
      )}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Failed to create ElevenLabs signed session (${response.status})`, details },
        { status: 502 }
      );
    }

    const payload = (await response.json().catch(() => ({}))) as SignedUrlResponse;
    const signedUrl = payload.signed_url ?? payload.signedUrl;
    if (!signedUrl) {
      return NextResponse.json(
        { error: "ElevenLabs did not return a signed URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({ signedUrl });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize ElevenLabs agent session",
      },
      { status: 500 }
    );
  }
}
