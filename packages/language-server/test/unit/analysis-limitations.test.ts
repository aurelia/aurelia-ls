import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test, vi } from "vitest";
import {
  SemanticAnalysisLimitationAuthority,
  SemanticOpenSeamMaterializationOutcome,
  SemanticProjectFindingRuleId,
  SemanticRuntimeAnswerCoverage,
  type SemanticAnalysisLimitationRow,
} from "@aurelia-ls/semantic-runtime";
import {
  mapAnalysisLimitationEffectivePolicy,
  mapAnalysisLimitationItem,
} from "../../src/mapping/analysis-limitations.js";
import { handleAnalysisLimitations } from "../../src/handlers/custom.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";
import {
  createContextTestOperation,
  testAnalysisGeneration,
} from "./test-request-guard.js";
import { testWorkspaceDocumentUris } from "./test-document-uris.js";

const REGISTRATION_OPEN_SPREAD_KIND = "registration.open-spread" as
  SemanticAnalysisLimitationRow["reason"]["seamKindKeys"][number];
const CONFIGURATION_SEQUENCE_PRODUCT_KIND = "configuration.sequence" as
  SemanticAnalysisLimitationRow["evidence"]["products"][number]["productKindKey"];

describe("analysis limitation request boundary", () => {
  test("enumerates every explicit project and preserves a partial project failure", async () => {
    const root = path.resolve("analysis-limitations-handler-workspace");
    const first = project("first", root);
    const second = project("second", path.join(root, "nested"));
    const policyPath = path.join(root, "aurelia.project.json");
    const analysisLimitations = vi.fn(async (projectKey: string) => {
      if (projectKey === second.projectKey) throw new Error("second analysis failed");
      return runtimeAnswer({
        projectKey,
        policyFile: { filePath: policyPath, exists: false },
        effectivePolicies: [{
          ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
          disposition: "information",
          authority: "default",
          source: null,
        }],
        candidateCount: 0,
        suppressedCandidateCount: 0,
        displayText: "Page-local semantic text must not cross the drained transport.",
        rows: [],
      });
    });
    const ctx = {
      documentUris: testWorkspaceDocumentUris(root),
      lookupText: vi.fn(() => null),
      semanticRuntime: {
        workspaceSummary: vi.fn(async () => runtimeAnswer({ appCandidates: [first, second] })),
        analysisLimitations,
      },
    };

    const response = await handleAnalysisLimitations(ctx as never, createContextTestOperation(ctx));

    expect(analysisLimitations.mock.calls.map(([projectKey]) => projectKey)).toEqual(["first", "second"]);
    expect(response.fingerprint).toBe(testAnalysisGeneration.fingerprint);
    expect(response.projects).toEqual([
      {
        status: "ready",
        projectKey: "first",
        answer: expect.objectContaining({ result: "answered", coverage: "complete" }),
        policyFile: {
          uri: ctx.documentUris.uriForHostPath(policyPath),
          exists: false,
        },
        effectivePolicies: [{
          ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
          disposition: "information",
          authority: "default",
          source: { state: "absent" },
        }],
        candidateCount: 0,
        suppressedCandidateCount: 0,
        rows: [],
      },
      {
        status: "error",
        projectKey: "second",
        message: "second analysis failed",
      },
    ]);
    expect(deepKeys(response)).not.toContain("displayText");
    expect(deepKeys(response)).not.toContain("filePath");
  });

  test("rejects a cross-project semantic answer instead of silently relabeling it", async () => {
    const root = path.resolve("analysis-limitations-handler-mismatch");
    const owner = project("requested", root);
    const ctx = {
      documentUris: testWorkspaceDocumentUris(root),
      lookupText: vi.fn(() => null),
      semanticRuntime: {
        workspaceSummary: vi.fn(async () => runtimeAnswer({ appCandidates: [owner] })),
        analysisLimitations: vi.fn(async () => runtimeAnswer({
          projectKey: "different",
          policyFile: { filePath: path.join(root, "aurelia.project.json"), exists: false },
          effectivePolicies: [],
          candidateCount: 0,
          suppressedCandidateCount: 0,
          displayText: "No configured analysis limitations.",
          rows: [],
        })),
      },
    };

    const response = await handleAnalysisLimitations(ctx as never, createContextTestOperation(ctx));

    expect(response.projects).toEqual([{
      status: "error",
      projectKey: "requested",
      message: "Analysis limitations returned project 'different' for requested project 'requested'.",
    }]);
  });
});

describe("analysis limitation transport mapping", () => {
  test("maps authored, product, and configured-policy sources to validated URI ranges", () => {
    const root = path.resolve("analysis-limitations-workspace");
    const sourcePath = path.join(root, "src", "main.ts");
    const policyPath = path.join(root, "aurelia.project.json");
    const sourceText = "const registrations = [...dynamicRegistrations];\n";
    const policyText = "{\n  \"version\": 2,\n  \"findings\": {\n    \"aurelia.analysis.dynamic-registration-spread\": \"warning\"\n  }\n}\n";
    const sourceStart = sourceText.indexOf("...dynamicRegistrations");
    const sourceEnd = sourceStart + "...dynamicRegistrations".length;
    const policyStart = policyText.indexOf("\"warning\"");
    const policyEnd = policyStart + "\"warning\"".length;
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(pathToFileURL(root).toString());
    const sourceUri = documentUris.uriForHostPath(sourcePath);
    const policyUri = documentUris.uriForHostPath(policyPath);
    const texts = new Map([
      [sourceUri, sourceText],
      [policyUri, policyText],
    ]);
    const context = {
      documentUris,
      lookupText: (uri: string) => texts.get(uri) ?? null,
    };
    const policy = {
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      disposition: "warning",
      authority: "project-configuration",
      source: {
        filePath: policyPath,
        start: policyStart,
        end: policyEnd,
        startPosition: { line: 3, character: 52 },
        endPosition: { line: 3, character: 61 },
      },
    } as const;
    const row: SemanticAnalysisLimitationRow = {
      findingKey: "finding:dynamic-registration-spread",
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      authority: SemanticAnalysisLimitationAuthority.SemanticRuntimeRule,
      title: "Dynamic registration spread limits resource analysis",
      explanation: "The registration set is runtime-dependent.",
      action: "Register statically known entries explicitly.",
      reason: {
        summary: "Registration spread remained open",
        seamKindKeys: [REGISTRATION_OPEN_SPREAD_KIND],
        boundaryKinds: ["runtime-execution-boundary"],
        reasonKinds: ["registration-spread-open"],
      },
      source: {
        kind: "source-span",
        label: "registration spread",
        path: sourcePath,
        start: sourceStart,
        end: sourceEnd,
      },
      sourceRange: {
        start: { line: 0, character: sourceStart },
        end: { line: 0, character: sourceEnd },
      },
      currentCoverage: SemanticRuntimeAnswerCoverage.Open,
      evidence: {
        openSeamSiteKey: "site:registration-spread",
        seamKeys: ["seam:registration-spread"],
        materializations: [{
          impactKey: "impact:configuration",
          outcome: SemanticOpenSeamMaterializationOutcome.OpenWithProduct,
          ownerKey: "owner:app",
          productKeys: ["product:configuration"],
          productKindKeys: [CONFIGURATION_SEQUENCE_PRODUCT_KIND],
        }],
        products: [{
          productKey: "product:configuration",
          productKindKey: CONFIGURATION_SEQUENCE_PRODUCT_KIND,
          source: {
            kind: "source-span",
            label: "registration spread",
            path: sourcePath,
            start: sourceStart,
            end: sourceEnd,
          },
        }],
      },
      effectivePolicy: policy,
    };

    const mapped = mapAnalysisLimitationItem(row, context);

    expect(mapped.source).toEqual({
      state: "available",
      location: {
        uri: sourceUri,
        range: row.sourceRange,
      },
    });
    expect(mapped.effectivePolicy.source).toEqual({
      state: "available",
      location: {
        uri: policyUri,
        range: {
          start: policy.source.startPosition,
          end: policy.source.endPosition,
        },
      },
    });
    expect(mapped.reason.reasonKinds).toEqual(["registration-spread-open"]);
    expect(mapped.evidence.materializations[0]).toEqual(expect.objectContaining({
      productKindKeys: ["configuration.sequence"],
    }));
    expect(mapped.evidence.products[0]?.source).toEqual(mapped.source);
    expect(deepKeys(mapped)).not.toEqual(expect.arrayContaining([
      "filePath",
      "path",
      "startPosition",
      "endPosition",
    ]));
  });

  test("keeps default policy absent and refuses stale or unreadable source coordinates", () => {
    const root = path.resolve("analysis-limitations-stale-workspace");
    const sourcePath = path.join(root, "src", "main.ts");
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure(pathToFileURL(root).toString());
    const sourceUri = documentUris.uriForHostPath(sourcePath);
    const context = {
      documentUris,
      lookupText: (uri: string) => uri === sourceUri ? "register(...items);\n" : null,
    };
    const row = limitationRow(sourcePath, {
      start: { line: 0, character: 1 },
      end: { line: 0, character: 9 },
    });

    expect(mapAnalysisLimitationItem(row, context).source).toEqual({
      state: "unavailable",
      reason: "source-range-mismatch",
    });
    expect(mapAnalysisLimitationEffectivePolicy({
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      disposition: "information",
      authority: "default",
      source: null,
    }, context).source).toEqual({ state: "absent" });
    expect(mapAnalysisLimitationEffectivePolicy({
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      disposition: "error",
      authority: "project-configuration",
      source: {
        filePath: path.join(root, "aurelia.project.json"),
        start: 0,
        end: 1,
        startPosition: { line: 0, character: 0 },
        endPosition: { line: 0, character: 1 },
      },
    }, context).source).toEqual({
      state: "unavailable",
      reason: "source-text-unavailable",
    });
  });
});

function limitationRow(
  sourcePath: string,
  sourceRange: SemanticAnalysisLimitationRow["sourceRange"],
): SemanticAnalysisLimitationRow {
  return {
    findingKey: "finding:stale",
    ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    authority: SemanticAnalysisLimitationAuthority.SemanticRuntimeRule,
    title: "Dynamic registration spread limits resource analysis",
    explanation: "The registration set is runtime-dependent.",
    action: "Register statically known entries explicitly.",
    reason: {
      summary: "Registration spread remained open",
      seamKindKeys: [REGISTRATION_OPEN_SPREAD_KIND],
      boundaryKinds: ["runtime-execution-boundary"],
      reasonKinds: ["registration-spread-open"],
    },
    source: {
      kind: "source-span",
      label: "registration",
      path: sourcePath,
      start: 0,
      end: 8,
    },
    sourceRange,
    currentCoverage: SemanticRuntimeAnswerCoverage.Open,
    evidence: {
      openSeamSiteKey: "site:stale",
      seamKeys: ["seam:stale"],
      materializations: [],
      products: [],
    },
    effectivePolicy: {
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      disposition: "information",
      authority: "default",
      source: null,
    },
  };
}

function deepKeys(value: unknown): readonly string[] {
  if (value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(deepKeys);
  return Object.entries(value).flatMap(([key, child]) => [key, ...deepKeys(child)]);
}

function project(projectKey: string, rootDir: string) {
  return {
    projectKey,
    rootDir,
    sourceFiles: 1,
    shapeKind: "aurelia-app",
    analysisKind: "full",
  };
}

function runtimeAnswer<T>(value: T) {
  return {
    schemaVersion: "0.2",
    result: "answered",
    selection: "not-applicable",
    coverage: "complete",
    summary: "complete",
    value,
    page: null,
  };
}
