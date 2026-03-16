import { NextRequest, NextResponse } from "next/server";
import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import * as bcrypt from "bcryptjs";
import { generateId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check for existing user
    const existing = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.users,
      [Query.equal("email", email.toLowerCase()), Query.limit(1)]
    );
    if (existing.documents.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Create user in Appwrite
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = generateId("usr");

    await db.createDocument(
      DATABASE_ID,
      COLLECTIONS.users,
      userId,
      {
        workspaceId: "ws-001", // TODO: create per-user workspace
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: "owner",
      }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
