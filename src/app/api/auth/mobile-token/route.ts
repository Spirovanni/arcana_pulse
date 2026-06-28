import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { verifySync } from "otplib";
import { decryptSafe } from "@/lib/crypto";
import { getDatabase, DATABASE_ID, COLLECTIONS, Query } from "@/lib/appwrite";
import { signMobileAccessToken } from "@/lib/auth/mobileToken";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mfaCode } = body as {
      email?: string;
      password?: string;
      mfaCode?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.users,
      [Query.equal("email", email.toLowerCase()), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = result.documents[0] as any;
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.mfaEnabled && user.mfaSecret) {
      const normalizedCode = mfaCode?.trim();
      if (!normalizedCode) {
        return NextResponse.json({ error: "MFA code is required" }, { status: 401 });
      }

      const mfaSecret = decryptSafe(user.mfaSecret as string);
      const mfaResult = verifySync({
        token: normalizedCode,
        secret: mfaSecret,
        strategy: "totp",
      });
      const totpValid = typeof mfaResult === "object" ? mfaResult.valid : mfaResult;

      if (!totpValid) {
        const recoveryCodes: string[] = JSON.parse(user.mfaRecoveryCodes ?? "[]");
        const normalizedRecovery = normalizedCode.toUpperCase().replace(/\s/g, "");
        const codeIndex = recoveryCodes.indexOf(normalizedRecovery);

        if (codeIndex === -1) {
          return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 });
        }

        recoveryCodes.splice(codeIndex, 1);
        await db.updateDocument(DATABASE_ID, COLLECTIONS.users, user.$id, {
          mfaRecoveryCodes: JSON.stringify(recoveryCodes),
        });
      }
    }

    const { token, expiresAt } = signMobileAccessToken({
      userId: user.$id,
      workspaceId: user.workspaceId ?? "ws-001",
      email: user.email,
      role: user.role ?? "viewer",
      membershipType: user.membershipType ?? "standard",
    });

    return NextResponse.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresAt,
      user: {
        userId: user.$id,
        workspaceId: user.workspaceId ?? "ws-001",
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        role: user.role ?? "viewer",
        membershipType: user.membershipType ?? "standard",
        imageUrl: user.imageUrl ?? null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to create mobile session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
