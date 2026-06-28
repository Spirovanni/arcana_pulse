interface AnalysisCacheEntry<T> {
  value: T;
  analyzedAt: string;
}

const analysisCache = new Map<string, AnalysisCacheEntry<unknown>>();

export function getAnalysisCache<T>(key: string): AnalysisCacheEntry<T> | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  return entry as AnalysisCacheEntry<T>;
}

export function setAnalysisCache<T>(
  key: string,
  value: T
): AnalysisCacheEntry<T> {
  const entry: AnalysisCacheEntry<T> = {
    value,
    analyzedAt: new Date().toISOString(),
  };
  analysisCache.set(key, entry as AnalysisCacheEntry<unknown>);
  return entry;
}
