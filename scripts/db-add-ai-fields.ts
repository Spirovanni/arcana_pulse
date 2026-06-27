/**
 * Migration: add aiCategory and aiConfidence to the transactions collection.
 *
 * Run once against a database created before these fields were added to db-setup.ts:
 *
 *   npx tsx scripts/db-add-ai-fields.ts
 *
 * Required env vars:
 *   APPWRITE_ENDPOINT    (default: https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 */

import { Client, Databases } from "node-appwrite";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "arcana_pulse";
const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  process.env.APPWRITE_ENDPOINT ??
  "https://cloud.appwrite.io/v1";
const projectId =
  process.env.APPWRITE_PROJECT_ID ?? process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !apiKey) {
  console.error("Missing required env vars: APPWRITE_PROJECT_ID, APPWRITE_API_KEY");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new Databases(client);

async function addAttribute(
  collection: string,
  key: string,
  createFn: () => Promise<unknown>
) {
  try {
    await createFn();
    console.log(`  ✓ Added ${key} to ${collection}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("Attribute with the requested key")) {
      console.log(`  — ${key} already exists in ${collection}, skipping`);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log("Migration: add aiCategory + aiConfidence to transactions");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}\n`);

  await addAttribute("transactions", "aiCategory", () =>
    db.createStringAttribute(DATABASE_ID, "transactions", "aiCategory", 32, false)
  );

  await addAttribute("transactions", "aiConfidence", () =>
    db.createFloatAttribute(DATABASE_ID, "transactions", "aiConfidence", false)
  );

  console.log("\nDone — attributes added. Appwrite may take a few seconds to index them.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
