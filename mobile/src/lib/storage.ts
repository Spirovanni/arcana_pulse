import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const AUTH_SESSION_KEY = "mobile:auth:session";
const DEVICE_ID_KEY = "mobile:device:id";

export async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, payload: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

export async function readAuthSession<T>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

export async function writeAuthSession<T>(payload: T): Promise<void> {
  const serialized = JSON.stringify(payload);
  try {
    await SecureStore.setItemAsync(AUTH_SESSION_KEY, serialized);
  } catch {
    await AsyncStorage.setItem(AUTH_SESSION_KEY, serialized);
  }
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_SESSION_KEY).catch(() => undefined),
    AsyncStorage.removeItem(AUTH_SESSION_KEY),
  ]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `dev_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}
