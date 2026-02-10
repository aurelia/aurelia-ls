import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFACTOR_POLICY,
  planCodeActionExecution,
  planRenameExecution,
  refactorPolicyFingerprint,
  type RenameExecutionContext,
  type RefactorPolicy,
} from "../../src/refactor-policy.js";

describe("refactor policy", () => {
  const defaultContext: RenameExecutionContext = {
    target: "unknown",
    hasSemanticProvenance: true,
    hasMappedProvenance: true,
    workspaceDocument: true,
  };

  it("plans semantic-first rename and keeps fallback off for unknown targets by default", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, defaultContext);
    expect(plan.allowOperation).toBe(true);
    expect(plan.trySemanticRename).toBe(true);
    expect(plan.allowTypeScriptFallback).toBe(false);
  });

  it("denies rename when target class is not allowed", () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        allowedTargets: ["resource"],
      },
    };
    const plan = planRenameExecution(policy, {
      ...defaultContext,
      target: "expression-member",
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("target-not-allowed");
  });

  it("can disable fallback while keeping semantic rename enabled", () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        fallback: {
          ...DEFAULT_REFACTOR_POLICY.rename.fallback,
          enabled: false,
        },
      },
    };
    const plan = planRenameExecution(policy, {
      ...defaultContext,
      target: "resource",
    });
    expect(plan.allowOperation).toBe(true);
    expect(plan.trySemanticRename).toBe(true);
    expect(plan.allowTypeScriptFallback).toBe(false);
  });

  it("allows fallback for expression-member targets by default", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, {
      ...defaultContext,
      target: "expression-member",
      hasSemanticProvenance: false,
    });
    expect(plan.allowOperation).toBe(true);
    expect(plan.allowTypeScriptFallback).toBe(true);
  });

  it("denies rename when provenance is required but unavailable", () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        fallback: {
          ...DEFAULT_REFACTOR_POLICY.rename.fallback,
          enabled: false,
        },
      },
    };
    const plan = planRenameExecution(policy, {
      ...defaultContext,
      target: "resource",
      hasSemanticProvenance: false,
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("provenance-required");
  });

  it("denies rename when required decision points are unresolved", () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        decisionPoints: [
          ...DEFAULT_REFACTOR_POLICY.rename.decisionPoints,
          {
            id: "file-rename",
            required: true,
            description: "Require explicit file rename choice.",
          },
        ],
      },
    };
    const plan = planRenameExecution(policy, {
      ...defaultContext,
      target: "resource",
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("decision-required");
    expect(plan.unresolvedDecisionPoints.length).toBe(1);
  });

  it("allows required decisions to be resolved via inferred or provided values", () => {
    const policy: RefactorPolicy = {
      ...DEFAULT_REFACTOR_POLICY,
      rename: {
        ...DEFAULT_REFACTOR_POLICY.rename,
        decisionPoints: [
          ...DEFAULT_REFACTOR_POLICY.rename.decisionPoints,
          {
            id: "file-rename",
            required: true,
            description: "Require explicit file rename choice.",
          },
        ],
      },
    };
    const inferredPlan = planRenameExecution(
      policy,
      {
        ...defaultContext,
        target: "resource",
      },
      {
        inferred: {
          "file-rename": "skip",
        },
      },
    );
    expect(inferredPlan.allowOperation).toBe(true);
    expect(inferredPlan.unresolvedDecisionPoints.length).toBe(0);

    const providedPlan = planRenameExecution(
      policy,
      {
        ...defaultContext,
        target: "resource",
      },
      {
        provided: {
          "file-rename": "rename-file",
        },
      },
    );
    expect(providedPlan.allowOperation).toBe(true);
    expect(providedPlan.unresolvedDecisionPoints.length).toBe(0);
  });

  it("exposes code-action merge defaults as execution plan", () => {
    const plan = planCodeActionExecution(DEFAULT_REFACTOR_POLICY);
    expect(plan.sourceOrder).toEqual(["workspace", "typescript"]);
    expect(plan.dedupeBy).toBe("id");
    expect(plan.filterByRequestedKinds).toBe(true);
  });

  it("produces stable fingerprints for identical policy objects", () => {
    const a = refactorPolicyFingerprint(DEFAULT_REFACTOR_POLICY);
    const b = refactorPolicyFingerprint({
      ...DEFAULT_REFACTOR_POLICY,
      rename: { ...DEFAULT_REFACTOR_POLICY.rename },
      codeActions: { ...DEFAULT_REFACTOR_POLICY.codeActions },
    });
    expect(a).toBe(b);
  });
});
