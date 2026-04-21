import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

export function getGoogleAIClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

export function isGoogleAIConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}
