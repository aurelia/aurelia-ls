import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { BindingMode } from "../extraction/types.js";

/**
 * Resource candidate identified by a resolver.
 *
 * This is the in-project resolution result type. For npm package analysis,
 * see ExtractedResource in npm/types.ts.
 */
export interface ResourceCandidate {
  readonly kind: "element" | "attribute" | "valueConverter" | "bindingBehavior";
  readonly name: string;
  readonly source: NormalizedPath;
  readonly className: string;
  readonly aliases: readonly string[];
  readonly bindables: readonly BindableSpec[];

  /**
   * Evidence source: how we identified this resource.
   * - "explicit": decorator or static $au (authoritative)
   * - "inferred": naming convention (deterministic in-project)
   *
   * Note: This is distinct from AnalysisResult.confidence which is
   * about overall analysis certainty.
   */
  readonly confidence: "explicit" | "inferred";

  /** Which resolver identified this resource */
  readonly resolver: string; // "decorator" | "static-au" | "define" | "convention"

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
