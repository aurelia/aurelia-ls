import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  appDiagnosticPresentation,
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticDiagnosticRelationKind,
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
    diagnosticIdentityHandle: null,
    relatedInformation: [],
    suggestion: null,
    sourceRole: "template",
    relatedQueryKind: SemanticAppQueryKind.TemplateDiagnostics,
  };
}

describe("app diagnostic fact conservation", () => {
  test("preserves closed evaluation, DI, and resource subjects through app aggregation", async () => {
    const evaluationRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/kernel-api-errors"),
      storeKey: "app-diagnostic-fact-conservation-evaluation-subject",
    });
    const evaluationApp = await evaluationRuntime.openApp({ analysisDepth: "binding-observation" });
    const evaluationOwning = evaluationApp.ask({
      kind: SemanticAppQueryKind.EvaluationIssues,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows.find((row) => row.issueKind === "event-aggregator-publish-invalid-event-name");
    const evaluationDiagnostic = evaluationApp.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 300 },
    }).value.rows.find((row) => row.handles?.productHandle === evaluationOwning?.handles?.productHandle);

    expect(evaluationOwning).toBeDefined();
    expect(evaluationDiagnostic?.subject).toEqual({
      subjectKind: "event-aggregator-publish-call",
      subjectName: null,
      source: evaluationOwning?.source,
    });

    const diRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/di-resolve-contexts"),
      storeKey: "app-diagnostic-fact-conservation-di-subject",
    });
    const diApp = await diRuntime.openApp({ analysisDepth: "binding-observation" });
    const diOwning = diApp.ask({
      kind: SemanticAppQueryKind.DiIssues,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows.find((row) =>
      row.issueKind === "no-construct-native-function"
      && row.containerApiCall?.methodKind === "invoke"
    );
    const diDiagnostic = diApp.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 300 },
    }).value.rows.find((row) => row.handles?.productHandle === diOwning?.handles?.productHandle);

    expect(diOwning).toBeDefined();
    expect(diDiagnostic?.subject).toEqual({
      subjectKind: "container-api-call",
      subjectName: "Array",
      source: diOwning?.source,
    });

    const resourceRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/resource-registration-duplicates"),
      storeKey: "app-diagnostic-fact-conservation-resource-subject",
    });
    const resourceApp = await resourceRuntime.openApp({ analysisDepth: "binding-observation" });
    const resourceOwning = resourceApp.ask({
      kind: SemanticAppQueryKind.ResourceIssues,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 100 },
    }).value.rows.find((row) =>
      row.frameworkErrorCode === "AUR0153"
      && row.resource.name === "duplicate-card"
    );
    const resourceDiagnostic = resourceApp.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      detail: SemanticRuntimeDetail.Handles,
      page: { size: 300 },
    }).value.rows.find((row) => row.handles?.productHandle === resourceOwning?.handles?.productHandle);

    expect(resourceOwning).toBeDefined();
    expect(resourceDiagnostic?.subject).toEqual({
      subjectKind: "custom-element",
      subjectName: "duplicate-card",
      source: resourceOwning?.source,
    });
  });

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

  test("preserves repeat source relations across runtime, data-flow, and checker diagnostics", async () => {
    const sourceFile = "src/template-controller-edge-cases-app.html";
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/template-controller-built-ins"),
      storeKey: "app-diagnostic-fact-conservation-repeat-relations",
    });
    const rows: SemanticAppDiagnosticRow[] = [];
    let cursor: string | null | undefined;
    do {
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnostics,
        sourceFile: { filePath: sourceFile },
        analysisDepth: "binding-observation",
        diagnosticProjection: "type-projection",
        includeAuthoringTemplates: true,
        page: { size: 2, cursor },
      });
      rows.push(...answer.value.rows);
      cursor = answer.page?.nextCursor;
    } while (cursor != null);
    const presentation = appDiagnosticPresentation(rows, true);
    const causes = rows.filter((row) =>
      row.diagnosticKind === "runtime-binding-scope-framework-error"
      && row.frameworkErrorCode === "AUR0777"
    );

    expect(causes).toHaveLength(2);
    expect(presentation.rawRowCount).toBe(rows.length);
    for (const cause of causes) {
      expect(cause.diagnosticIdentityHandle).not.toBeNull();
      expect(cause.handles).toBeUndefined();
      const causeIndex = rows.indexOf(cause);
      const group = presentation.groups.find((candidate) =>
        candidate.primary.rowIndex === causeIndex
      );
      const related = group?.related.map((item) => ({
        row: rows[item.rowIndex]!,
        presentationRelation: item.relation,
      })) ?? [];

      expect(group?.rawRowCount).toBe(4);
      expect(related).toHaveLength(3);
      expect(related.map(({ row, presentationRelation }) => ({
        diagnosticKind: row.diagnosticKind,
        diagnosticRelation: row.diagnosticRelations?.[0]?.relationKind,
        presentationRelation,
      }))).toEqual(expect.arrayContaining([
        {
          diagnosticKind: "binding-target-assignment-strictness",
          diagnosticRelation: SemanticDiagnosticRelationKind.SameOperationEvidence,
          presentationRelation: "semantic-explanation",
        },
        {
          diagnosticKind: "template-expression-typescript-diagnostic",
          diagnosticRelation: SemanticDiagnosticRelationKind.DerivedConsequence,
          presentationRelation: "derived-consequence",
        },
        {
          diagnosticKind: "weak-expression-member-owner",
          diagnosticRelation: SemanticDiagnosticRelationKind.DerivedConsequence,
          presentationRelation: "derived-consequence",
        },
      ]));
      for (const { row } of related) {
        expect(row.diagnosticRelations?.[0]?.relatedDiagnosticIdentityHandle)
          .toBe(cause.diagnosticIdentityHandle);
      }
    }
  });

  test("stops repeat diagnostic relations at a later slot assignment", async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, "fixtures/pressure/template-controller-built-ins"),
      storeKey: "app-diagnostic-fact-conservation-repeat-shadow",
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: "src/repeat-diagnostic-shadow-app.html" },
      analysisDepth: "binding-observation",
      diagnosticProjection: "type-projection",
      includeAuthoringTemplates: true,
      page: { size: 100 },
    });
    const rows = answer.value.rows;
    const cause = rows.find((row) =>
      row.diagnosticKind === "runtime-binding-scope-framework-error"
      && row.frameworkErrorCode === "AUR0777"
    );

    expect(cause?.diagnosticIdentityHandle).not.toBeNull();
    expect(rows.filter((row) =>
      row.diagnosticRelations?.some((relation) =>
        relation.relatedDiagnosticIdentityHandle === cause?.diagnosticIdentityHandle
      )
    ).map((row) => row.diagnosticKind)).toEqual([
      "binding-target-assignment-strictness",
    ]);
    expect(rows.filter((row) =>
      (
        row.diagnosticKind === "template-expression-typescript-diagnostic"
        && row.missingInputs.includes("typescript:TS18046")
      )
      || (
        row.diagnosticKind === "weak-expression-member-owner"
        && row.missingInputs.includes("expression-member-owner-type:missing-slot-type")
      )
    )).toEqual([]);
  });
});
