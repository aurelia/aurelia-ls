/* =============================================================================
 * AOT SYNTHESIS - Public API
 * -----------------------------------------------------------------------------
 * IMPORTANT: Consumers should import from this barrel, not from deep paths.
 * Each synthesis target (overlay, aot) follows consistent export patterns.
 * ============================================================================= */

// -----------------------------------------------------------------------------
// Plan types (from plan stage)
// -----------------------------------------------------------------------------
export type {
  AotPlanModule,
  AotPlanOptions,
  PlanNode,
  PlanElementNode,
  PlanTextNode,
  PlanCommentNode,
  PlanFragmentNode,
  PlanBinding,
  PlanPropertyBinding,
  PlanAttributeBinding,
  PlanAttributeInterpolation,
  PlanStyleBinding,
  PlanListenerBinding,
  PlanRefBinding,
  PlanTextInterpolation,
  PlanStaticAttr,
  PlanCustomElement,
  PlanCustomAttr,
  PlanStaticProp,
  PlanProjection,
  PlanLetElement,
  PlanLetBinding,
  PlanController,
  PlanRepeatController,
  PlanIfController,
  PlanElseController,
  PlanWithController,
  PlanSwitchController,
  PlanPromiseController,
  PlanPortalController,
  PlanCaseBranch,
  PlanExpression,
  PlanScope,
  PlanScopeKind,
  PlanLocal,
  PlanLocalSource,
} from "./types.js";

// -----------------------------------------------------------------------------
// Emit types (from emit stage)
// -----------------------------------------------------------------------------
export type {
  AotCodeResult,
  SerializedDefinition,
  SerializedInstruction,
  SerializedExpression,
  SerializedPropertyBinding,
  SerializedInterpolation,
  SerializedTextBinding,
  SerializedListenerBinding,
  SerializedIteratorBinding,
  SerializedAuxBinding,
  SerializedRefBinding,
  SerializedSetProperty,
  SerializedSetAttribute,
  SerializedHydrateElement,
  SerializedHydrateAttribute,
  SerializedHydrateTemplateController,
  SerializedHydrateLetElement,
  SerializedLetBinding,
  AotMappingEntry,
} from "./types.js";

export type { AotEmitOptions } from "./emit.js";

// -----------------------------------------------------------------------------
// Template emit types (from emit-template stage)
// -----------------------------------------------------------------------------
export type {
  TemplateEmitResult,
  TemplateEmitOptions,
  NestedTemplateHtmlNode,
} from "./emit-template.js";

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------
export { planAot } from "./plan.js";
export { emitAotCode } from "./emit.js";
export {
  emitTemplate,
  collectNestedTemplateHtml,
  collectNestedTemplateHtmlTree,
} from "./emit-template.js";
