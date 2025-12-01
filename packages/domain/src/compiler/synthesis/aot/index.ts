/* =============================================================================
 * AOT SYNTHESIS - Public API
 * -----------------------------------------------------------------------------
 * Re-exports the public surface for AOT compilation.
 * ============================================================================= */

// Types
export type {
  // Plan types
  AotPlan,
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
  PlanController,
  PlanRepeatController,
  PlanIfController,
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

  // Emit types
  AotCodeResult,
  SerializedDefinition,
  SerializedInstruction,
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
  SerializedExpression,

  // Mapping types
  AotMappingEntry,
} from "./types.js";

// Plan function
export { buildAotPlan } from "./plan.js";
