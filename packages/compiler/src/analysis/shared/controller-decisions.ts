import type {
  BindingSourceIR,
  BindingMode,
  ControllerBindableIR,
  ControllerBranchInfo,
  ExprRef,
} from "../../model/ir.js";
import type { ControllerConfig } from "../../schema/registry.js";

export const CONTROLLER_DECISION_POLICY_VERSION = "aurelia-controller-decisions/1" as const;

export type PromiseBranchKind = "then" | "catch" | "pending";

const PROMISE_BRANCH_KIND_SET = new Set<PromiseBranchKind>(["then", "catch", "pending"]);

export function isPromiseBranchName(name: string): name is PromiseBranchKind {
  return PROMISE_BRANCH_KIND_SET.has(name as PromiseBranchKind);
}

export function resolvePromiseBranchKind(
  config: ControllerConfig | null | undefined,
): PromiseBranchKind | null {
  if (!config) return null;
  if (config.linksTo !== "promise") return null;
  if (config.trigger.kind !== "branch") return null;
  return isPromiseBranchName(config.name) ? config.name : null;
}

export function isPromiseParentController(config: ControllerConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.trigger.kind !== "value") return false;
  if (config.scope !== "overlay") return false;
  if (config.branches?.relationship !== "child") return false;
  return config.branches.names.some(isPromiseBranchName);
}

export type ControllerAttributeDecisionReason =
  | "accepted"
  | "missing-controller"
  | "promise-branch-specialized"
  | "iterator-command-mismatch";

export interface ControllerAttributeDecision {
  readonly accepted: boolean;
  readonly reason: ControllerAttributeDecisionReason;
  readonly expectedCommand?: string;
}

export function planControllerAttribute(
  config: ControllerConfig | null | undefined,
  authoredCommand: string | null,
): ControllerAttributeDecision {
  if (!config) {
    return { accepted: false, reason: "missing-controller" };
  }
  if (resolvePromiseBranchKind(config)) {
    return { accepted: false, reason: "promise-branch-specialized" };
  }
  if (config.trigger.kind === "iterator" && config.trigger.command && authoredCommand !== config.trigger.command) {
    return {
      accepted: false,
      reason: "iterator-command-mismatch",
      expectedCommand: config.trigger.command,
    };
  }
  return { accepted: true, reason: "accepted" };
}

export type BareControllerValueMode = "expression" | "literal-string";
export type BareControllerValueReason = "default-expression" | "teleported-placement-literal";

export interface BareControllerValueDecision {
  readonly mode: BareControllerValueMode;
  readonly reason: BareControllerValueReason;
}

export function planControllerBareValue(config: ControllerConfig): BareControllerValueDecision {
  if (config.placement === "teleported") {
    return {
      mode: "literal-string",
      reason: "teleported-placement-literal",
    };
  }
  return {
    mode: "expression",
    reason: "default-expression",
  };
}

export type ControllerBranchDecisionReason =
  | "none"
  | "promise-branch"
  | "switch-case"
  | "switch-default"
  | "switch-case-missing-expr";

export interface ControllerBranchDecision {
  readonly branch: ControllerBranchInfo | null;
  readonly reason: ControllerBranchDecisionReason;
}

export function planControllerBranchInfo(
  config: ControllerConfig,
  authoredRaw: string,
  props: readonly ControllerBindableIR[],
): ControllerBranchDecision {
  const promiseBranchKind = resolvePromiseBranchKind(config);
  if (promiseBranchKind) {
    if (promiseBranchKind === "pending") {
      return { branch: { kind: "pending" }, reason: "promise-branch" };
    }
    const alias = authoredRaw.trim();
    return {
      branch: { kind: promiseBranchKind, ...(alias.length > 0 ? { local: alias } : {}) },
      reason: "promise-branch",
    };
  }

  if (config.linksTo !== "switch") {
    return { branch: null, reason: "none" };
  }

  if (config.trigger.kind === "marker") {
    return { branch: { kind: "default" }, reason: "switch-default" };
  }

  if (config.trigger.kind === "branch") {
    const valueExpr = findValueExpr(props);
    if (!valueExpr) {
      return { branch: null, reason: "switch-case-missing-expr" };
    }
    return { branch: { kind: "case", expr: valueExpr }, reason: "switch-case" };
  }

  return { branch: null, reason: "none" };
}

export type IteratorTargetDecisionReason = "controller-trigger" | "fallback";

export interface IteratorTargetDecision {
  readonly to: string;
  readonly reason: IteratorTargetDecisionReason;
}

export function resolveIteratorTarget(
  controller: ControllerConfig | null | undefined,
  fallback = "items",
): IteratorTargetDecision {
  if (controller?.trigger.kind === "iterator") {
    return { to: controller.trigger.prop, reason: "controller-trigger" };
  }
  return { to: fallback, reason: "fallback" };
}

export type IteratorTailDecisionReason =
  | "accepted"
  | "missing-controller"
  | "controller-has-no-tail-props"
  | "unknown-tail-prop"
  | "tail-mode-not-accepted";

export interface IteratorTailDecision {
  readonly accepted: boolean;
  readonly reason: IteratorTailDecisionReason;
  readonly normalized?: {
    readonly name: string;
    readonly mode: BindingMode | null;
    readonly type?: string;
  };
  readonly accepts?: readonly ("bind" | null)[];
  readonly incoming?: "bind" | null;
}

export function planIteratorTailBinding(
  controller: ControllerConfig | null | undefined,
  name: string,
  authoredMode: BindingMode,
): IteratorTailDecision {
  if (!controller) {
    return { accepted: false, reason: "missing-controller" };
  }
  if (!controller.tailProps) {
    return { accepted: false, reason: "controller-has-no-tail-props" };
  }
  const tailSpec = controller.tailProps[name];
  if (!tailSpec) {
    return { accepted: false, reason: "unknown-tail-prop" };
  }
  const accepts = tailSpec.accepts ?? ["bind", null];
  const incoming: "bind" | null = authoredMode === "default" ? null : "bind";
  if (!accepts.includes(incoming)) {
    return { accepted: false, reason: "tail-mode-not-accepted", accepts, incoming };
  }
  return {
    accepted: true,
    reason: "accepted",
    normalized: {
      name: tailSpec.name,
      mode: incoming === "bind" ? "toView" : null,
      ...(tailSpec.type ? { type: tailSpec.type } : {}),
    },
    accepts,
    incoming,
  };
}

function findValueExpr(props: readonly ControllerBindableIR[]): ExprRef | null {
  for (const prop of props) {
    if (prop.type !== "propertyBinding" || prop.to !== "value") continue;
    if (isExprRef(prop.from)) return prop.from;
  }
  return null;
}

function isExprRef(source: BindingSourceIR): source is ExprRef {
  return !("kind" in source && source.kind === "interp");
}
