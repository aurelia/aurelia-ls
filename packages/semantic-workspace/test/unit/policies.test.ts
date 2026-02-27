import { describe, expect, it, test } from "vitest";
import { asDocumentUri, type DocumentUri } from "@aurelia-ls/compiler";
import type { ResourceDef, SourceLocation, Sourced } from "@aurelia-ls/compiler";
import { decideRenameMappedProvenance } from "../../out/provenance-gate-policy.js";
import { mergeTieredLocations, mergeTieredLocationsWithIds } from "../../out/query-policy.js";
import type { WorkspaceLocation } from "../../out/types.js";
import { selectResourceCandidate } from "../../out/resource-precedence-policy.js";
import {
  DEFAULT_REFACTOR_POLICY,
  planCodeActionExecution,
  planRenameExecution,
  refactorPolicyFingerprint,
  type RenameExecutionContext,
  type RefactorPolicy,
} from "../../out/refactor-policy.js";

// ============================================================================
// Provenance Gate Policy
// ============================================================================

describe("provenance gate policy", () => {
  test("accepts mapped provenance when position is covered", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: true,
      positionMapped: true,
    });
    expect(decision.hasMappedProvenance).toBe(true);
    expect(decision.evidenceLevel).toBe("position");
    expect(decision.reason).toBe("position-mapped");
  });

  test("rejects mapped provenance when mapping exists but position has no coverage", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: true,
      positionMapped: false,
    });
    expect(decision.hasMappedProvenance).toBe(false);
    expect(decision.evidenceLevel).toBe("position");
    expect(decision.reason).toBe("position-unmapped");
  });

  test("rejects mapped provenance when no mapping exists", () => {
    const decision = decideRenameMappedProvenance({
      mappingPresent: false,
      positionMapped: false,
    });
    expect(decision.hasMappedProvenance).toBe(false);
    expect(decision.evidenceLevel).toBe("artifact");
    expect(decision.reason).toBe("mapping-missing");
  });
});

// ============================================================================
// Query Policy
// ============================================================================

function location(
  uri: DocumentUri,
  start: number,
  end: number,
  ids?: Pick<WorkspaceLocation, "symbolId" | "exprId" | "nodeId">,
): WorkspaceLocation {
  return {
    uri,
    span: { start, end, file: String(uri) },
    ...(ids?.symbolId ? { symbolId: ids.symbolId } : {}),
    ...(ids?.exprId ? { exprId: ids.exprId } : {}),
    ...(ids?.nodeId ? { nodeId: ids.nodeId } : {}),
  };
}

describe("query policy", () => {
  const current = asDocumentUri("file:///workspace/src/current.html");
  const other = asDocumentUri("file:///workspace/src/other.html");

  it("orders by semantic tier before current-file and canonical tie-breaks", () => {
    const merged = mergeTieredLocations(current, [
      { tier: "base", items: [location(current, 20, 25)] },
      { tier: "local", items: [location(current, 10, 15)] },
      { tier: "meta", items: [location(other, 1, 5)] },
      { tier: "resource", items: [location(other, 2, 6)] },
    ]);

    expect(merged).toHaveLength(4);
    expect(merged[0]?.uri).toBe(other);
    expect(merged[0]?.span.start).toBe(1);
    expect(merged[1]?.uri).toBe(current);
    expect(merged[1]?.span.start).toBe(10);
    expect(merged[2]?.uri).toBe(other);
    expect(merged[2]?.span.start).toBe(2);
    expect(merged[3]?.uri).toBe(current);
    expect(merged[3]?.span.start).toBe(20);
  });

  it("dedupes same-span hits by preferring higher semantic tier", () => {
    const merged = mergeTieredLocations(current, [
      { tier: "base", items: [location(current, 40, 48)] },
      { tier: "local", items: [location(current, 40, 48)] },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.uri).toBe(current);
    expect(merged[0]?.span.start).toBe(40);
  });

  it("drops id-less duplicates when a symbol-aware hit exists at the same span", () => {
    const merged = mergeTieredLocationsWithIds(current, [
      { tier: "local", items: [location(current, 60, 66)] },
      { tier: "base", items: [location(current, 60, 66, { symbolId: "sym:abc" as WorkspaceLocation["symbolId"] })] },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.symbolId).toBe("sym:abc");
  });

  it("keeps multiple symbol-aware entries for the same span in deterministic id order", () => {
    const merged = mergeTieredLocationsWithIds(current, [
      {
        tier: "resource",
        items: [
          location(current, 80, 84, { symbolId: "sym:z" as WorkspaceLocation["symbolId"] }),
          location(current, 80, 84, { symbolId: "sym:a" as WorkspaceLocation["symbolId"] }),
        ],
      },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]?.symbolId).toBe("sym:a");
    expect(merged[1]?.symbolId).toBe("sym:z");
  });
});

// ============================================================================
// Resource Precedence Policy
// ============================================================================

type Candidate = {
  id: string;
  def: ResourceDef;
};

function sourceLocation(file: string): SourceLocation {
  return { file: file as SourceLocation["file"], pos: 0, end: 0 };
}

function sourcedString(value: string, origin: "builtin" | "config" | "source", file?: string): Sourced<string> {
  switch (origin) {
    case "builtin":
      return { origin: "builtin", value };
    case "config":
      return {
        origin: "config",
        value,
        location: sourceLocation(file ?? "/config.json"),
      };
    case "source":
    default:
      return {
        origin: "source",
        state: "known",
        value,
        ...(file ? { location: sourceLocation(file) } : {}),
      };
  }
}

function elementDef(
  name: string,
  options: {
    file?: string;
    origin?: "builtin" | "config" | "source";
    package?: string;
  } = {},
): ResourceDef {
  const origin = options.origin ?? "source";
  const file = options.file;
  return {
    kind: "custom-element",
    className: sourcedString("MyElement", origin, file),
    ...(file ? { file: file as ResourceDef["file"] } : {}),
    ...(options.package ? { package: options.package } : {}),
    name: sourcedString(name, origin, file),
    aliases: [],
    containerless: { origin: "builtin", value: false },
    shadowOptions: { origin: "builtin", value: undefined },
    capture: { origin: "builtin", value: false },
    processContent: { origin: "builtin", value: false },
    boundary: { origin: "builtin", value: true },
    bindables: {},
    dependencies: [],
  };
}

describe("resource precedence policy", () => {
  it("prefers exact file matches when file is known", () => {
    const first: Candidate = { id: "first", def: elementDef("badge", { file: "/repo/src/a.ts" }) };
    const second: Candidate = { id: "second", def: elementDef("badge", { file: "/repo/src/b.ts" }) };
    const selected = selectResourceCandidate([first, second], {
      file: "/repo/src/b.ts",
      preferredRoots: ["/repo"],
    });
    expect(selected?.id).toBe("second");
  });

  it("prefers resources inside preferred workspace roots", () => {
    const local: Candidate = { id: "local", def: elementDef("tooltip", { file: "/repo/src/tooltip.ts" }) };
    const thirdParty: Candidate = {
      id: "third-party",
      def: elementDef("tooltip", {
        file: "/repo/node_modules/@pkg/tooltip.ts",
        package: "@pkg/ui",
      }),
    };
    const selected = selectResourceCandidate([thirdParty, local], {
      preferredRoots: ["/repo/src"],
    });
    expect(selected?.id).toBe("local");
  });

  it("prefers first-party resources over package resources when both are available", () => {
    const firstParty: Candidate = { id: "first-party", def: elementDef("chip", { file: "/repo/src/chip.ts" }) };
    const pkg: Candidate = {
      id: "pkg",
      def: elementDef("chip", {
        file: "/repo/node_modules/@pkg/chip.ts",
        package: "@pkg/ui",
      }),
    };
    const selected = selectResourceCandidate([pkg, firstParty], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("first-party");
  });

  it("prefers config-origin package entries over source-origin package entries", () => {
    const analyzed: Candidate = {
      id: "analyzed",
      def: elementDef("table", {
        file: "/repo/node_modules/@pkg/table.ts",
        package: "@pkg/ui",
        origin: "source",
      }),
    };
    const explicit: Candidate = {
      id: "explicit",
      def: elementDef("table", {
        file: "/repo/node_modules/@pkg/table.ts",
        package: "@pkg/ui",
        origin: "config",
      }),
    };
    const selected = selectResourceCandidate([analyzed, explicit], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("explicit");
  });

  it("falls back deterministically when candidates tie", () => {
    const zed: Candidate = { id: "zed", def: elementDef("avatar", { file: "/repo/src/z.ts" }) };
    const alpha: Candidate = { id: "alpha", def: elementDef("avatar", { file: "/repo/src/a.ts" }) };
    const selected = selectResourceCandidate([zed, alpha], {
      preferredRoots: [],
    });
    expect(selected?.id).toBe("alpha");
  });
});

// ============================================================================
// Refactor Policy
// ============================================================================

describe("refactor policy", () => {
  const defaultContext: RenameExecutionContext = {
    target: "resource",
    hasSemanticProvenance: true,
    hasMappedProvenance: true,
    workspaceDocument: true,
  };

  it("plans semantic-first rename with fallback disabled by default", () => {
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

  it("preserves semantic rename when fallback is explicitly disabled", () => {
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

  it("allows expression-member rename targets (VM property rename)", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, {
      ...defaultContext,
      target: "expression-member",
      hasSemanticProvenance: false,
    });
    // Expression-member targets bypass semantic provenance (they use TS provenance).
    expect(plan.allowOperation).toBe(true);
    expect(plan.trySemanticRename).toBe(true);
  });

  it("denies rename when provenance is required but unavailable", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, {
      ...defaultContext,
      target: "resource",
      hasSemanticProvenance: false,
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("provenance-required");
  });

  it("denies rename for builtin resource origins", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, {
      ...defaultContext,
      target: "resource",
      resourceOrigin: "builtin",
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("resource-origin-builtin");
  });

  it("denies rename for config resource origins", () => {
    const plan = planRenameExecution(DEFAULT_REFACTOR_POLICY, {
      ...defaultContext,
      target: "resource",
      resourceOrigin: "config",
    });
    expect(plan.allowOperation).toBe(false);
    expect(plan.reason).toBe("resource-origin-config");
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
