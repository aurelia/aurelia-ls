import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { TemplateCompilerRootSiteCursorObservationAdmissionState } from "@aurelia-ls/semantic-runtime/browser-template";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import {
  type SemanticCompilerGalleryObservation,
  SemanticCompilerGalleryOracle,
} from "../src/testing/semantic-compiler-gallery-oracle.js";
import {
  SemanticCompilerGalleryPlanner,
  SemanticCompilerGalleryUnsupportedReason,
  SemanticCompilerGalleryWorldDifference,
} from "../src/testing/semantic-compiler-gallery-plan.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const galleryRoot = path.join(packageRoot, "fixtures/semantic-compiler-gallery");

describe("semantic compiler gallery", () => {
  test("accounts for every canonical compiler world before starting semantic-runtime", () => {
    const planner = new SemanticCompilerGalleryPlanner();
    const plan = planner.plan(JIT_ORACLE_CASES);
    const repeated = planner.plan([...JIT_ORACLE_CASES].reverse());

    expect(plan.selectedCaseCount).toBe(50);
    expect(plan.admitted).toHaveLength(33);
    expect(plan.unsupported).toHaveLength(17);
    expect(plan.admitted.length + plan.unsupported.length).toBe(plan.selectedCaseCount);
    expect(plan.sourceText).toBe(repeated.sourceText);
    expect(plan.sourceDigest).toBe(repeated.sourceDigest);
    expect(plan.compilerTreeProfile).toBe("semantic-runtime/authored-html-compiler-input/v1");
    expect(plan.admitted.every((candidate) =>
      candidate.anticipatedWorldDifferences.includes(SemanticCompilerGalleryWorldDifference.ResolveResources)
      && candidate.anticipatedWorldDifferences.includes(SemanticCompilerGalleryWorldDifference.SharedResourceScope)
      && candidate.anticipatedWorldDifferences.includes(SemanticCompilerGalleryWorldDifference.CompilerTreeAuthority)
      && candidate.anticipatedWorldDifferences.includes(SemanticCompilerGalleryWorldDifference.GeneratedDefinitionType)
    )).toBe(true);

    const unsupported = new Map(plan.unsupported.map((candidate) => [candidate.caseId, candidate.reasons]));
    expect(unsupported.get("entry.bypass.needs-compile-false")).toEqual(expect.arrayContaining([
      SemanticCompilerGalleryUnsupportedReason.CompilerBypass,
      SemanticCompilerGalleryUnsupportedReason.PrecompiledDefinitionFields,
    ]));
    expect(unsupported.get("operation.compile-spread.reject-template-controller"))
      .toEqual([SemanticCompilerGalleryUnsupportedReason.CompileSpread]);
    expect(unsupported.get("debug.data-attributes.preserved"))
      .toEqual([SemanticCompilerGalleryUnsupportedReason.DebugProfile]);
    expect(unsupported.get("extension.hooks.child-before-root")).toEqual(expect.arrayContaining([
      SemanticCompilerGalleryUnsupportedReason.SetupMaterialization,
      SemanticCompilerGalleryUnsupportedReason.RegistrationMaterialization,
    ]));
  });

  test("observes the broad admitted cohort in one current app generation without claiming equivalence", async () => {
    const plan = new SemanticCompilerGalleryPlanner().plan(JIT_ORACLE_CASES);
    const run = await new SemanticCompilerGalleryOracle({ workspaceRoot: galleryRoot }).execute(plan);

    expect(run.selectedCaseCount).toBe(50);
    expect(run.admittedCaseCount).toBe(33);
    expect(run.unsupported).toHaveLength(17);
    expect(run.observations).toHaveLength(33);
    expect(run.missingCaseIds).toEqual([]);
    expect(run.publicCompilationRowCount).toBe(34);
    expect(run.summaryAnalysisBasis?.revision).toMatch(/^semantic-analysis-basis\/1:[A-Za-z0-9_-]+$/u);
    expect(run.summaryAnalysisDepth).toBe("runtime-topology");
    expect(run.inquiryProfile).toBe("aot");
    expect(run.observationAuthority).toEqual({
      kind: "synchronous-app-emission-bracket",
      portableAnalysisBasis: null,
      currentAtEgress: true,
      executableReceiptLifetime: "retired-before-return",
    });
    expect(run.compilerTreeProfile).toBe("semantic-runtime/authored-html-compiler-input/v1");
    expect(run.stages["semantic.analysis"]).toBeGreaterThan(0);
    expect(run.stages["semantic.browser-template-materialization"]).toBeGreaterThan(0);
    expect(run.stages["semantic.normalized-structural-replay"]).toBeGreaterThan(0);
    expect(run.stages["semantic.site-cursor"]).toBeGreaterThan(0);

    const observations = new Map(run.observations.map((observation) => [observation.caseId, observation]));
    const replayStates = Object.fromEntries(["exact", "open", "refused"].map((state) => [
      state,
      run.observations.filter((observation) => observation.normalizedStructuralReplay.state === state).length,
    ]));
    expect(replayStates).toEqual({ exact: 25, open: 6, refused: 2 });
    expect(run.observations.every((observation) =>
      ["exact", "open", "refused"].includes(observation.normalizedStructuralReplay.state)
    )).toBe(true);
    const openReplayReasons = new Map([
      ["interaction.browser.carrier-comment-shield", ["browser-context-membership-open"]],
      ["interaction.browser.duplicate-binding-elision", ["non-singular-origin"]],
      ["interaction.browser.foster-target-order", ["browser-target-order-open"]],
      ["interaction.browser.paragraph-controller-topology", ["browser-correspondence-open"]],
      ["diagnostic.local.duplicate-bindable-attribute", ["local-template-open"]],
      ["surrogate.static-class", ["surrogate-execution-open"]],
    ]);
    for (const [caseId, reasonKinds] of openReplayReasons) {
      expect(observations.get(caseId)?.normalizedStructuralReplay).toMatchObject({
        state: "open",
        reasonKinds,
        realizedContextCount: 0,
        geometryCount: 0,
      });
    }
    expect(observations.get("diagnostic.slot.without-shadow")?.normalizedStructuralReplay)
      .toMatchObject({ state: "refused", reasonKinds: ["compiler-refused"] });
    expect(observations.get("diagnostic.surrogate.unique-id")?.normalizedStructuralReplay)
      .toMatchObject({ state: "refused", reasonKinds: ["compiler-refused"] });
    expect(run.observations.every((observation) => observation.authored.draftBindingsRetained)).toBe(true);
    expect(run.observations.every((observation) => /^sha256:[0-9a-f]{64}$/u.test(observation.observationDigest)))
      .toBe(true);
    expect(run.observations.every((observation) =>
      observation.worldDifferences.includes(SemanticCompilerGalleryWorldDifference.ResolveResources)
      && observation.worldDifferences.includes(SemanticCompilerGalleryWorldDifference.SharedResourceScope)
      && observation.worldDifferences.includes(SemanticCompilerGalleryWorldDifference.CompilerTreeAuthority)
      && observation.worldDifferences.includes(SemanticCompilerGalleryWorldDifference.GeneratedDefinitionType)
    )).toBe(true);
    expect(observations.get("diagnostic.surrogate.unique-id")).toMatchObject({
      expectedJitProduct: "compiler-error",
      compilerProfile: { debug: false, resolveResources: true },
      compiledTemplate: { state: "invalid", needsCompile: null },
      issues: [{ issueKind: "invalid-surrogate-attribute", frameworkErrorCode: "AUR0702" }],
    });
    expect(observations.get("interaction.browser.duplicate-binding-elision")?.compiledTemplate.rootRows[0]
      ?.instructionKinds).toEqual(["property-binding", "property-binding"]);
    const tenHoleRows = observations.get("interpolation.text.ten-hole")?.compiledTemplate.rootRows ?? [];
    expect(tenHoleRows).toHaveLength(10);
    expect(tenHoleRows.every((row) => row.instructionKinds.length === 1
      && row.instructionKinds[0] === "text-binding")).toBe(true);
    const siblingDefinitions = observations.get("interaction.generated.double-sibling-if")
      ?.compiledTemplate.generatedDefinitions ?? [];
    expect(siblingDefinitions).toHaveLength(4);
    expect(siblingDefinitions.map((definition) => definition.rows.length).sort()).toEqual([0, 0, 1, 1]);
    expect(siblingDefinitions.every((definition) =>
      definition.state === 'complete' && definition.needsCompile === false
    )).toBe(true);
    expect(siblingDefinitions.filter((definition) => definition.rows.length === 0)
      .every((definition) => definition.compilerReachableNodeCount > 0)).toBe(true);
    expect(observations.get("interaction.generated.double-sibling-if")?.normalizedStructuralReplay).toEqual({
      state: "exact",
      reasonKinds: [],
      structuralDigest: "sha256:6c159a665f702bedd46aa91ec13e625a2e4f6a9c436ff9f38f1307c3d5493436",
      normalizedContextCount: 5,
      realizedContextCount: 5,
      targetRowCount: 4,
      geometryCount: 4,
      consumedNodeCount: 0,
      consumedAttributeCount: 4,
      inputTransferCount: 4,
      textExpansionCount: 0,
      generatedOccurrenceCount: 20,
    });
    expect(observations.get("interaction.generated.nested-if-else-template")?.normalizedStructuralReplay).toEqual({
      state: "exact",
      reasonKinds: [],
      structuralDigest: "sha256:31c9e8f530db6743a6885d85aa4a74fd9f97064f661863ab7215320bc09d378e",
      normalizedContextCount: 7,
      realizedContextCount: 7,
      targetRowCount: 10,
      geometryCount: 10,
      consumedNodeCount: 0,
      consumedAttributeCount: 6,
      inputTransferCount: 6,
      textExpansionCount: 4,
      generatedOccurrenceCount: 26,
    });
    expect(observations.get("interpolation.text.ten-hole")?.normalizedStructuralReplay).toMatchObject({
      state: "exact",
      normalizedContextCount: 1,
      realizedContextCount: 1,
      targetRowCount: 10,
      geometryCount: 10,
      textExpansionCount: 1,
      generatedOccurrenceCount: 20,
    });
    expect(observations.get("interpolation.text.ten-hole")?.normalizedStructuralReplay.structuralDigest)
      .toBe("sha256:b2444338bcf0bb019b80872e36951fa1e954752aabc1a817e6ec3c326cc19239");
    expect(observations.get("interaction.browser.foster-target-order")?.declaredEffects).toContainEqual(
      expect.objectContaining({ kind: "browser-recovery", conservation: "open" }),
    );

    expect([...new Set(run.observations.map((observation) => observation.siteCursor.admissionState))].sort())
      .toEqual(["cursor-transcript", "local-refused"]);
    const transcriptCursors = run.observations.flatMap((observation) =>
      observation.siteCursor.admissionState
        === TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
        ? [observation.siteCursor]
        : []
    );
    expect([...new Set(transcriptCursors.map((cursor) => cursor.frontierKind ?? "complete"))].sort()).toEqual([
      "after-attributes-before-projection",
      "after-attributes-before-template-controller",
      "at-live-attribute-relowering",
      "authored-precedent-mismatch",
      "complete",
      "invalid-surrogate-attribute",
      "let-element-lowering-required",
      "surrogate-classification-required",
    ]);
    expect([...new Set(transcriptCursors.map((cursor) => cursor.ledgerState))].sort())
      .toEqual(["all-sites-accounted", "open"]);
    for (const cursor of transcriptCursors) {
      expect(cursor.authoredBundleCount).toBe(cursor.spendCount + cursor.rawUnspentCount);
      expect(cursor.rawUnspentCount).toBe(cursor.remainderCount + cursor.blockedByFrontierCount);
      expect(sumCounts(cursor.eventKindCounts)).toBe(cursor.nextTranscriptOrdinal);
      expect(cursor.nextSiteEventOrdinal).toBe(
        (cursor.spendDispositionCounts["browser-compatible"] ?? 0)
        + (cursor.spendDispositionCounts["browser-relowering-required"] ?? 0)
        + sumCounts(cursor.occurrenceOnlyDispositionCounts)
      );
      expect(cursor.conflictCount).toBe(0);
      expect(cursor.currentness.exact).toBe(true);
      expect(cursor.currentness.forestMutationRevisionDelta)
        .toBe(cursor.currentness.expectedForestMutationRevisionDelta);
      expect(cursor.currentness.globalOperationCountDelta)
        .toBe(cursor.currentness.expectedGlobalOperationCountDelta);
      expect(cursor.eventDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(cursor.reasonKinds).toEqual([]);
      expect(cursor.eventKindCounts.frontier ?? 0).toBe(cursor.frontierKind == null ? 0 : 1);
      if (cursor.frontierKind == null) {
        expect(cursor.phaseKinds.at(-1)).toBe("surrogate-end");
      } else {
        expect(cursor.frontierPhase).toBe(cursor.phaseKinds.at(-1));
      }
    }

    expect(observations.get("attribute-owner-state.interpolation-first")?.siteCursor).toMatchObject({
      admissionState: "cursor-transcript",
      frontierKind: null,
      ledgerState: "all-sites-accounted",
      spendDispositionCounts: { "browser-compatible": 2 },
    });
    expect(observations.get("diagnostic.local.duplicate-bindable-attribute")?.siteCursor).toMatchObject({
      admissionState: "local-refused",
      reasonKinds: ["local-template-bindable-duplicate"],
      graphState: "graph-exact",
      hookState: "exact",
      hookBoundaryEntryOrdinal: null,
      localState: "refused",
      localCompletedExtractionCount: 0,
      localExtractedTemplateCount: 0,
      bindingState: null,
      localIssueKind: "local-template-bindable-duplicate",
      localFrameworkErrorCode: "AUR0712",
    });
    expect(observations.get("diagnostic.surrogate.unique-id")?.siteCursor).toMatchObject({
      frontierKind: "invalid-surrogate-attribute",
      frontierPhase: "surrogate-validation-start",
      spendCount: 0,
      blockedByFrontierCount: 1,
    });
    expect(observations.get("interaction.browser.duplicate-binding-elision")?.siteCursor).toMatchObject({
      frontierKind: "at-live-attribute-relowering",
      spendDispositionCounts: { "browser-relowering-required": 1 },
      remainderKindCounts: { "html-tree-builder-dropped": 1 },
    });
    expect(observations.get("interaction.browser.foster-target-order")?.siteCursor).toMatchObject({
      frontierKind: null,
      occurrenceOnlyDispositionCounts: {
        "static-text-pass-through": 2,
        "browser-implied-element-pass-through": 1,
      },
    });
    expect(observations.get("interaction.generated.double-sibling-if")?.siteCursor).toMatchObject({
      frontierKind: "after-attributes-before-template-controller",
      frontierPhase: "content-start",
    });
    expect(observations.get("interaction.browser.paragraph-controller-topology")?.siteCursor).toMatchObject({
      frontierKind: "authored-precedent-mismatch",
      spendCount: 0,
      blockedByFrontierCount: 3,
    });
    expect(observations.get("let.bind-interpolation")?.siteCursor).toMatchObject({
      frontierKind: "let-element-lowering-required",
      spendCount: 0,
      blockedByFrontierCount: 2,
    });
    expect(observations.get("projection.au-slot.interpolation-fallback")?.siteCursor).toMatchObject({
      frontierKind: "after-attributes-before-projection",
      frontierPhase: "content-start",
      eventKindCounts: { "process-content": 1 },
      currentness: {
        exact: true,
        forestMutationRevisionDelta: 0,
        expectedForestMutationRevisionDelta: 0,
        globalOperationCountDelta: 1,
        expectedGlobalOperationCountDelta: 1,
      },
    });
    expect(observations.get("surrogate.static-class")?.siteCursor).toMatchObject({
      frontierKind: "surrogate-classification-required",
      frontierPhase: "surrogate-validation-end",
    });
    const tenHoleCursor = observations.get("interpolation.text.ten-hole")?.siteCursor;
    expect(tenHoleCursor?.admissionState)
      .toBe(TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript);
    if (tenHoleCursor?.admissionState !== TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript) {
      throw new Error("Expected ten-hole cursor transcript.");
    }
    expect(tenHoleCursor.frontierKind).toBeNull();
    expect(tenHoleCursor.eventKindCounts.text).toBe(1);
    expect(tenHoleCursor.spendCount).toBe(1);
    expect(tenHoleCursor.nextSiteEventOrdinal).toBe(1);
    expect(observations.get("diagnostic.slot.without-shadow")).toMatchObject({
      compiledTemplate: { state: "invalid" },
      issues: [{ issueKind: "slot-without-shadow-dom", frameworkErrorCode: "AUR0717" }],
      siteCursor: {
        admissionState: "cursor-transcript",
        frontierKind: null,
        ledgerState: "all-sites-accounted",
        conflictCount: 0,
      },
    });
    expect(cursorDigest(observations, "attribute-owner-state.interpolation-first"))
      .not.toBe(cursorDigest(observations, "attribute-owner-state.binding-first"));
    expect(cursorDigest(observations, "native-order.checkbox.checked-before-model"))
      .not.toBe(cursorDigest(observations, "native-order.checkbox.model-before-checked"));

    for (const observation of run.observations) {
      const portable = observation.siteCursor;
      expect(Object.getPrototypeOf(portable)).toBe(Object.prototype);
      const roundTripped: unknown = JSON.parse(JSON.stringify(portable));
      expect(roundTripped).toEqual(portable);
      const serialized = JSON.stringify(portable);
      for (const forbidden of ["binding", "execution", "forest", "compilerReads", "preWalkAuthority", "browserEmission"]) {
        expect(serialized).not.toContain(`"${forbidden}"`);
      }
    }
  }, 15_000);

  test("marks an entirely unsupported selection as having no semantic currentness proof", async () => {
    const debugCase = JIT_ORACLE_CASES.find((candidate) => candidate.id === "debug.data-attributes.preserved");
    if (debugCase == null) throw new Error("Expected the debug compiler case.");
    const plan = new SemanticCompilerGalleryPlanner().plan([debugCase]);
    const run = await new SemanticCompilerGalleryOracle({ workspaceRoot: galleryRoot }).execute(plan);

    expect(run.admittedCaseCount).toBe(0);
    expect(run.unsupported).toHaveLength(1);
    expect(run.summaryAnalysisBasis).toBeNull();
    expect(run.observationAuthority).toEqual({
      kind: "not-created",
      portableAnalysisBasis: null,
      currentAtEgress: null,
      executableReceiptLifetime: "not-created",
    });
  });
});

function sumCounts(counts: Readonly<Record<string, number>>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function cursorDigest(
  observations: ReadonlyMap<string, SemanticCompilerGalleryObservation>,
  caseId: string,
): string | null {
  const cursor = observations.get(caseId)?.siteCursor;
  return cursor?.admissionState === TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
    ? cursor.eventDigest
    : null;
}
