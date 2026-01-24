import type { TextSpan } from '../compiler.js';
import type { ResourceEvidence, ResourcePattern } from "./types.js";

export function explicitEvidence(pattern: ResourcePattern, span?: TextSpan): ResourceEvidence {
  return { source: "analyzed", kind: "explicit", pattern, span };
}

export function inferredEvidence(pattern: ResourcePattern): ResourceEvidence {
  return { source: "analyzed", kind: "inferred", pattern };
}

export function declaredEvidence(origin: string): ResourceEvidence {
  return { source: "declared", origin };
}
