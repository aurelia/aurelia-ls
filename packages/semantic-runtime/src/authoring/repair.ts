import type { OpenSeamReasonKind } from '../kernel/open-seam.js';

/**
 * Authoring repair ontology.
 *
 * Repair rows are not source edits. They are the typed handoff between observed diagnostics/open seams and later
 * authoring operations that can inspect, strengthen, rewrite, or defer a source change.
 */

export type AuthoringRepairKind =
  /** Declare a missing member on an existing owner type or view-model surface. */
  | 'declare-missing-member'
  /** Declare or infer the type for a template/runtime scope slot that currently exists only at runtime. */
  | 'declare-scope-slot-type'
  /** Replace an `any`/unknown/broad owner with a named surface that template tooling can inspect. */
  | 'strengthen-owner-type'
  /** Rewrite a binding source expression whose runtime assignment semantics are no-op or too weak to author safely. */
  | 'rewrite-binding-source'
  /** Rewrite authored template syntax that the Aurelia parser or template compiler rejects. */
  | 'rewrite-template-syntax'
  /** Align the source member/slot type with the value that the binding observer writes back. */
  | 'align-assignment-type'
  /** Make a target-to-source binding source writable, or point the binding at a writable source. */
  | 'make-source-writable'
  /** Inspect an owner/source type before choosing whether the app source or semantic substrate should change. */
  | 'inspect-type-surface'
  /** Inspect an open semantic seam before claiming an app-source repair is available. */
  | 'inspect-open-seam'
  /** Resolve a runtime-dependent boundary by adding explicit source/configuration or by leaving it intentionally open. */
  | 'resolve-runtime-boundary'
  /** Improve semantic-runtime substrate because the app shape appears legitimate but the emulator cannot model it yet. */
  | 'extend-semantic-substrate';

export type AuthoringRepairEvidenceKind =
  /** Repair pressure came from a template diagnostic row. */
  | 'template-diagnostic'
  /** Repair pressure came from an open semantic seam. */
  | 'open-seam';

export type AuthoringRepairPlanKind =
  /** Add or confirm declared members on a TypeScript-visible owner surface. */
  | 'source-member-declaration'
  /** Replace an `any`/unknown/broad owner with a named type surface that can be checked and navigated. */
  | 'source-owner-type-strengthening'
  /** Give a runtime template scope slot a TypeScript-visible type surface. */
  | 'template-scope-slot-typing'
  /** Rewrite an authored binding expression whose runtime write semantics are unsupported or misleading. */
  | 'template-expression-rewrite'
  /** Rewrite authored template syntax rejected by Aurelia parser/compiler semantics. */
  | 'template-syntax-rewrite'
  /** Change a source member/slot type so observer writeback is TypeScript-assignable. */
  | 'source-assignment-type-alignment'
  /** Change source mutability or choose a writable binding source for observer writeback. */
  | 'source-writeability-alignment'
  /** Make a runtime-dependent value boundary explicit in app source/configuration, or intentionally keep it open. */
  | 'runtime-boundary-declaration'
  /** Improve semantic-runtime/Atlas substrate because the app shape appears legitimate but is not modeled yet. */
  | 'semantic-substrate-extension'
  /** Inspect the source/type/runtime context before choosing app-source or substrate work. */
  | 'manual-inspection';

export type AuthoringRepairChangeDomain =
  /** The likely work belongs in user-authored app/package source. */
  | 'app-source'
  /** The likely work belongs in semantic-runtime, Atlas, or framework-grounding substrate. */
  | 'semantic-runtime-substrate'
  /** The likely work is a product/user decision around static treatment of runtime values. */
  | 'runtime-policy'
  /** The cluster is not ready to name a change domain without more inspection. */
  | 'inspection';

export type AuthoringRepairPlanReadiness =
  /** The cluster is specific enough to feed a future edit planner once that planner exists. */
  | 'ready-to-plan'
  /** Source-edit placement/formatting/import policy is still the blocker, not semantic understanding. */
  | 'source-edit-policy-open'
  /** Some rows have a concrete action-target source and some do not. */
  | 'target-source-partial'
  /** The cluster targets app source, but no action-target source is available yet. */
  | 'target-source-missing'
  /** A runtime-dependent boundary needs user/product intent before the product should suggest an edit. */
  | 'runtime-intent-required'
  /** The app shape points at missing semantic-runtime/Atlas substrate before app-source repair is honest. */
  | 'substrate-work-required'
  /** The cluster only promises inspection until the source/type context is understood. */
  | 'inspection-required';

export type AuthoringRepairRuntimeBoundaryKind =
  /** The value is supplied by the host environment rather than authored source. */
  | 'host-environment'
  /** The value crosses an external module boundary that the current source program cannot inspect. */
  | 'external-module'
  /** The value is produced by async execution that static app-world construction does not run. */
  | 'async-execution'
  /** A binding source expression needs live runtime state to produce a concrete value. */
  | 'binding-source-value'
  /** A binding source slot exists at runtime but has no statically projected value. */
  | 'binding-source-slot'
  /** A binding source member exists only as a runtime member read, not a static value. */
  | 'binding-source-member'
  /** A binding source expression shape is outside the static value reader's modeled expression set. */
  | 'binding-source-expression'
  /** Select observer modeling could not close the target element or observer value carrier. */
  | 'select-target'
  /** Select observer modeling could not close an option's value/model product. */
  | 'select-option-value'
  /** Select observer modeling could not close the option value domain. */
  | 'select-option-domain'
  /** Select observer modeling could not statically decide the select's multiple-value behavior. */
  | 'select-multiple-state'
  /** Router instruction materialization lacks the route context needed to resolve navigation. */
  | 'router-context'
  /** Router instruction materialization needs a statically enumerable target value. */
  | 'router-static-instruction'
  /** Router href materialization cannot decide whether the href is external or router-owned. */
  | 'router-href-classification'
  /** Router href click handling is disabled by host element state while href value generation remains active. */
  | 'router-href-click-interception'
  /** Router instruction materialization did not receive a usable navigation value. */
  | 'router-instruction-value'
  /** Router instruction parsing failed before a navigation product could be formed. */
  | 'router-instruction-syntax'
  /** Router viewport resolution cannot close the target viewport/agent edge. */
  | 'router-viewport'
  /** Router redirect materialization cannot close the redirect target. */
  | 'router-redirect';

export type AuthoringRepairRuntimeIntentKind =
  /** Add or point at a source-visible contract for host-provided values. */
  | 'declare-host-contract'
  /** Add or point at a source-visible contract for external module values. */
  | 'declare-import-contract'
  /** Add an explicit async/loading boundary instead of treating the value as static. */
  | 'declare-async-boundary'
  /** Strengthen the source/type surface so binding values are visible without executing runtime state. */
  | 'strengthen-binding-source'
  /** Rewrite an expression into a modeled binding expression shape. */
  | 'rewrite-binding-expression'
  /** Strengthen select value/option/domain typing or admit that the live DOM state remains dynamic. */
  | 'strengthen-select-domain'
  /** Declare or select the route context used to interpret a navigation instruction. */
  | 'declare-router-context'
  /** Declare a static route/navigation target or typed pattern that the route recognizer can enumerate. */
  | 'declare-static-navigation-target'
  /** Decide whether a dynamic href is external-link intent, internal-router intent, or intentionally runtime-only. */
  | 'choose-router-href-ownership'
  /** Mark a router-managed href as native/external when the app intends ordinary browser navigation. */
  | 'declare-external-href'
  /** Rewrite malformed or unsupported router instruction syntax. */
  | 'fix-router-instruction-syntax'
  /** Declare the viewport or viewport-agent target that owns a routed component activation. */
  | 'declare-viewport-target'
  /** Declare a redirect target or leave it intentionally runtime-dependent. */
  | 'declare-redirect-target';

export type AuthoringRepairTargetSourceCoverage =
  | 'all'
  | 'some'
  | 'none'
  | 'not-applicable';

export function repairKindForDiagnosticSuggestion(
  suggestionKind: string | null | undefined,
): AuthoringRepairKind {
  switch (suggestionKind) {
    case 'fix-expression-syntax':
    case 'fix-template-syntax':
      return 'rewrite-template-syntax';
    case 'declare-explicit-member':
    case 'declare-assignable-member':
      return 'declare-missing-member';
    case 'declare-scope-slot-type':
      return 'declare-scope-slot-type';
    case 'align-assignment-type':
      return 'align-assignment-type';
    case 'make-source-writable':
      return 'make-source-writable';
    case 'replace-any-owner':
      return 'strengthen-owner-type';
    case 'register-resource':
    case 'resolve-runtime-boundary':
    case 'configure-node-observer':
      return 'resolve-runtime-boundary';
    case 'remove-duplicate-binding-behavior':
    case 'use-assignable-expression':
      return 'rewrite-binding-source';
    case 'inspect-owner-type':
    default:
      return 'inspect-type-surface';
  }
}

export function repairKindForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): AuthoringRepairKind {
  if (reasonKinds.some((reasonKind) =>
    reasonKind === 'host-environment-value'
    || reasonKind === 'external-module-value'
    || reasonKind === 'async-execution-value'
    || reasonKind === 'binding-source-needs-runtime-value'
    || reasonKind === 'binding-source-slot-no-static-value'
    || reasonKind === 'binding-source-member-no-static-value'
    || reasonKind === 'binding-value-channel-dynamic-select-multiple'
    || reasonKind === 'router-instruction-needs-route-context'
    || reasonKind === 'router-instruction-needs-static-value'
    || reasonKind === 'router-href-externality-open'
    || reasonKind === 'router-href-click-interception-disabled'
    || reasonKind === 'router-href-click-interception-target-open'
    || reasonKind === 'router-instruction-missing-value'
    || reasonKind === 'router-viewport-resolution-open'
    || reasonKind === 'router-redirect-target-open'
  )) {
    return 'resolve-runtime-boundary';
  }
  if (reasonKinds.length > 0) {
    return 'extend-semantic-substrate';
  }
  return 'inspect-open-seam';
}

export function repairPlanKindForRepair(
  repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`,
  actionKind: string | null,
  actionTargetKind: string | null,
): AuthoringRepairPlanKind {
  switch (repairKind) {
    case 'declare-missing-member':
      return actionTargetKind === 'scope-slot'
        ? 'template-scope-slot-typing'
        : 'source-member-declaration';
    case 'declare-scope-slot-type':
      return 'template-scope-slot-typing';
    case 'strengthen-owner-type':
      return 'source-owner-type-strengthening';
    case 'rewrite-binding-source':
      return actionKind === 'rewrite-expression'
        ? 'template-expression-rewrite'
        : 'manual-inspection';
    case 'rewrite-template-syntax':
      return 'template-syntax-rewrite';
    case 'align-assignment-type':
      return 'source-assignment-type-alignment';
    case 'make-source-writable':
      return 'source-writeability-alignment';
    case 'resolve-runtime-boundary':
      return 'runtime-boundary-declaration';
    case 'extend-semantic-substrate':
      return 'semantic-substrate-extension';
    case 'inspect-type-surface':
    case 'inspect-open-seam':
    default:
      return 'manual-inspection';
  }
}

export function repairChangeDomainForPlan(
  planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`,
): AuthoringRepairChangeDomain {
  switch (planKind) {
    case 'source-member-declaration':
    case 'source-owner-type-strengthening':
    case 'template-scope-slot-typing':
    case 'template-expression-rewrite':
    case 'template-syntax-rewrite':
    case 'source-assignment-type-alignment':
    case 'source-writeability-alignment':
      return 'app-source';
    case 'runtime-boundary-declaration':
      return 'runtime-policy';
    case 'semantic-substrate-extension':
      return 'semantic-runtime-substrate';
    case 'manual-inspection':
    default:
      return 'inspection';
  }
}

export function repairPlanReadinessForCluster(
  planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`,
  actionTargetSourceCoverage: AuthoringRepairTargetSourceCoverage,
  openReasonKinds: readonly string[],
): AuthoringRepairPlanReadiness {
  switch (repairChangeDomainForPlan(planKind)) {
    case 'semantic-runtime-substrate':
      return 'substrate-work-required';
    case 'runtime-policy':
      return 'runtime-intent-required';
    case 'inspection':
      return 'inspection-required';
    case 'app-source':
      break;
  }

  if (actionTargetSourceCoverage === 'none' || actionTargetSourceCoverage === 'not-applicable') {
    return 'target-source-missing';
  }
  if (actionTargetSourceCoverage === 'some') {
    return 'target-source-partial';
  }
  return openReasonKinds.includes('source-edit-policy-open')
    ? 'source-edit-policy-open'
    : 'ready-to-plan';
}

export function repairRuntimeBoundaryKindsForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): readonly AuthoringRepairRuntimeBoundaryKind[] {
  return uniqueSorted(reasonKinds.flatMap((reasonKind) => runtimeBoundaryKindsForOpenSeamReason(reasonKind)));
}

export function repairRuntimeIntentKindsForOpenSeamReasons(
  reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[],
): readonly AuthoringRepairRuntimeIntentKind[] {
  return uniqueSorted(reasonKinds.flatMap((reasonKind) => runtimeIntentKindsForOpenSeamReason(reasonKind)));
}

function runtimeBoundaryKindsForOpenSeamReason(
  reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`,
): readonly AuthoringRepairRuntimeBoundaryKind[] {
  switch (reasonKind) {
    case 'host-environment-value':
      return ['host-environment'];
    case 'external-module-value':
      return ['external-module'];
    case 'async-execution-value':
      return ['async-execution'];
    case 'binding-source-needs-runtime-value':
      return ['binding-source-value'];
    case 'binding-source-slot-no-static-value':
      return ['binding-source-slot'];
    case 'binding-source-member-no-static-value':
      return ['binding-source-member'];
    case 'binding-source-unsupported-expression':
      return ['binding-source-expression'];
    case 'binding-value-channel-select-target-open':
      return ['select-target'];
    case 'binding-value-channel-select-option-value-open':
      return ['select-option-value'];
    case 'binding-value-channel-select-option-domain-open':
      return ['select-option-domain'];
    case 'binding-value-channel-select-multiple-source-open':
    case 'binding-value-channel-dynamic-select-multiple':
      return ['select-multiple-state'];
    case 'router-instruction-needs-route-context':
      return ['router-context'];
    case 'router-instruction-needs-static-value':
      return ['router-static-instruction'];
    case 'router-href-externality-open':
      return ['router-href-classification'];
    case 'router-href-click-interception-disabled':
    case 'router-href-click-interception-target-open':
      return ['router-href-click-interception'];
    case 'router-instruction-missing-value':
      return ['router-instruction-value'];
    case 'router-instruction-parse-failure':
      return ['router-instruction-syntax'];
    case 'router-viewport-resolution-open':
      return ['router-viewport'];
    case 'router-redirect-target-open':
      return ['router-redirect'];
    default:
      return [];
  }
}

function runtimeIntentKindsForOpenSeamReason(
  reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`,
): readonly AuthoringRepairRuntimeIntentKind[] {
  switch (reasonKind) {
    case 'host-environment-value':
      return ['declare-host-contract'];
    case 'external-module-value':
      return ['declare-import-contract'];
    case 'async-execution-value':
      return ['declare-async-boundary'];
    case 'binding-source-needs-runtime-value':
    case 'binding-source-slot-no-static-value':
    case 'binding-source-member-no-static-value':
      return ['strengthen-binding-source'];
    case 'binding-source-unsupported-expression':
      return ['rewrite-binding-expression'];
    case 'binding-value-channel-select-target-open':
    case 'binding-value-channel-select-option-value-open':
    case 'binding-value-channel-select-option-domain-open':
    case 'binding-value-channel-select-multiple-source-open':
    case 'binding-value-channel-dynamic-select-multiple':
      return ['strengthen-select-domain'];
    case 'router-instruction-needs-route-context':
      return ['declare-router-context'];
    case 'router-instruction-needs-static-value':
    case 'router-instruction-missing-value':
      return ['declare-static-navigation-target'];
    case 'router-href-externality-open':
      return ['choose-router-href-ownership'];
    case 'router-href-click-interception-disabled':
      return ['declare-external-href'];
    case 'router-href-click-interception-target-open':
      return ['declare-host-contract'];
    case 'router-instruction-parse-failure':
      return ['fix-router-instruction-syntax'];
    case 'router-viewport-resolution-open':
      return ['declare-viewport-target'];
    case 'router-redirect-target-open':
      return ['declare-redirect-target'];
    default:
      return [];
  }
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort();
}
