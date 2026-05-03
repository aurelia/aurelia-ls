import type { FrameworkDiscoveryFilters } from "./framework-filters.js";

/** Coarse TemplateCompiler compile-flow stage. */
export type FrameworkCompileFlowStage =
  | "compile-entry"
  | "compile-spread"
  | "compile-context"
  | "template-materialization"
  | "compile-hooks"
  | "local-elements"
  | "local-element-registration"
  | "node-dispatch"
  | "element-compilation"
  | "element-definition-lookup"
  | "content-processing"
  | "attribute-classification"
  | "attribute-reordering"
  | "custom-attribute-bindables"
  | "multi-binding"
  | "element-instruction"
  | "instruction-merge"
  | "template-controller-wrapping"
  | "direct-child-compilation"
  | "surrogate-compilation"
  | "spread-element-definition-lookup"
  | "spread-attribute-compilation"
  | "slot-projection-extraction"
  | "let-element"
  | "text-binding"
  | "compiled-definition";

/** Detailed branch inside TemplateCompiler._classifyAttributes. */
export type FrameworkAttributeClassificationBranchKind =
  | "special-attribute"
  | "parse-attribute"
  | "binding-command-resolution"
  | "capture-forwarding"
  | "spread-transferred-attrs"
  | "ignored-binding-command"
  | "spread-bindables"
  | "element-bindable"
  | "element-bindables-command"
  | "reserved-bindables-error"
  | "attribute-resource-lookup"
  | "attribute-bindables"
  | "template-controller-instruction"
  | "custom-attribute-instruction"
  | "plain-interpolation"
  | "plain-static-attribute"
  | "plain-binding-command";

/** Shared filters accepted by framework.compiler projections. */
export interface FrameworkCompilerFilters extends FrameworkDiscoveryFilters {
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly compileStage?: FrameworkCompileFlowStage;
  readonly branchKind?: FrameworkAttributeClassificationBranchKind;
  readonly methodName?: string;
}
