import type { AnalysisOptions, AnalysisResult, PackageAnalysis, InspectionResult } from "../../src/npm/index.js";
import { analyzePackage, inspect } from "../../src/npm/index.js";

type CacheKey = string;

const analysisCache = new Map<CacheKey, Promise<AnalysisResult<PackageAnalysis>>>();
const inspectCache = new Map<CacheKey, Promise<InspectionResult>>();
const cacheEnabled = process.env["AURELIA_TEST_CACHE"] !== "0";

function buildKey(kind: string, packagePath: string, options?: AnalysisOptions): CacheKey {
  return JSON.stringify({ kind, packagePath, options: options ?? null });
}

function getCached<T>(
  cache: Map<CacheKey, Promise<T>>,
  key: CacheKey,
  producer: () => Promise<T>,
): Promise<T> {
  if (!cacheEnabled) {
    return producer();
  }
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = producer();
  cache.set(key, pending);
  return pending;
}

export function analyzePackageCached(
  packagePath: string,
  options?: AnalysisOptions,
): Promise<AnalysisResult<PackageAnalysis>> {
  return getCached(analysisCache, buildKey("analyze", packagePath, options), () =>
    analyzePackage(packagePath, options)
  );
}

export function inspectCached(
  packagePath: string,
  options?: AnalysisOptions,
): Promise<InspectionResult> {
  return getCached(inspectCache, buildKey("inspect", packagePath, options), () =>
    inspect(packagePath, options)
  );
}

export function clearNpmAnalysisCache(): void {
  analysisCache.clear();
  inspectCache.clear();
}
