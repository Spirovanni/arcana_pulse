import Constants from "expo-constants";

export const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "https://www.arcanapulse.ai";

export const DEFAULT_WORKSPACE_ID = "ws-001";
