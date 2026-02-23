/**
 * Internal refactor policy contract.
 *
 * This is intentionally config-driven (declarative data + planner helpers),
 * but not user-configurable at this stage. It centralizes trust-boundary
 * decisions so rename/code-action behavior does not drift across call sites.
 *
 * TODO(refactor-policy hardening):
 * 1) Expose unresolved decision points via an interactive prepare/resolve API
 *    for adapters that can prompt users before execution.
 */

import { stableHash } from "@aurelia-ls/compiler";

export type RefactorOperation = "rename" | "code-action";
export type RefactorTargetClass = "resource" | "expression-member" | "unknown";
export type RefactorResourceOrigin = "source" | "config" | "builtin" | "unknown";
export type RefactorBoundaryReason =
  | "target-not-allowed"
  | "decision-required"
  | "semantic-step-disabled"
  | "provenance-required"
  | "workspace-only"
  | "resource-origin-config"
  | "resource-origin-builtin"
  | "fallback-disabled";
export type SemanticRenameRoute =
  | "custom-element"
  | "bindable-attribute"
  | "value-converter"
  | "binding-behavior";
export type CodeActionSource = "workspace" | "typescript";

export type RefactorDecisionPointId =
  | "alias-strategy"
  | "file-rename"
  | "import-style"
  | "rename-style";

export type RefactorDecisionSet = Readonly<Partial<Record<RefactorDecisionPointId, string>>>;

export interface RefactorDecisionPoint {
  readonly id: RefactorDecisionPointId;
  readonly required: boolean;
  readonly description: string;
}

export interface RenamePolicy {
  /**
   * Semantic-first is the canonical execution strategy for workspace rename.
   */
  readonly strategy: "semantic-first";
  /**
   * Target classes accepted by rename at all.
   */
  readonly allowedTargets: readonly RefactorTargetClass[];
  readonly semantic: {
    readonly enabled: boolean;
    // Requires semantic provenance evidence before semantic rename can execute.
    readonly requireProvenance: boolean;
    // Semantic rename routes are ordered explicitly to avoid ad-hoc flow drift.
    readonly routeOrder: readonly SemanticRenameRoute[];
  };
  readonly fallback: {
    readonly enabled: boolean;
    /**
     * Target classes allowed to route into TS-based fallback.
     * Keep this explicit to avoid accidental expansion.
     */
    readonly allowedTargets: readonly RefactorTargetClass[];
    // Requires mapped provenance when fallback originates from template/overlay.
    readonly requireMappedProvenance: boolean;
    readonly workspaceOnly: boolean;
  };
  /**
   * Decision points used by richer rename flows. These are declarative
   * placeholders for interactive or profile-driven inputs until hardening
   * TODO #1 is implemented.
   */
  readonly decisionPoints: readonly RefactorDecisionPoint[];
}

export interface CodeActionPolicy {
  readonly sourceOrder: readonly CodeActionSource[];
  readonly dedupeBy: "id";
  readonly filterByRequestedKinds: boolean;
  readonly decisionPoints: readonly RefactorDecisionPoint[];
}

export interface RefactorPolicy {
  readonly version: "aurelia-refactor-policy/1";
  readonly rename: RenamePolicy;
  readonly codeActions: CodeActionPolicy;
}

export interface RenameExecutionPlan {
  readonly allowOperation: boolean;
  readonly reason?: RefactorBoundaryReason;
  readonly trySemanticRename: boolean;
  readonly allowTypeScriptFallback: boolean;
  readonly unresolvedDecisionPoints: readonly RefactorDecisionPoint[];
  readonly resolvedDecisionValues: RefactorDecisionSet;
}

export interface RenameExecutionContext {
  readonly target: RefactorTargetClass;
  readonly resourceOrigin?: RefactorResourceOrigin;
  readonly hasSemanticProvenance: boolean;
  readonly hasMappedProvenance: boolean;
  readonly workspaceDocument: boolean;
}

export interface CodeActionExecutionPlan {
  readonly sourceOrder: readonly CodeActionSource[];
  readonly dedupeBy: "id";
  readonly filterByRequestedKinds: boolean;
  readonly unresolvedDecisionPoints: readonly RefactorDecisionPoint[];
  readonly resolvedDecisionValues: RefactorDecisionSet;
}

export interface DecisionResolutionInput {
  readonly provided?: RefactorDecisionSet | null;
  readonly inferred?: RefactorDecisionSet | null;
}

export interface DecisionResolutionResult {
  readonly values: RefactorDecisionSet;
  readonly unresolved: readonly RefactorDecisionPoint[];
}

/**
 * Current policy defaults are semantic-only for rename:
 * - only semantic resource targets are accepted
 * - TypeScript fallback is disabled
 */
export const DEFAULT_REFACTOR_POLICY: RefactorPolicy = {
  version: "aurelia-refactor-policy/1",
  rename: {
    strategy: "semantic-first",
    allowedTargets: ["resource"],
    semantic: {
      enabled: true,
      requireProvenance: true,
      routeOrder: ["custom-element", "bindable-attribute", "value-converter", "binding-behavior"],
    },
    fallback: {
      enabled: false,
      allowedTargets: [],
      requireMappedProvenance: true,
      workspaceOnly: true,
    },
    decisionPoints: [
      {
        id: "rename-style",
        required: false,
        description: "Rename form preference (property vs attribute).",
      },
      {
        id: "alias-strategy",
        required: false,
        description: "Alias preservation/update strategy when multiple aliases exist.",
      },
      {
        id: "file-rename",
        required: false,
        description: "Whether resource file/class rename should include file move.",
      },
    ],
  },
  codeActions: {
    sourceOrder: ["workspace", "typescript"],
    dedupeBy: "id",
    filterByRequestedKinds: true,
    decisionPoints: [
      {
        id: "import-style",
        required: false,
        description: "Import insertion/organization style preference.",
      },
      {
        id: "alias-strategy",
        required: false,
        description: "Alias choice for ambiguous import fixes.",
      },
    ],
  },
};

export function planRenameExecution(
  policy: RefactorPolicy,
  context: RenameExecutionContext,
  decisions?: DecisionResolutionInput,
): RenameExecutionPlan {
  const resolved = resolveDecisionPoints(policy.rename.decisionPoints, decisions);
  if (resolved.unresolved.length > 0) {
    return {
      allowOperation: false,
      reason: "decision-required",
      trySemanticRename: false,
      allowTypeScriptFallback: false,
      unresolvedDecisionPoints: resolved.unresolved,
      resolvedDecisionValues: resolved.values,
    };
  }

  if (!policy.rename.allowedTargets.includes(context.target)) {
    return {
      allowOperation: false,
      reason: "target-not-allowed",
      trySemanticRename: false,
      allowTypeScriptFallback: false,
      unresolvedDecisionPoints: resolved.unresolved,
      resolvedDecisionValues: resolved.values,
    };
  }

  if (context.target === "resource") {
    if (context.resourceOrigin === "builtin") {
      return {
        allowOperation: false,
        reason: "resource-origin-builtin",
        trySemanticRename: false,
        allowTypeScriptFallback: false,
        unresolvedDecisionPoints: resolved.unresolved,
        resolvedDecisionValues: resolved.values,
      };
    }
    if (context.resourceOrigin === "config") {
      return {
        allowOperation: false,
        reason: "resource-origin-config",
        trySemanticRename: false,
        allowTypeScriptFallback: false,
        unresolvedDecisionPoints: resolved.unresolved,
        resolvedDecisionValues: resolved.values,
      };
    }
  }

  const trySemanticRename = policy.rename.semantic.enabled
    && (!policy.rename.semantic.requireProvenance || context.hasSemanticProvenance);
  const allowTypeScriptFallback = false;

  if (!trySemanticRename) {
    let reason: RefactorBoundaryReason = "semantic-step-disabled";
    if (policy.rename.semantic.enabled && policy.rename.semantic.requireProvenance && !context.hasSemanticProvenance) {
      reason = "provenance-required";
    } else if (!policy.rename.semantic.enabled) {
      reason = "semantic-step-disabled";
    }
    return {
      allowOperation: false,
      reason,
      trySemanticRename: false,
      allowTypeScriptFallback: false,
      unresolvedDecisionPoints: resolved.unresolved,
      resolvedDecisionValues: resolved.values,
    };
  }

  return {
    allowOperation: true,
    trySemanticRename,
    allowTypeScriptFallback,
    unresolvedDecisionPoints: resolved.unresolved,
    resolvedDecisionValues: resolved.values,
  };
}

export function planCodeActionExecution(
  policy: RefactorPolicy,
  decisions?: DecisionResolutionInput,
): CodeActionExecutionPlan {
  const resolved = resolveDecisionPoints(policy.codeActions.decisionPoints, decisions);
  return {
    sourceOrder: policy.codeActions.sourceOrder,
    dedupeBy: policy.codeActions.dedupeBy,
    filterByRequestedKinds: policy.codeActions.filterByRequestedKinds,
    unresolvedDecisionPoints: resolved.unresolved,
    resolvedDecisionValues: resolved.values,
  };
}

export function requiredDecisionPoints(
  points: readonly RefactorDecisionPoint[],
): readonly RefactorDecisionPoint[] {
  return points.filter((point) => point.required);
}

export function resolveDecisionPoints(
  points: readonly RefactorDecisionPoint[],
  input?: DecisionResolutionInput,
): DecisionResolutionResult {
  const provided = input?.provided ?? {};
  const inferred = input?.inferred ?? {};
  const values: Partial<Record<RefactorDecisionPointId, string>> = {};
  const unresolved: RefactorDecisionPoint[] = [];
  for (const point of points) {
    const value = provided[point.id] ?? inferred[point.id];
    if (value != null && value.length > 0) {
      values[point.id] = value;
      continue;
    }
    if (point.required) {
      unresolved.push(point);
    }
  }
  return {
    values,
    unresolved,
  };
}

export function refactorPolicyFingerprint(policy: RefactorPolicy): string {
  return stableHash(policy);
}
