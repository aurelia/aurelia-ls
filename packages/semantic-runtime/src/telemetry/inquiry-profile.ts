/**
 * Consumer-shaped cost lane for semantic-runtime telemetry.
 *
 * This is not a product feature flag and not a ranking persona. It names the latency and retention expectations behind
 * a measurement so CPU/memory trade-offs can be discussed at the inquiry boundary instead of hidden in caches.
 */
export const SEMANTIC_RUNTIME_INQUIRY_PROFILES = [
  /** Cursor-local LSP/IDE work: low latency, narrow locus, careful warm caches. */
  'lsp-cursor',
  /** File/project diagnostic work: batch-friendly, can spend more CPU, should keep retained state bounded. */
  'lsp-diagnostics',
  /** MCP first-read orientation: compact public summaries and continuations, avoid deep semantic layers by default. */
  'mcp-orientation',
  /** MCP authoring/repair work: deeper semantic effects are allowed when the user asks for a deliberate operation. */
  'mcp-authoring',
  /** AOT/build-time work: deterministic and cacheable, but should avoid retaining editor-only detail. */
  'aot',
  /** SSR/SSG work: build/render oriented, usually batch-time, should not inherit LSP cursor caches by accident. */
  'ssr',
  /** Fixture generation and verification: deliberate deep checks against expected effects are acceptable. */
  'fixture',
  /** Unclassified local profiling; use this only before a better consumer lane is known. */
  'exploration',
] as const;

export type SemanticRuntimeInquiryProfile = typeof SEMANTIC_RUNTIME_INQUIRY_PROFILES[number];

export const DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE: SemanticRuntimeInquiryProfile = 'exploration';

export interface SemanticRuntimeInquiryProfileDefinition {
  readonly profile: SemanticRuntimeInquiryProfile;
  readonly summary: string;
  readonly latencyExpectation: 'instant' | 'interactive' | 'background' | 'batch' | 'build-time' | 'exploratory';
  readonly cacheBias: 'warm-local' | 'bounded-retention' | 'recompute-ok' | 'deterministic-cache' | 'deep-operation';
}

const semanticRuntimeInquiryProfileDefinitions: readonly SemanticRuntimeInquiryProfileDefinition[] = [
  {
    profile: 'lsp-cursor',
    summary: 'Cursor-local editor inquiry; optimize for low latency and localized warm state.',
    latencyExpectation: 'instant',
    cacheBias: 'warm-local',
  },
  {
    profile: 'lsp-diagnostics',
    summary: 'File/project diagnostics; slower background work is acceptable when retained state stays bounded.',
    latencyExpectation: 'background',
    cacheBias: 'bounded-retention',
  },
  {
    profile: 'mcp-orientation',
    summary: 'Public MCP first-read orientation; prefer compact summaries and shallow semantic layers.',
    latencyExpectation: 'interactive',
    cacheBias: 'recompute-ok',
  },
  {
    profile: 'mcp-authoring',
    summary: 'Public MCP authoring or repair operation; deeper semantic verification is deliberate.',
    latencyExpectation: 'background',
    cacheBias: 'deep-operation',
  },
  {
    profile: 'aot',
    summary: 'Ahead-of-time build inquiry; deterministic recomputation/cache is preferable to editor-only retention.',
    latencyExpectation: 'build-time',
    cacheBias: 'deterministic-cache',
  },
  {
    profile: 'ssr',
    summary: 'SSR/SSG inquiry; batch/render oriented and separate from cursor-time editor caches.',
    latencyExpectation: 'build-time',
    cacheBias: 'deterministic-cache',
  },
  {
    profile: 'fixture',
    summary: 'Fixture generation or verification inquiry; deep expected-effect checks are acceptable.',
    latencyExpectation: 'batch',
    cacheBias: 'deep-operation',
  },
  {
    profile: 'exploration',
    summary: 'Unclassified local profiling lane used before the consumer shape is known.',
    latencyExpectation: 'exploratory',
    cacheBias: 'bounded-retention',
  },
];

export function normalizeSemanticRuntimeInquiryProfile(
  profile: SemanticRuntimeInquiryProfile | string | null | undefined,
): SemanticRuntimeInquiryProfile {
  if (profile == null || profile === '') {
    return DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE;
  }
  if ((SEMANTIC_RUNTIME_INQUIRY_PROFILES as readonly string[]).includes(profile)) {
    return profile as SemanticRuntimeInquiryProfile;
  }
  throw new Error(`Unknown semantic-runtime inquiry profile '${profile}'.`);
}

export function readSemanticRuntimeInquiryProfileDefinition(
  profile: SemanticRuntimeInquiryProfile | string | null | undefined,
): SemanticRuntimeInquiryProfileDefinition {
  const normalized = normalizeSemanticRuntimeInquiryProfile(profile);
  return semanticRuntimeInquiryProfileDefinitions.find((definition) => definition.profile === normalized)!;
}

export function readSemanticRuntimeInquiryProfileDefinitions(): readonly SemanticRuntimeInquiryProfileDefinition[] {
  return semanticRuntimeInquiryProfileDefinitions;
}

