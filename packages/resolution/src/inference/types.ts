import type { NormalizedPath } from "@aurelia-ls/domain";
import type { BindingMode } from "../extraction/types.js";

/** Resource candidate identified by a resolver */
export interface ResourceCandidate {
  readonly kind: "element" | "attribute" | "valueConverter" | "bindingBehavior";
  readonly name: string;
  readonly source: NormalizedPath;
  readonly className: string;
  readonly aliases: readonly string[];
  readonly bindables: readonly BindableSpec[];
  readonly confidence: "explicit" | "inferred";
  readonly resolver: string; // "decorator" | "static-au" | "convention"

  // Element-specific
  readonly containerless?: boolean;
  readonly boundary?: boolean;
  /** Inline template content from decorator or static $au (string literal only) */
  readonly inlineTemplate?: string;

  // Attribute-specific
  readonly isTemplateController?: boolean;
  readonly noMultiBindings?: boolean;
  readonly primary?: string | null;
}

/** Bindable property specification */
export interface BindableSpec {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: string;
  readonly attribute?: string;
}

/** Result from a single resolver */
export interface ResolverResult {
  readonly candidates: readonly ResourceCandidate[];
  readonly diagnostics: readonly ResolverDiagnostic[];
}

/** Diagnostic from a resolver */
export interface ResolverDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly source: NormalizedPath;
  readonly severity: "error" | "warning" | "info";
}

/** Empty resolver result */
export function emptyResolverResult(): ResolverResult {
  return { candidates: [], diagnostics: [] };
}
