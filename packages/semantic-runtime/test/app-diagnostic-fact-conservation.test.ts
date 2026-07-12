import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  appDiagnosticPresentation,
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
  type SemanticAppDiagnosticRow,
} from "../src/index.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function assignmentDiagnosticRow(
  diagnosticKind: SemanticAppDiagnosticRow["diagnosticKind"],
  diagnosticAuthority: SemanticAppDiagnosticRow["diagnosticAuthority"],
  missingInput: string,
): SemanticAppDiagnosticRow {
  const source = {
    kind: "source-span-address" as const,
    label: "src/app.html@10..27",
    path: "src/app.html",
    start: 10,
    end: 27,
    role: "binding-source-assignment",
  };
  return {
    projectKey: "presentation-contract",
    diagnosticDomain: "template",
    phase: diagnosticAuthority === "typescript" ? "semantic" : null,
    diagnosticKind,
    diagnosticAuthority,
    frameworkErrorCode: null,
    frameworkRawErrorAuthority: null,
    severity: diagnosticAuthority === "typescript" ? "error" : "warning",
    summary: diagnosticKind,
    missingInput,
    missingInputs: [missingInput],
    source,
    subject: {
      subjectKind: "template-expression",
      subjectName: "fulfillmentMethod",
      source,
    },
    relatedInformation: [],
    suggestion: null,
    sourceRole: "template",
    relatedQueryKind: SemanticAppQueryKind.TemplateDiagnostics,
  };
}

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
    expect(detailed?.relatedInformation).toEqual(owning?.relatedInformation);
    expect(compact?.relatedInformation).toEqual(owning?.relatedInformation);
    expect(owning?.relatedInformation.map((related) => related.relationKind)).toEqual([
      "subject-declaration",
      "hidden-state-read",
    ]);
    expect(owning?.relatedInformation.map((related) => related.message)).toEqual([
      "Method 'ordinaryCounterLabel' is declared here.",
      "Method-body read 'this.ordinaryCounter.value' is not observed through the template call.",
    ]);
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

  test("retains semantic and checker facts while presenting exact agreement once", async () => {
    const sourceFile = "src/template-overlay-type-errors-app.html";
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/template-overlay-type-errors"),
      storeKey: "app-diagnostic-fact-conservation-template-agreement",
    });
    const app = await runtime.openApp({ analysisDepth: "binding-observation" });
    const templateRows = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: sourceFile },
      diagnosticProjection: "type-projection",
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows;
    const detailed = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: sourceFile },
      diagnosticProjection: "type-projection",
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value;
    const compactRows = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: sourceFile },
      diagnosticProjection: "type-projection",
      detail: SemanticRuntimeDetail.Compact,
      page: { size: 100 },
    }).value.rows;

    const semanticTemplateRow = templateRows.find((row) =>
      row.diagnosticKind === "missing-expression-member"
      && row.selectedMemberName === "missingLabel"
    );
    const checkerTemplateRow = templateRows.find((row) =>
      row.diagnosticKind === "template-expression-typescript-diagnostic"
      && row.missingInputs.includes("typescript:TS2339")
      && row.source?.start === semanticTemplateRow?.source?.start
      && row.source?.end === semanticTemplateRow?.source?.end
    );
    const semanticAppIndex = detailed.rows.findIndex((row) =>
      row.diagnosticKind === "missing-expression-member"
      && row.subject?.subjectName === "missingLabel"
    );
    const checkerAppIndex = detailed.rows.findIndex((row) =>
      row.diagnosticKind === "template-expression-typescript-diagnostic"
      && row.missingInputs.includes("typescript:TS2339")
      && row.source?.start === detailed.rows[semanticAppIndex]?.source?.start
      && row.source?.end === detailed.rows[semanticAppIndex]?.source?.end
    );
    const presentationGroup = detailed.presentation?.groups.find((group) =>
      group.primary.rowIndex === semanticAppIndex
    );

    expect(semanticTemplateRow).toBeDefined();
    expect(checkerTemplateRow).toBeDefined();
    expect(semanticTemplateRow?.handles?.semanticProductHandle).not.toBeNull();
    expect(semanticTemplateRow?.handles?.semanticIdentityHandle).not.toBeNull();
    expect(semanticTemplateRow?.handles?.sourceAddressHandle).not.toBeNull();
    expect(checkerTemplateRow?.phase).toBe("semantic");
    expect(checkerTemplateRow?.handles?.semanticProductHandle).not.toBeNull();
    expect(checkerTemplateRow?.handles?.semanticIdentityHandle).not.toBeNull();
    expect(checkerTemplateRow?.handles?.sourceAddressHandle).not.toBeNull();
    expect(checkerTemplateRow?.handles?.overlayOriginKey).toMatch(/^template-type-system-overlay:/);
    expect(checkerTemplateRow?.handles?.overlayFileName).toMatch(/\.semantic-runtime[\\/]overlays[\\/]templates[\\/].+\.ts$/);
    expect(checkerTemplateRow?.handles?.overlaySegmentLabel).toBe("template expression");
    expect(semanticAppIndex).toBeGreaterThanOrEqual(0);
    expect(checkerAppIndex).toBeGreaterThanOrEqual(0);
    expect(detailed.rows[semanticAppIndex]?.handles?.productHandle).toBe(semanticTemplateRow?.handles?.semanticProductHandle);
    expect(detailed.rows[semanticAppIndex]?.handles?.identityHandle).toBe(semanticTemplateRow?.handles?.semanticIdentityHandle);
    expect(detailed.rows[checkerAppIndex]?.phase).toBe(checkerTemplateRow?.phase);
    expect(detailed.rows[checkerAppIndex]?.handles?.productHandle).toBe(checkerTemplateRow?.handles?.semanticProductHandle);
    expect(detailed.rows[checkerAppIndex]?.handles?.identityHandle).toBe(checkerTemplateRow?.handles?.semanticIdentityHandle);
    expect(detailed.rows[checkerAppIndex]?.handles?.overlayOriginKey).toBe(checkerTemplateRow?.handles?.overlayOriginKey);
    expect(detailed.rows[checkerAppIndex]?.handles?.overlayFileName).toBe(checkerTemplateRow?.handles?.overlayFileName);
    expect(detailed.rows[checkerAppIndex]?.handles?.overlaySegmentLabel).toBe(checkerTemplateRow?.handles?.overlaySegmentLabel);
    expect(presentationGroup?.rawRowCount).toBe(2);
    expect(presentationGroup?.related).toEqual([
      expect.objectContaining({
        rowIndex: checkerAppIndex,
        role: "contextual",
        relation: "checker-evidence",
      }),
    ]);
    expect(compactRows.find((row) =>
      row.diagnosticKind === "template-expression-typescript-diagnostic"
      && row.source?.start === checkerTemplateRow?.source?.start
    )?.handles).toBeUndefined();
  });

  test("preserves a template capability demand's owning product through app aggregation", async () => {
    const sourceFile = "src/unregistered-plugin-resources-app.html";
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/unregistered-plugin-resources"),
      storeKey: "app-diagnostic-fact-conservation-template-capability",
    });
    const app = await runtime.openApp({ analysisDepth: "binding-observation" });
    const demand = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 200 },
    }).value.rows.find((row) =>
      row.requiredCapability === "router.default-resources"
      && row.source?.start === 8
    );
    const templateRow = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: sourceFile },
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 200 },
    }).value.rows.find((row) =>
      row.diagnosticKind === "framework-capability-not-registered"
      && row.missingInput === "router.default-resources"
      && row.source?.start === 8
    );
    const appRow = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: sourceFile },
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 300 },
    }).value.rows.find((row) =>
      row.diagnosticDomain === "template"
      && row.diagnosticKind === "framework-capability-not-registered"
      && row.missingInput === "router.default-resources"
      && row.source?.start === 8
    );

    expect(demand).toBeDefined();
    expect(templateRow).toBeDefined();
    expect(appRow).toBeDefined();
    expect(templateRow?.handles?.semanticProductHandle).toBe(demand?.handles?.productHandle);
    expect(templateRow?.handles?.semanticIdentityHandle).toBe(demand?.handles?.identityHandle);
    expect(templateRow?.handles?.sourceAddressHandle).toBe(demand?.handles?.sourceAddressHandle);
    expect(appRow?.handles?.productHandle).toBe(demand?.handles?.productHandle);
    expect(appRow?.handles?.identityHandle).toBe(demand?.handles?.identityHandle);
    expect(appRow?.handles?.sourceAddressHandle).toBe(demand?.handles?.sourceAddressHandle);
  });

  test("keeps assignment checker agreement contextual without deleting either row", () => {
    const rows = [
      assignmentDiagnosticRow(
        "binding-source-assignment-strictness",
        "semantic-runtime-product",
        "binding-source-assignment:target-to-source-type-mismatch",
      ),
      assignmentDiagnosticRow(
        "template-expression-typescript-diagnostic",
        "typescript",
        "typescript:TS2322",
      ),
    ];

    const presentation = appDiagnosticPresentation(rows, true);

    expect(presentation.rawRowCount).toBe(2);
    expect(presentation.primaryCount).toBe(1);
    expect(presentation.contextualCount).toBe(1);
    expect(presentation.groups[0]?.primary.rowIndex).toBe(0);
    expect(presentation.groups[0]?.related).toEqual([
      expect.objectContaining({
        rowIndex: 1,
        role: "contextual",
        relation: "checker-evidence",
      }),
    ]);
  });
});
