import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Client, Storage, Databases, ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from "@/lib/appwrite";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side validation
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Convert Next.js File to Buffer for node-appwrite
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Server-Side Appwrite SDK
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
      .setKey(process.env.APPWRITE_API_KEY!);

    const storage = new Storage(client);
    const db = new Databases(client);

    // Upload to Appwrite Storage Bucket
    const uploadResult = await storage.createFile(
      STORAGE_BUCKET_ID,
      ID.unique(),
      InputFile.fromBuffer(buffer, file.name)
    );

    // Derive file view endpoint
    const avatarUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${uploadResult.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;

    // Update User Document with new Avatar
    await db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.users,
      session.user.userId,
      { imageUrl: avatarUrl }
    );

    return NextResponse.json({ success: true, url: avatarUrl });
  } catch (error: any) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
