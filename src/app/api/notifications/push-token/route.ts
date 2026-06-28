import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  type PushPlatform,
} from "@/lib/services/notificationPush";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    deviceId?: string;
    expoPushToken?: string;
    platform?: PushPlatform;
    appVersion?: string;
  };

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  if (!body.deviceId || !body.expoPushToken || !body.platform) {
    return NextResponse.json(
      { error: "deviceId, expoPushToken, and platform are required" },
      { status: 400 }
    );
  }

  try {
    const subscription = registerPushSubscription({
      workspaceId: auth.workspaceId,
      userId: auth.session.user.userId,
      deviceId: body.deviceId,
      expoPushToken: body.expoPushToken,
      platform: body.platform,
      appVersion: body.appVersion,
    });
    return NextResponse.json({ success: true, subscription });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token registration failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    workspaceId?: string;
    deviceId?: string;
    expoPushToken?: string;
  };

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  const removed = unregisterPushSubscription({
    workspaceId: auth.workspaceId,
    userId: auth.session.user.userId,
    deviceId: body.deviceId,
    expoPushToken: body.expoPushToken,
  });

  return NextResponse.json({ success: true, removed });
}
