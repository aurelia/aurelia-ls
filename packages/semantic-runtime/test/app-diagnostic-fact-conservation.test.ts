import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
} from "../src/index.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("app diagnostic fact conservation", () => {
  test("preserves observation identity, repair intent, and detailed origin handles", async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/trackable-method-dependencies"),
      storeKey: "app-diagnostic-fact-conservation-observation",
    });
    const app = await runtime.openApp({ analysisDepth: "binding-observation" });
    const owningRows = app.ask({
      kind: SemanticAppQueryKind.ObservationIssues,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 50 },
    }).value.rows;
    const detailedRows = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows;
    const compactRows = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Compact,
      page: { size: 100 },
    }).value.rows;

    const owning = owningRows.find((row) =>
      row.issueKind === "non-trackable-template-method-call"
      && row.subjectName === "ordinaryCounterLabel"
    );
    const detailed = detailedRows.find((row) =>
      row.diagnosticDomain === "observation"
      && row.diagnosticKind === "non-trackable-template-method-call"
      && row.subject?.subjectName === "ordinaryCounterLabel"
    );
    const compact = compactRows.find((row) =>
      row.diagnosticDomain === "observation"
      && row.diagnosticKind === "non-trackable-template-method-call"
      && row.subject?.subjectName === "ordinaryCounterLabel"
    );

    expect(owning).toBeDefined();
    expect(detailed).toBeDefined();
    expect(compact).toBeDefined();
    expect(detailed?.phase).toBe("binding-observation");
    expect(detailed?.suggestion?.suggestionKind).toBe("make-method-trackable");
    expect(detailed?.suggestion?.actionTarget?.memberName).toBe("ordinaryCounterLabel");
    expect(detailed?.handles?.productHandle).toBe(owning?.handles?.productHandle);
    expect(detailed?.handles?.identityHandle).toBe(owning?.handles?.identityHandle);
    expect(detailed?.handles?.sourceAddressHandle).toBe(owning?.handles?.sourceAddressHandle);
    expect(detailed?.handles?.relatedSourceAddressHandles).toEqual(owning?.handles?.relatedSourceAddressHandles);
    expect(compact?.handles).toBeUndefined();
  });

  test("applies the same detail policy to framework capability diagnostics", async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/source-service-api-demand"),
      storeKey: "app-diagnostic-fact-conservation-framework",
    });
    const app = await runtime.openApp({ analysisDepth: "binding-observation" });
    const demands = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows;
    const detailed = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows.find((row) =>
      row.diagnosticDomain === "framework"
      && row.diagnosticKind === "framework-capability-not-registered"
    );
    const compact = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Compact,
      page: { size: 100 },
    }).value.rows.find((row) =>
      row.diagnosticDomain === "framework"
      && row.diagnosticKind === "framework-capability-not-registered"
    );

    expect(detailed).toBeDefined();
    expect(compact).toBeDefined();
    expect(detailed?.handles?.productHandle).not.toBeNull();
    expect(demands.some((row) => row.handles?.productHandle === detailed?.handles?.productHandle)).toBe(true);
    expect(compact?.handles).toBeUndefined();
  });
});
