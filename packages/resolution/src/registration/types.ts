import type { NormalizedPath } from "@aurelia-ls/domain";
import type { ResourceCandidate } from "../inference/types.js";

/**
 * How a resource is intended to be registered.
 */
export interface RegistrationIntent {
  readonly resource: ResourceCandidate;
  readonly kind: "global" | "local" | "unknown";
  /** For local: the component that owns this resource in its dependencies */
  readonly scope: NormalizedPath | null;
  readonly evidence: readonly RegistrationEvidence[];
}

/**
 * Evidence supporting a registration intent.
 */
export type RegistrationEvidence =
  | { readonly kind: "aurelia-register"; readonly file: NormalizedPath; readonly position: Position }
  | { readonly kind: "container-register"; readonly file: NormalizedPath; readonly position: Position }
  | { readonly kind: "static-dependencies"; readonly component: NormalizedPath; readonly className: string }
  | { readonly kind: "inferred"; readonly reason: string };

/**
 * Source position.
 */
export interface Position {
  readonly line: number;
  readonly character: number;
}

/**
 * Import graph for tracing registration flow.
 */
export interface ImportGraph {
  /** Get files that import the given file */
  getImporters(file: NormalizedPath): readonly NormalizedPath[];

  /** Get files imported by the given file */
  getImports(file: NormalizedPath): readonly NormalizedPath[];

  /** Get all known files in the graph */
  getAllFiles(): readonly NormalizedPath[];
}
