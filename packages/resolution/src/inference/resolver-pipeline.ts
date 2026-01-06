import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { SourceFacts, AnalysisResult, AnalysisGap, Confidence } from "../extraction/types.js";
import { compareConfidence } from "../extraction/types.js";
import type { ResourceCandidate, BindableSpec } from "./types.js";
import type { ConventionConfig } from "../conventions/types.js";
import { resolveFromDecorators } from "./decorator-resolver.js";
import { resolveFromStaticAu } from "./static-au-resolver.js";
import { resolveFromConventions } from "./convention-resolver.js";

/**
 * Pipeline that runs multiple resolvers in priority order.
 */
export interface ResolverPipeline {
  resolve(facts: Map<NormalizedPath, SourceFacts>): AnalysisResult<ResourceCandidate[]>;
}

/**
 * Create a resolver pipeline with priority ordering.
 *
 * Priority order (highest to lowest):
 * 1. Decorator resolver - explicit @customElement, etc.
 * 2. Static $au resolver - explicit static $au = {...}
 * 3. Convention resolver - inferred from naming
 *
 * Higher priority wins on conflicts, but bindables are merged.
 *
 * Returns high confidence for in-project resolution — all resolvers
 * provide deterministic results.
 */
export function createResolverPipeline(config?: ConventionConfig): ResolverPipeline {
  return {
    resolve(facts) {
      const candidates = new Map<string, ResourceCandidate>();
      const allGaps: AnalysisGap[] = [];
      let lowestConfidence: Confidence = 'exact';

      for (const [_path, fileFacts] of facts) {
        // 1. Decorator resolver (highest priority)
        const decoratorResult = resolveFromDecorators(fileFacts);
        mergeResult(candidates, decoratorResult.value);
        allGaps.push(...decoratorResult.gaps);
        if (compareConfidence(decoratorResult.confidence, lowestConfidence) < 0) {
          lowestConfidence = decoratorResult.confidence;
        }

        // 2. Static $au resolver
        const staticAuResult = resolveFromStaticAu(fileFacts);
        mergeResult(candidates, staticAuResult.value);
        allGaps.push(...staticAuResult.gaps);
        if (compareConfidence(staticAuResult.confidence, lowestConfidence) < 0) {
          lowestConfidence = staticAuResult.confidence;
        }

        // 3. Convention resolver (lowest priority)
        const conventionResult = resolveFromConventions(fileFacts, config);
        mergeResult(candidates, conventionResult.value);
        allGaps.push(...conventionResult.gaps);
        if (compareConfidence(conventionResult.confidence, lowestConfidence) < 0) {
          lowestConfidence = conventionResult.confidence;
        }
      }

      return {
        value: Array.from(candidates.values()),
        confidence: lowestConfidence,
        gaps: allGaps,
      };
    },
  };
}

function mergeResult(
  target: Map<string, ResourceCandidate>,
  newCandidates: ResourceCandidate[],
): void {
  for (const candidate of newCandidates) {
    const key = `${candidate.kind}:${candidate.name}`;
    const existing = target.get(key);

    if (!existing) {
      target.set(key, candidate);
    } else if (existing.confidence === "inferred" && candidate.confidence === "explicit") {
      // Explicit wins over inferred
      target.set(key, mergeCandidate(candidate, existing));
    } else if (existing.confidence === "explicit" && candidate.confidence === "inferred") {
      // Keep existing explicit, but merge any additional info
      target.set(key, mergeCandidate(existing, candidate));
    } else {
      // Same confidence - keep first (higher priority resolver)
      // but merge bindables from later
      target.set(key, mergeCandidate(existing, candidate));
    }
  }
}

/**
 * Merge two candidates, preferring properties from primary.
 * Bindables and aliases are merged.
 */
function mergeCandidate(
  primary: ResourceCandidate,
  secondary: ResourceCandidate,
): ResourceCandidate {
  // Merge aliases (union)
  const aliasSet = new Set([...primary.aliases, ...secondary.aliases]);
  const aliases = Array.from(aliasSet).sort();

  // Merge bindables (primary wins on conflicts)
  const bindableMap = new Map<string, BindableSpec>();
  for (const b of secondary.bindables) {
    bindableMap.set(b.name, b);
  }
  for (const b of primary.bindables) {
    const existing = bindableMap.get(b.name);
    if (existing) {
      // Merge: primary wins, but take type from secondary if primary doesn't have it
      const mergedType = b.type ?? existing.type;
      const merged: BindableSpec = {
        ...existing,
        ...b,
        ...(mergedType !== undefined ? { type: mergedType } : {}),
      };
      bindableMap.set(b.name, merged);
    } else {
      bindableMap.set(b.name, b);
    }
  }
  const bindables = Array.from(bindableMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Compute merged optional properties
  const containerless = primary.containerless ?? secondary.containerless;
  const boundary = primary.boundary ?? secondary.boundary;
  const isTemplateController = primary.isTemplateController ?? secondary.isTemplateController;
  const noMultiBindings = primary.noMultiBindings ?? secondary.noMultiBindings;
  const primaryProp = primary.primary ?? secondary.primary;

  // Build result with all properties in one object literal
  return {
    kind: primary.kind,
    name: primary.name,
    source: primary.source,
    className: primary.className,
    aliases,
    bindables,
    confidence: primary.confidence,
    resolver: primary.resolver,
    ...(containerless !== undefined ? { containerless } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
    ...(isTemplateController !== undefined ? { isTemplateController } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(primaryProp !== undefined ? { primary: primaryProp } : {}),
  };
}
