import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { TemplateCompilerRootSiteCursorObservationAdmissionState } from "@aurelia-ls/semantic-runtime/browser-template";
import type { CompilerCaseData } from "../src/testing/compiler-case.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import {
  JitCompilerBlueprintBatch,
  JitCompilerBlueprintObserver,
} from "../src/testing/jit-compiler-blueprint-observer.js";
import { JitCompilerCaseExecutor } from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import {
  type SemanticCompilerGalleryObservation,
  SemanticCompilerGalleryOracle,
} from "../src/testing/semantic-compiler-gallery-oracle.js";
import {
  semanticCompiledDefinitionDigest,
  SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS,
  SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION,
  SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS,
} from "../src/testing/semantic-compiled-definition-family-observer.js";
import {
  compareSemanticCompiledDefinitionsToJit,
  SemanticCompiledDefinitionMismatchKind,
} from "../src/testing/semantic-compiled-definition-family-comparison.js";
import {
  SemanticCompilerGalleryPlanner,
  SemanticCompilerGalleryUnsupportedReason,
  SemanticCompilerGalleryWorldDifference,
} from "../src/testing/semantic-compiler-gallery-plan.js";
import {
  SEMANTIC_FROZEN_FAMILY_EXACT_FIELDS,
  SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION,
  SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS,
} from "../src/testing/semantic-frozen-family-observer.js";
import {
  compareSemanticFrozenFamiliesToJit,
  SEMANTIC_FROZEN_FAMILY_COMMON_JIT_FIELDS,
  SemanticFrozenFamilyStructuralMismatchKind,
} from "../src/testing/semantic-frozen-family-structural-comparison.js";
import {
  semanticRuntimeInstructionFamilyWireDigest,
  SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION,
} from "../src/testing/semantic-runtime-instruction-family-observer.js";
import {
  compareSemanticRuntimeInstructionsToJit,
  SEMANTIC_RUNTIME_INSTRUCTION_COMMON_JIT_FIELDS,
  SemanticRuntimeInstructionMismatchKind,
} from "../src/testing/semantic-runtime-instruction-family-comparison.js";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const galleryRoot = path.join(packageRoot, "fixtures/semantic-compiler-gallery");

describe("semantic compiler gallery", () => {
  test("accounts for every canonical compiler world before starting semantic-runtime", () => {
    const planner = new SemanticCompilerGalleryPlanner();
    const plan = planner.plan(JIT_ORACLE_CASES);
    const repeated = planner.plan([...JIT_ORACLE_CASES].reverse());

    expect(plan.selectedCaseCount).toBe(53);
    expect(plan.admitted).toHaveLength(35);
    expect(plan.unsupported).toHaveLength(18);
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
    expect(unsupported.get("definition.header.bindable.explicit"))
      .toEqual([SemanticCompilerGalleryUnsupportedReason.BindableDefinition]);
    expect(unsupported.get("extension.hooks.child-before-root")).toEqual(expect.arrayContaining([
      SemanticCompilerGalleryUnsupportedReason.SetupMaterialization,
      SemanticCompilerGalleryUnsupportedReason.RegistrationMaterialization,
    ]));
  });

  test("observes the broad admitted cohort in one current app generation without claiming equivalence", async () => {
    const plan = new SemanticCompilerGalleryPlanner().plan(JIT_ORACLE_CASES);
    const run = await new SemanticCompilerGalleryOracle({ workspaceRoot: galleryRoot }).execute(plan);

    expect(run.selectedCaseCount).toBe(53);
    expect(run.admittedCaseCount).toBe(35);
    expect(run.unsupported).toHaveLength(18);
    expect(run.observations).toHaveLength(35);
    expect(run.missingCaseIds).toEqual([]);
    expect(run.publicCompilationRowCount).toBe(36);
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
    expect(run.stages["semantic.frozen-family"]).toBeGreaterThan(0);

    const observations = new Map(run.observations.map((observation) => [observation.caseId, observation]));
    const replayStates = Object.fromEntries(["exact", "open", "refused"].map((state) => [
      state,
      run.observations.filter((observation) => observation.normalizedStructuralReplay.state === state).length,
    ]));
    expect(replayStates).toEqual({ exact: 27, open: 6, refused: 2 });
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
    const frozenStates = Object.fromEntries([
      "exact:frozen-value",
      "ineligible:root-site-run",
      "ineligible:family-completion",
      "pending:family-completion",
      "pending:frozen-value",
    ].map((state) => [
      state,
      run.observations.filter((observation) =>
        `${observation.frozenFamily.state}:${observation.frozenFamily.stage}` === state
      ).length,
    ]));
    expect(frozenStates).toEqual({
      "exact:frozen-value": 30,
      "ineligible:root-site-run": 1,
      "ineligible:family-completion": 2,
      "pending:family-completion": 2,
      "pending:frozen-value": 0,
    });
    expect(run.observations.every((observation) =>
      observation.frozenFamily.schemaVersion === SEMANTIC_FROZEN_FAMILY_OBSERVER_VERSION
    )).toBe(true);
    const exactFrozen = run.observations.flatMap((observation) =>
      observation.frozenFamily.kind === "exact" ? [observation.frozenFamily] : []
    );
    expect(exactFrozen).toHaveLength(30);
    expect(exactFrozen.reduce((count, frozen) => count + frozen.liveExpressionCount, 0)).toBe(53);
    expect(exactFrozen.reduce((count, frozen) => count + frozen.referencedLiveExpressionCount, 0)).toBe(50);
    expect(exactFrozen.reduce((count, frozen) => count + frozen.instructionValueCount, 0)).toBe(80);
    expect(exactFrozen.every((frozen) =>
      /^sha256:[0-9a-f]{64}$/u.test(frozen.structuralDigest)
      && frozen.exactFields === SEMANTIC_FROZEN_FAMILY_EXACT_FIELDS
      && frozen.omittedJitFields === SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS
    )).toBe(true);
    const exactRuntimeInstructions = run.observations.flatMap((observation) =>
      observation.runtimeInstructions?.kind === "exact" ? [observation.runtimeInstructions] : []
    );
    expect(exactRuntimeInstructions).toHaveLength(30);
    expect(exactRuntimeInstructions.reduce((count, observation) => count + observation.instructionCount, 0)).toBe(80);
    expect(exactRuntimeInstructions.reduce((count, observation) => count + observation.rowInstructionCount, 0)).toBe(70);
    expect(exactRuntimeInstructions.every((observation) =>
      observation.schemaVersion === SEMANTIC_RUNTIME_INSTRUCTION_FAMILY_OBSERVER_VERSION
      && observation.resourceRepresentation === "name"
      && /^sha256:[0-9a-f]{64}$/u.test(observation.wireDigest)
    )).toBe(true);
    expect(run.observations.filter((observation) => observation.frozenFamily.kind !== "exact")
      .every((observation) => observation.runtimeInstructions == null)).toBe(true);
    const exactCompiledDefinitions = run.observations.flatMap((observation) =>
      observation.compiledDefinitions?.kind === "exact" ? [observation.compiledDefinitions] : []
    );
    expect(exactCompiledDefinitions).toHaveLength(30);
    expect(exactCompiledDefinitions.reduce((count, observation) => count + observation.definitionCount, 0)).toBe(44);
    expect(exactCompiledDefinitions.every((observation) =>
      observation.schemaVersion === SEMANTIC_COMPILED_DEFINITION_FAMILY_OBSERVER_VERSION
      && observation.commonJitFields === SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS
      && observation.omittedFields === SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS
      && /^sha256:[0-9a-f]{64}$/u.test(observation.definitionDigest)
    )).toBe(true);
    expect(run.observations.filter((observation) => observation.frozenFamily.kind !== "exact")
      .every((observation) => observation.compiledDefinitions == null)).toBe(true);
    expect(observations.get("definition.header.capture-all")?.compiledDefinitions).toMatchObject({
      kind: "exact",
      definitions: [{ capture: true, containerless: false }],
    });
    expect(observations.get("definition.header.containerless")?.compiledDefinitions).toMatchObject({
      kind: "exact",
      definitions: [{ capture: false, containerless: true }],
    });
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
    const frozenSibling = observations.get("interaction.generated.double-sibling-if")?.frozenFamily;
    expect(frozenSibling?.kind).toBe("exact");
    if (frozenSibling?.kind !== "exact") throw new Error("Expected exact frozen sibling family.");
    expect(frozenSibling.definitions.map((definition) => definition.rows.length)).toEqual([2, 1, 0, 1, 0]);
    expect(frozenSibling.definitions.map((definition) => definition.owner)).toEqual([
      { kind: "root" },
      {
        kind: "template-controller",
        parentDefinitionIndex: 0,
        rowIndex: 0,
        instructionIndex: 0,
        instructionKind: "hydrate-template-controller",
        slotName: null,
        fieldPath: ["def"],
      },
      {
        kind: "template-controller",
        parentDefinitionIndex: 1,
        rowIndex: 0,
        instructionIndex: 0,
        instructionKind: "hydrate-template-controller",
        slotName: null,
        fieldPath: ["def"],
      },
      {
        kind: "template-controller",
        parentDefinitionIndex: 0,
        rowIndex: 1,
        instructionIndex: 0,
        instructionKind: "hydrate-template-controller",
        slotName: null,
        fieldPath: ["def"],
      },
      {
        kind: "template-controller",
        parentDefinitionIndex: 3,
        rowIndex: 0,
        instructionIndex: 0,
        instructionKind: "hydrate-template-controller",
        slotName: null,
        fieldPath: ["def"],
      },
    ]);
    const frozenParagraph = observations.get("interaction.browser.paragraph-controller-topology")?.frozenFamily;
    expect(frozenParagraph?.kind).toBe("exact");
    if (frozenParagraph?.kind !== "exact") throw new Error("Expected exact frozen paragraph family.");
    expect(frozenParagraph.definitions).toHaveLength(3);
    expect(frozenParagraph.definitions.map((definition) => definition.rows.length)).toEqual([2, 0, 1]);
    expect(frozenParagraph.sourceOpenSeams).toEqual([
      {
        seamKindKey: "template.open-structure-correspondence",
        reasonKinds: ["template-structure-correspondence-open"],
      },
      {
        seamKindKey: "template.open-structure-correspondence",
        reasonKinds: ["template-structure-correspondence-open"],
      },
    ]);
    const frozenNativeSlot = observations.get("slot.native.nested-has-slots")?.frozenFamily;
    expect(frozenNativeSlot?.kind).toBe("exact");
    if (frozenNativeSlot?.kind !== "exact") throw new Error("Expected exact frozen native-slot family.");
    expect(frozenNativeSlot.definitions.map((definition) => ({
      owner: definition.owner.kind,
      hasSlots: definition.hasSlots,
      rows: definition.rows.length,
    }))).toEqual([
      { owner: "root", hasSlots: true, rows: 1 },
      { owner: "template-controller", hasSlots: false, rows: 0 },
    ]);
    expect(observations.get("slot.native.nested-has-slots")?.compiledDefinitions).toMatchObject({
      kind: "exact",
      definitions: [
        { hasSlots: true },
        { hasSlots: false },
      ],
    });
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
      "complete",
      "invalid-surrogate-attribute",
      "let-element-lowering-required",
      "native-slot-without-shadow-dom-invalid",
      "surrogate-classification-required",
    ]);
    expect([...new Set(transcriptCursors.map((cursor) => cursor.ledgerState))].sort())
      .toEqual(["all-sites-accounted", "open"]);
    expect(transcriptCursors.filter((cursor) => cursor.completionReceiptPresent)).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.completionState === "complete")).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.occurrenceRowAssemblyState === "exact")).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.occurrenceTargetPlanState === "exact")).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.occurrenceTargetAttachmentPresent)).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.occurrenceTargetExecutionPresent)).toHaveLength(25);
    expect(transcriptCursors.filter((cursor) => cursor.occurrenceHydrateElementAllocationState === "exact"))
      .toHaveLength(0);
    expect(transcriptCursors.every((cursor) =>
      cursor.completionReceiptPresent === (cursor.occurrenceRowAssemblyState === "exact")
    )).toBe(true);
    expect(run.observations.filter((observation) =>
      observation.siteCursor.admissionState === TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
      && observation.siteCursor.completionReceiptPresent
    ).map((observation) => observation.caseId).sort()).toEqual([
      "attribute-owner-state.binding-first",
      "attribute-owner-state.interpolation-first",
      "binding.listener.trigger",
      "binding.property.input-value",
      "binding.property.input-value-as-number",
      "binding.property.label-for",
      "debug.data-attributes.removed",
      "definition.header.capture-all",
      "definition.header.containerless",
      "interaction.browser.carrier-comment-shield",
      "interaction.browser.duplicate-binding-elision",
      "interaction.browser.foster-target-order",
      "interpolation.text.single-hole",
      "interpolation.text.ten-hole",
      "markup.static.platform-attribute",
      "native-order.checkbox.checked-before-matcher",
      "native-order.checkbox.checked-before-model",
      "native-order.checkbox.checked-before-model-matcher",
      "native-order.checkbox.model-before-checked",
      "native-order.radio.checked-before-value",
      "native-order.radio.value-before-checked",
      "native-order.select.matcher-value-multiple",
      "native-order.select.multiple-matcher-value",
      "native-order.select.static-multiple-value-matcher",
      "native-order.select.value-matcher-multiple",
    ]);
    const exactOccurrenceCursors = transcriptCursors.filter((cursor) =>
      cursor.occurrenceRowAssemblyState === "exact"
    );
    expect(exactOccurrenceCursors.reduce((count, cursor) => count + cursor.occurrenceRowCount, 0)).toBe(33);
    expect(exactOccurrenceCursors.reduce((count, cursor) => count + cursor.occurrenceTargetPlanRowCount, 0)).toBe(33);
    expect(exactOccurrenceCursors.reduce((count, cursor) => count + cursor.occurrenceStaticSiteCount, 0)).toBe(10);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + cursor.occurrenceTargetExecutionOperationCount,
      0,
    )).toBe(63);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + cursor.occurrenceTargetExecutionAttributeDispositionCount,
      0,
    )).toBe(39);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + cursor.occurrenceTargetExecutionTextExpansionCount,
      0,
    )).toBe(2);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + cursor.occurrenceTargetExecutionGeometryCount,
      0,
    )).toBe(33);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + cursor.occurrenceTargetExecutionForestMutationRevisionDelta,
      0,
    )).toBe(129);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + (cursor.occurrenceTargetExecutionOperationKindCounts["attribute-disposition"] ?? 0),
      0,
    )).toBe(39);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + (cursor.occurrenceTargetExecutionOperationKindCounts["hydration-target-creation"] ?? 0),
      0,
    )).toBe(22);
    expect(exactOccurrenceCursors.reduce(
      (count, cursor) => count + (cursor.occurrenceTargetExecutionOperationKindCounts["text-interpolation-expansion"] ?? 0),
      0,
    )).toBe(2);
    const occurrenceInstructionTotals: Record<string, number> = {};
    for (const cursor of exactOccurrenceCursors) {
      for (const [kind, count] of Object.entries(cursor.occurrenceInstructionKindCounts)) {
        occurrenceInstructionTotals[kind] = (occurrenceInstructionTotals[kind] ?? 0) + count;
      }
    }
    expect(occurrenceInstructionTotals).toEqual({
      "property-binding": 35,
      interpolation: 3,
      "listener-binding": 1,
      "text-binding": 11,
    });
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
      expect(cursor.currentness.authorityScope).toBe("historical-site-cursor-prefix");
      expect(cursor.currentness.forestMutationRevisionDelta)
        .toBe(cursor.currentness.expectedForestMutationRevisionDelta);
      expect(cursor.currentness.globalOperationCountDelta)
        .toBe(cursor.currentness.expectedGlobalOperationCountDelta);
      expect(cursor.currentness.laneOperationCountDelta)
        .toBe(cursor.currentness.expectedLaneOperationCountDelta);
      expect(cursor.eventDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
      expect(cursor.occurrenceHydrateElementAllocationState).toBe("not-applicable");
      expect(cursor.occurrenceHydrateElementAllocationReasonKinds).toEqual([]);
      expect(cursor.occurrenceHydrateElementHeadCount).toBe(0);
      expect(cursor.occurrenceHydrateElementReusedCaptureCount).toBe(0);
      expect(cursor.occurrenceHydrateElementEffectiveCaptureCount).toBe(0);
      expect(cursor.occurrenceHydrateElementAllocationDigest).toBeNull();
      if (cursor.occurrenceRowAssemblyState === "exact") {
        expect(cursor.occurrenceRowAssemblyReasonKinds).toEqual([]);
        expect(cursor.occurrencePrePlanEffectState).toBe("none");
        expect(cursor.occurrenceRowDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
        expect(cursor.occurrenceMembershipCount)
          .toBe(1 + cursor.completedElementSiteCount + cursor.completedTextSiteCount);
      } else {
        expect(cursor.occurrenceRowDigest).toBeNull();
      }
      if (cursor.occurrenceTargetPlanState === "exact") {
        expect(cursor.occurrenceTargetPlanReasonKinds).toEqual([]);
        expect(cursor.occurrenceTargetPlanRowCount).toBe(cursor.occurrenceRowCount);
        expect(cursor.occurrenceTargetPlanMembershipCount).toBe(cursor.occurrenceMembershipCount);
        expect(new Set(cursor.occurrenceTargetPlanStableRowKeys).size)
          .toBe(cursor.occurrenceTargetPlanStableRowKeys.length);
        expect(cursor.occurrenceTargetPlanFreshRoot).toBe(true);
        expect(cursor.occurrenceTargetPlanDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
        expect(cursor.occurrenceTargetPublicationPrerequisiteCounts).toEqual({});
        expect(cursor.occurrenceTargetAttachmentPresent).toBe(true);
        expect(cursor.occurrenceTargetAttachmentContextCount).toBe(1);
        expect(cursor.occurrenceTargetAttachmentStructuralPlanCount).toBe(1);
        expect(cursor.occurrenceTargetAttachmentInvocationPhase).toBe("target-execution");
        expect(cursor.occurrenceTargetAttachmentConsumedPrePlanAuthority).toBe(true);
        expect(cursor.occurrenceTargetAttachmentCurrentBeforeExecution).toBe(true);
        expect(cursor.occurrenceTargetAttachmentCurrentAfterExecution).toBe(false);
        expect(cursor.occurrenceTargetExecutionPresent).toBe(true);
        expect(cursor.occurrenceTargetExecutionAttributeDispositionCount)
          .toBe(cursor.occurrenceAttributeDispositionCounts.removed ?? 0);
        expect(cursor.occurrenceTargetExecutionTextExpansionCount)
          .toBe(cursor.occurrenceTextExpansionCount);
        expect(cursor.occurrenceTargetExecutionGeometryCount).toBe(cursor.occurrenceRowCount);
        expect(cursor.occurrenceTargetExecutionOperationCount).toBe(
          (cursor.occurrenceAttributeDispositionCounts.removed ?? 0)
          + cursor.occurrenceRowCount
          - cursor.completedTextHoleCount
          + cursor.occurrenceTextExpansionCount
        );
        expect(sumCounts(cursor.occurrenceTargetExecutionOperationKindCounts))
          .toBe(cursor.occurrenceTargetExecutionOperationCount);
        expect(cursor.occurrenceTargetExecutionOperationKindCounts["attribute-disposition"] ?? 0)
          .toBe(cursor.occurrenceAttributeDispositionCounts.removed ?? 0);
        expect(cursor.occurrenceTargetExecutionOperationKindCounts["hydration-target-creation"] ?? 0)
          .toBe(
            cursor.occurrenceRowCount
            - cursor.completedTextHoleCount
            - (cursor.occurrenceTargetExecutionOperationKindCounts["containerless-replacement"] ?? 0)
          );
        expect(cursor.occurrenceTargetExecutionOperationKindCounts["text-interpolation-expansion"] ?? 0)
          .toBe(cursor.occurrenceTextExpansionCount);
        expect(cursor.occurrenceTargetExecutionInvocationPhase).toBe("target-closed");
        expect(cursor.occurrenceTargetExecutionSealed).toBe(true);
        expect(cursor.occurrenceTargetExecutionDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
        expect(cursor.occurrenceTargetExecutionGlobalOperationCountDelta)
          .toBe(cursor.occurrenceTargetExecutionOperationCount);
        expect(cursor.occurrenceTargetExecutionLaneOperationCountDelta)
          .toBe(cursor.occurrenceTargetExecutionOperationCount);
        expect(cursor.occurrenceTargetExecutionForestMutationRevisionDelta).toBe(
          (cursor.occurrenceAttributeDispositionCounts.removed ?? 0)
          + 2 * cursor.occurrenceRowCount
          + 5 * (cursor.occurrenceTargetExecutionOperationKindCounts["containerless-replacement"] ?? 0)
          + cursor.occurrenceTextExpansionCount
          + 2 * cursor.occurrenceTextExpansionOutputCount
        );
      } else {
        if (cursor.occurrenceRowAssemblyState === "exact") {
          expect(["pending", "ineligible"]).toContain(cursor.occurrenceTargetPlanState);
          expect(cursor.occurrenceTargetPlanReasonKinds.length).toBeGreaterThan(0);
        } else {
          expect(cursor.occurrenceTargetPlanState).toBe("not-applicable");
        }
        expect(cursor.occurrenceTargetPlanDigest).toBeNull();
        expect(cursor.occurrenceTargetPublicationPrerequisiteCounts).toEqual({});
        expect(cursor.occurrenceTargetAttachmentPresent).toBe(false);
        expect(cursor.occurrenceTargetAttachmentContextCount).toBe(0);
        expect(cursor.occurrenceTargetAttachmentStructuralPlanCount).toBe(0);
        expect(cursor.occurrenceTargetAttachmentInvocationPhase).toBeNull();
        expect(cursor.occurrenceTargetAttachmentConsumedPrePlanAuthority).toBeNull();
        expect(cursor.occurrenceTargetAttachmentCurrentBeforeExecution).toBeNull();
        expect(cursor.occurrenceTargetAttachmentCurrentAfterExecution).toBeNull();
        expect(cursor.occurrenceTargetExecutionPresent).toBe(false);
        expect(cursor.occurrenceTargetExecutionOperationCount).toBe(0);
        expect(cursor.occurrenceTargetExecutionOperationKindCounts).toEqual({});
        expect(cursor.occurrenceTargetExecutionAttributeDispositionCount).toBe(0);
        expect(cursor.occurrenceTargetExecutionTextExpansionCount).toBe(0);
        expect(cursor.occurrenceTargetExecutionGeometryCount).toBe(0);
        expect(cursor.occurrenceTargetExecutionInvocationPhase).toBeNull();
        expect(cursor.occurrenceTargetExecutionSealed).toBe(false);
        expect(cursor.occurrenceTargetExecutionDigest).toBeNull();
        expect(cursor.occurrenceTargetExecutionForestMutationRevisionDelta).toBe(0);
        expect(cursor.occurrenceTargetExecutionGlobalOperationCountDelta).toBe(0);
        expect(cursor.occurrenceTargetExecutionLaneOperationCountDelta).toBe(0);
      }
      expect(cursor.occurrenceTargetAttachmentForestMutationRevisionDelta).toBe(0);
      expect(cursor.occurrenceTargetAttachmentGlobalOperationCountDelta).toBe(0);
      expect(cursor.occurrenceTargetAttachmentLaneOperationCountDelta).toBe(0);
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
      frontierKind: null,
      ledgerState: "open",
      spendDispositionCounts: { "browser-relowering-required": 1 },
      remainderKindCounts: { "html-tree-builder-dropped": 1 },
      rawUnspentCount: 1,
      blockedByFrontierCount: 0,
      completionState: "complete",
      completionReceiptPresent: true,
      completionRefusalKinds: [],
      occurrenceRowCount: 1,
      occurrenceRowInstructionTargets: [["title"]],
      occurrenceTargetPlanRowCount: 1,
    });
    expect(observations.get("interaction.browser.foster-target-order")?.siteCursor).toMatchObject({
      frontierKind: null,
      occurrenceOnlyDispositionCounts: {
        "static-text-pass-through": 2,
        "browser-implied-element-pass-through": 1,
      },
      occurrenceRowInstructionTargets: [["title"], ["class"], ["textContent"]],
      occurrenceTargetPlanRowCount: 3,
    });
    expect(observations.get("interaction.browser.carrier-comment-shield")?.siteCursor).toMatchObject({
      occurrenceRowCount: 1,
      occurrenceRowInstructionTargets: [["title"]],
    });
    expect(observations.get("markup.static.platform-attribute")?.siteCursor).toMatchObject({
      occurrenceRowCount: 0,
      occurrenceInstructionKindCounts: {},
      occurrenceTargetPlanState: "exact",
      occurrenceTargetPlanRowCount: 0,
    });
    expect(observations.get("interaction.generated.double-sibling-if")?.siteCursor).toMatchObject({
      frontierKind: "after-attributes-before-template-controller",
      frontierPhase: "content-start",
    });
    expect(observations.get("interaction.browser.paragraph-controller-topology")?.siteCursor).toMatchObject({
      frontierKind: "after-attributes-before-template-controller",
      spendCount: 1,
      occurrenceOnlyDispositionCounts: { "live-element-assembled": 1 },
      blockedByFrontierCount: 2,
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
    expect(tenHoleCursor.completionState).toBe("complete");
    expect(tenHoleCursor.completedTextSiteCount).toBe(1);
    expect(tenHoleCursor.completedTextHoleCount).toBe(10);
    expect(tenHoleCursor.completedRowSiteCount).toBe(10);
    expect(tenHoleCursor.instructionAllocationCount).toBe(10);
    expect(tenHoleCursor.sourceAllocationCount).toBe(10);
    expect(tenHoleCursor.occurrenceRowCount).toBe(10);
    expect(tenHoleCursor.occurrenceTargetPlanRowCount).toBe(10);
    expect(tenHoleCursor.occurrenceInstructionKindCounts).toEqual({ "text-binding": 10 });
    const nativeTargetOrders = new Map<string, readonly string[]>([
      ["native-order.checkbox.checked-before-matcher", ["matcher", "checked"]],
      ["native-order.checkbox.checked-before-model", ["model", "checked"]],
      ["native-order.checkbox.checked-before-model-matcher", ["matcher", "model", "checked"]],
      ["native-order.checkbox.model-before-checked", ["model", "checked"]],
      ["native-order.radio.checked-before-value", ["value", "checked"]],
      ["native-order.radio.value-before-checked", ["value", "checked"]],
      ["native-order.select.matcher-value-multiple", ["matcher", "multiple", "value"]],
      ["native-order.select.multiple-matcher-value", ["multiple", "matcher", "value"]],
      ["native-order.select.static-multiple-value-matcher", ["value", "matcher"]],
      ["native-order.select.value-matcher-multiple", ["multiple", "matcher", "value"]],
    ]);
    for (const [caseId, targets] of nativeTargetOrders) {
      expect(observations.get(caseId)?.siteCursor).toMatchObject({
        occurrenceRowCount: 1,
        occurrenceRowInstructionTargets: [targets],
      });
    }
    expect(requiredTranscriptCursor(observations, "native-order.checkbox.checked-before-model")
      .occurrenceRowInstructionSignatures[0]?.map((signature) => [signature[1], signature[3]]))
      .toEqual([["model", "to-view"], ["checked", "two-way"]]);
    expect(requiredTranscriptCursor(observations, "native-order.select.static-multiple-value-matcher")
      .occurrenceRowInstructionSignatures[0]?.map((signature) => [signature[1], signature[3]]))
      .toEqual([["value", "two-way"], ["matcher", "to-view"]]);
    expect(observations.get("interaction.browser.foster-target-order")?.siteCursor)
      .toMatchObject({ occurrenceSourcePostureCounts: { "browser-effective": 1 } });
    expect(observations.get("diagnostic.slot.without-shadow")).toMatchObject({
      compiledTemplate: { state: "invalid" },
      issues: [{ issueKind: "slot-without-shadow-dom", frameworkErrorCode: "AUR0717" }],
      siteCursor: {
        admissionState: "cursor-transcript",
        frontierKind: "native-slot-without-shadow-dom-invalid",
        ledgerState: "open",
        conflictCount: 0,
        rootStateKind: "invalid",
        hasSlots: false,
        nativeSlotCount: 1,
        completionState: "ineligible",
        completionReceiptPresent: false,
        completionRefusalKinds: [
          "cursor-frontier",
          "root-state-invalid",
          "root-phase-incomplete",
        ],
      },
    });
    expect(cursorDigest(observations, "attribute-owner-state.interpolation-first"))
      .not.toBe(cursorDigest(observations, "attribute-owner-state.binding-first"));
    expect(cursorDigest(observations, "native-order.checkbox.checked-before-model"))
      .not.toBe(cursorDigest(observations, "native-order.checkbox.model-before-checked"));

    const exactCaseIds = new Set(run.observations.flatMap((observation) =>
      observation.frozenFamily.kind === "exact" ? [observation.caseId] : []
    ));
    const exactJitCases = JIT_ORACLE_CASES.filter((candidate) => exactCaseIds.has(candidate.id));
    const jitOracle = createJitCompilerOracle();
    let jitBatch: JitCompilerBlueprintBatch;
    let comparison;
    try {
      jitBatch = await new JitCompilerBlueprintObserver(new JitCompilerCaseExecutor())
        .observeCases(exactJitCases, jitOracle);
      comparison = compareSemanticFrozenFamiliesToJit(run.observations, jitBatch);
    } finally {
      jitOracle.dispose();
    }
    expect(exactJitCases).toHaveLength(30);
    expect(comparison.isClean).toBe(true);
    expect(comparison.comparisonPosture).toBe("structural-characterization-only");
    expect(comparison.selectedExactCaseCount).toBe(30);
    expect(comparison.joinedCaseCount).toBe(30);
    expect(comparison.matchingCaseIds).toHaveLength(30);
    expect(comparison.mismatches).toEqual([]);
    expect(comparison.satisfiedClaimIds).toEqual([]);
    expect(comparison.comparedFields).toBe(SEMANTIC_FROZEN_FAMILY_COMMON_JIT_FIELDS);
    expect(comparison.omittedJitFields).toBe(SEMANTIC_FROZEN_FAMILY_OMITTED_JIT_FIELDS);
    expect(comparison.counts).toEqual({
      semanticDefinitions: 44,
      jitDefinitions: 44,
      semanticRows: 53,
      jitRows: 53,
      semanticGeometries: 53,
      jitGeometries: 53,
      semanticInstructions: 70,
      jitInstructions: 70,
      semanticHasSlotsTrue: 1,
      jitHasSlotsTrue: 1,
    });
    const runtimeComparison = compareSemanticRuntimeInstructionsToJit(run.observations, jitBatch);
    expect(runtimeComparison.isClean).toBe(true);
    expect(runtimeComparison.comparisonPosture).toBe("runtime-instruction-characterization-only");
    expect(runtimeComparison.comparedFields).toBe(SEMANTIC_RUNTIME_INSTRUCTION_COMMON_JIT_FIELDS);
    expect(runtimeComparison.selectedExactCaseCount).toBe(30);
    expect(runtimeComparison.joinedCaseCount).toBe(30);
    expect(runtimeComparison.matchingCaseIds).toHaveLength(30);
    expect(runtimeComparison.semanticInstructionCount).toBe(80);
    expect(runtimeComparison.jitInstructionCount).toBe(80);
    expect(runtimeComparison.semanticRowInstructionCount).toBe(70);
    expect(runtimeComparison.jitRowInstructionCount).toBe(70);
    expect(runtimeComparison.mismatches).toEqual([]);
    expect(runtimeComparison.satisfiedClaimIds).toEqual([]);
    const definitionComparison = compareSemanticCompiledDefinitionsToJit(run.observations, jitBatch);
    expect(definitionComparison.isClean).toBe(true);
    expect(definitionComparison.comparisonPosture).toBe("compiled-definition-characterization-only");
    expect(definitionComparison.comparedFields).toBe(SEMANTIC_COMPILED_DEFINITION_COMMON_JIT_FIELDS);
    expect(definitionComparison.omittedFields).toBe(SEMANTIC_COMPILED_DEFINITION_OMITTED_FIELDS);
    expect(definitionComparison.selectedExactCaseCount).toBe(30);
    expect(definitionComparison.joinedCaseCount).toBe(30);
    expect(definitionComparison.matchingCaseIds).toHaveLength(30);
    expect(definitionComparison.semanticDefinitionCount).toBe(44);
    expect(definitionComparison.jitDefinitionCount).toBe(44);
    expect(definitionComparison.mismatches).toEqual([]);
    expect(definitionComparison.satisfiedClaimIds).toEqual([]);
    const nativeSlotDefinitionSource = observations.get("slot.native.nested-has-slots")?.compiledDefinitions;
    if (nativeSlotDefinitionSource?.kind !== "exact") {
      throw new Error("Expected exact native-slot definition ownership mutation source.");
    }
    const movedNativeSlotDefinitions = nativeSlotDefinitionSource.definitions.map((definition, index) => {
      if (definition == null || Array.isArray(definition) || typeof definition !== "object") {
        throw new Error("Expected native-slot compiled-definition record.");
      }
      return {
        ...(definition as Readonly<Record<string, CompilerCaseData>>),
        hasSlots: index !== 0,
      };
    });
    const movedNativeSlot = compareSemanticCompiledDefinitionsToJit([{
      caseId: "slot.native.nested-has-slots",
      compiledDefinitions: {
        ...nativeSlotDefinitionSource,
        definitions: movedNativeSlotDefinitions,
        definitionDigest: semanticCompiledDefinitionDigest(movedNativeSlotDefinitions),
      },
    }], jitBatch);
    expect(movedNativeSlot.isClean).toBe(false);
    expect(movedNativeSlot.mismatches).toMatchObject([{
      caseId: "slot.native.nested-has-slots",
      mismatchKind: SemanticCompiledDefinitionMismatchKind.DefinitionFields,
    }]);
    const definitionMutationSource = observations.get("binding.property.input-value")?.compiledDefinitions;
    if (definitionMutationSource?.kind !== "exact") {
      throw new Error("Expected exact compiled-definition mutation source.");
    }
    const definitionMutationRecord = definitionMutationSource.definitions[0];
    if (
      definitionMutationRecord == null
      || Array.isArray(definitionMutationRecord)
      || typeof definitionMutationRecord !== "object"
    ) {
      throw new Error("Expected one compiled-definition mutation record.");
    }
    const definitionMutationObject = definitionMutationRecord as Readonly<Record<string, CompilerCaseData>>;
    const definitionMutationDefinitions = [{ ...definitionMutationObject, containerless: true }];
    const definitionMutation = compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: {
        ...definitionMutationSource,
        definitions: definitionMutationDefinitions,
        definitionDigest: semanticCompiledDefinitionDigest(definitionMutationDefinitions),
      },
    }], jitBatch);
    expect(definitionMutation.isClean).toBe(false);
    expect(definitionMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticCompiledDefinitionMismatchKind.DefinitionFields,
    }]);
    const definitionDigestMutation = compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: {
        ...definitionMutationSource,
        definitionDigest: `sha256:${"0".repeat(64)}`,
      },
    }], jitBatch);
    expect(definitionDigestMutation.isClean).toBe(false);
    expect(definitionDigestMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticCompiledDefinitionMismatchKind.DefinitionDigestMetadata,
    }]);
    const definitionCountMutation = compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: {
        ...definitionMutationSource,
        definitionCount: definitionMutationSource.definitionCount + 1,
      },
    }], jitBatch);
    expect(definitionCountMutation.isClean).toBe(false);
    expect(definitionCountMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticCompiledDefinitionMismatchKind.DefinitionCount,
    }]);
    const definitionIndexDefinitions = [{ ...definitionMutationObject, definitionIndex: 1 }];
    const definitionIndexMutation = compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: {
        ...definitionMutationSource,
        definitions: definitionIndexDefinitions,
        definitionDigest: semanticCompiledDefinitionDigest(definitionIndexDefinitions),
      },
    }], jitBatch);
    expect(definitionIndexMutation.isClean).toBe(false);
    expect(definitionIndexMutation.mismatches.some((mismatch) =>
      mismatch.mismatchKind === SemanticCompiledDefinitionMismatchKind.DefinitionIndex
    )).toBe(true);
    expect(() => compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: definitionMutationSource,
    }, {
      caseId: "binding.property.input-value",
      compiledDefinitions: definitionMutationSource,
    }], jitBatch)).toThrow(/unique semantic case ids/u);
    const executableFields = definitionMutationObject.executableFields;
    if (executableFields == null || Array.isArray(executableFields) || typeof executableFields !== "object") {
      throw new Error("Expected compiled-definition executable-field record.");
    }
    const executableOmissionDefinitions = [{
      ...definitionMutationObject,
      executableFields: { ...executableFields, hasType: false },
    }];
    const executableOmission = compareSemanticCompiledDefinitionsToJit([{
      caseId: "binding.property.input-value",
      compiledDefinitions: {
        ...definitionMutationSource,
        definitions: executableOmissionDefinitions,
        definitionDigest: semanticCompiledDefinitionDigest(executableOmissionDefinitions),
      },
    }], jitBatch);
    expect(executableOmission.isClean).toBe(true);
    const generatedExecutableSource = observations.get("interaction.generated.double-sibling-if")?.compiledDefinitions;
    if (generatedExecutableSource?.kind !== "exact") {
      throw new Error("Expected exact generated-definition executable mutation source.");
    }
    const generatedExecutableDefinition = generatedExecutableSource.definitions[1];
    if (
      generatedExecutableDefinition == null
      || Array.isArray(generatedExecutableDefinition)
      || typeof generatedExecutableDefinition !== "object"
    ) {
      throw new Error("Expected one generated compiled-definition record.");
    }
    const generatedExecutableObject = generatedExecutableDefinition as Readonly<Record<string, CompilerCaseData>>;
    const generatedExecutableFields = generatedExecutableObject.executableFields;
    if (
      generatedExecutableFields == null
      || Array.isArray(generatedExecutableFields)
      || typeof generatedExecutableFields !== "object"
    ) {
      throw new Error("Expected generated compiled-definition executable-field record.");
    }
    const generatedExecutableDefinitions = generatedExecutableSource.definitions.map((definition, index) =>
      index === 1
        ? { ...generatedExecutableObject, executableFields: { ...generatedExecutableFields, hasType: true } }
        : definition
    );
    const generatedExecutableMutation = compareSemanticCompiledDefinitionsToJit([{
      caseId: "interaction.generated.double-sibling-if",
      compiledDefinitions: {
        ...generatedExecutableSource,
        definitions: generatedExecutableDefinitions,
        definitionDigest: semanticCompiledDefinitionDigest(generatedExecutableDefinitions),
      },
    }], jitBatch);
    expect(generatedExecutableMutation.isClean).toBe(false);
    expect(generatedExecutableMutation.mismatches).toMatchObject([{
      caseId: "interaction.generated.double-sibling-if",
      mismatchKind: SemanticCompiledDefinitionMismatchKind.DefinitionFields,
    }]);
    const runtimeMutationSource = observations.get("binding.property.input-value")?.runtimeInstructions;
    if (runtimeMutationSource?.kind !== "exact") throw new Error("Expected exact runtime-instruction mutation source.");
    const runtimeMutationDefinition = runtimeMutationSource.definitions[0];
    const runtimeMutationRow = runtimeMutationDefinition?.rows[0];
    const runtimeMutationInstruction = runtimeMutationRow?.[0];
    if (
      runtimeMutationDefinition == null
      || runtimeMutationRow == null
      || runtimeMutationInstruction == null
      || Array.isArray(runtimeMutationInstruction)
      || typeof runtimeMutationInstruction !== "object"
    ) {
      throw new Error("Expected one runtime property-binding mutation source.");
    }
    const runtimeMutationDefinitions = [{
      ...runtimeMutationDefinition,
      rows: [[{ ...runtimeMutationInstruction, mode: 999 }]],
    }];
    const runtimeMutation = compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: {
        ...runtimeMutationSource,
        definitions: runtimeMutationDefinitions,
        wireDigest: semanticRuntimeInstructionFamilyWireDigest(runtimeMutationDefinitions),
      },
    }], jitBatch);
    expect(runtimeMutation.isClean).toBe(false);
    expect(runtimeMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticRuntimeInstructionMismatchKind.InstructionRows,
    }]);
    const runtimeCountMutation = compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: {
        ...runtimeMutationSource,
        instructionCount: runtimeMutationSource.instructionCount + 1,
      },
    }], jitBatch);
    expect(runtimeCountMutation.isClean).toBe(false);
    expect(runtimeCountMutation.semanticInstructionCount).toBe(1);
    expect(runtimeCountMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticRuntimeInstructionMismatchKind.InstructionCountMetadata,
    }]);
    const runtimeRowCountMutation = compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: {
        ...runtimeMutationSource,
        rowInstructionCount: runtimeMutationSource.rowInstructionCount + 1,
      },
    }], jitBatch);
    expect(runtimeRowCountMutation.isClean).toBe(false);
    expect(runtimeRowCountMutation.semanticRowInstructionCount).toBe(1);
    expect(runtimeRowCountMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticRuntimeInstructionMismatchKind.RowInstructionCountMetadata,
    }]);
    const runtimeDigestMutation = compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: {
        ...runtimeMutationSource,
        wireDigest: `sha256:${"0".repeat(64)}`,
      },
    }], jitBatch);
    expect(runtimeDigestMutation.isClean).toBe(false);
    expect(runtimeDigestMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticRuntimeInstructionMismatchKind.WireDigestMetadata,
    }]);
    const runtimeIndexDefinitions = [{ ...runtimeMutationDefinition, definitionIndex: 1 }];
    const runtimeIndexMutation = compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: {
        ...runtimeMutationSource,
        definitions: runtimeIndexDefinitions,
        wireDigest: semanticRuntimeInstructionFamilyWireDigest(runtimeIndexDefinitions),
      },
    }], jitBatch);
    expect(runtimeIndexMutation.isClean).toBe(false);
    expect(runtimeIndexMutation.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      mismatchKind: SemanticRuntimeInstructionMismatchKind.DefinitionIndex,
    }]);
    expect(() => compareSemanticRuntimeInstructionsToJit([{
      caseId: "binding.property.input-value",
      runtimeInstructions: runtimeMutationSource,
    }, {
      caseId: "binding.property.input-value",
      runtimeInstructions: runtimeMutationSource,
    }], jitBatch)).toThrow(/unique semantic case ids/u);
    const mutationSource = observations.get("binding.property.input-value")?.frozenFamily;
    if (mutationSource?.kind !== "exact") throw new Error("Expected exact property-binding mutation source.");
    const mutationDefinition = mutationSource.definitions[0];
    const mutationRow = mutationDefinition?.rows[0];
    if (mutationDefinition == null || mutationRow == null) throw new Error("Expected one mutation-source row.");
    const mutationComparison = compareSemanticFrozenFamiliesToJit([{
      caseId: "binding.property.input-value",
      frozenFamily: {
        ...mutationSource,
        definitions: [{
          ...mutationDefinition,
          rows: [{ ...mutationRow, frameworkInstructionKinds: ["deliberate-mismatch"] }],
        }],
      },
    }], jitBatch);
    expect(mutationComparison.isClean).toBe(false);
    expect(mutationComparison.mismatches).toMatchObject([{
      caseId: "binding.property.input-value",
      definitionIndex: 0,
      mismatchKind: SemanticFrozenFamilyStructuralMismatchKind.RowInstructionKinds,
    }]);
    const targetKindComparison = compareSemanticFrozenFamiliesToJit([{
      caseId: "binding.property.input-value",
      frozenFamily: {
        ...mutationSource,
        definitions: [{
          ...mutationDefinition,
          rows: [{ ...mutationRow, targetKind: "render-location" }],
        }],
      },
    }], jitBatch);
    expect(targetKindComparison.mismatches.some((mismatch) =>
      mismatch.mismatchKind === SemanticFrozenFamilyStructuralMismatchKind.TargetGeometry
    )).toBe(true);
    const ownershipComparison = compareSemanticFrozenFamiliesToJit([{
      caseId: "binding.property.input-value",
      frozenFamily: {
        ...mutationSource,
        definitions: [{ ...mutationDefinition, definitionIndex: 1 }],
      },
    }], jitBatch);
    expect(ownershipComparison.mismatches.some((mismatch) =>
      mismatch.mismatchKind === SemanticFrozenFamilyStructuralMismatchKind.DefinitionOwnership
    )).toBe(true);
    const missingComparison = compareSemanticFrozenFamiliesToJit([{
      caseId: "binding.property.input-value",
      frozenFamily: mutationSource,
    }], new JitCompilerBlueprintBatch([]));
    expect(missingComparison.isClean).toBe(false);
    expect(missingComparison.counts).toEqual({
      semanticDefinitions: 1,
      jitDefinitions: 0,
      semanticRows: 1,
      jitRows: 0,
      semanticGeometries: 1,
      jitGeometries: 0,
      semanticInstructions: 1,
      jitInstructions: 0,
      semanticHasSlotsTrue: 0,
      jitHasSlotsTrue: 0,
    });
    const vacuousComparison = compareSemanticFrozenFamiliesToJit([], new JitCompilerBlueprintBatch([]));
    expect(vacuousComparison.isVacuous).toBe(true);
    expect(vacuousComparison.isClean).toBe(false);
    const duplicateJit = jitBatch.observations.find((observation) =>
      observation.data.caseId === "binding.property.input-value"
    );
    if (duplicateJit == null) throw new Error("Expected duplicate-JIT guard source.");
    expect(() => compareSemanticFrozenFamiliesToJit([{
      caseId: "binding.property.input-value",
      frozenFamily: mutationSource,
    }], new JitCompilerBlueprintBatch([duplicateJit, duplicateJit]))).toThrow(/unique JIT case ids/u);

    for (const observation of run.observations) {
      const portable = observation.siteCursor;
      expect(Object.getPrototypeOf(portable)).toBe(Object.prototype);
      const roundTripped: unknown = JSON.parse(JSON.stringify(portable));
      expect(roundTripped).toEqual(portable);
      const serialized = JSON.stringify(portable);
      for (const forbidden of ["binding", "execution", "forest", "compilerReads", "preWalkAuthority", "browserEmission"]) {
        expect(serialized).not.toContain(`"${forbidden}"`);
      }
      const frozen = observation.frozenFamily;
      expect(Object.getPrototypeOf(frozen)).toBe(Object.prototype);
      expect(JSON.parse(JSON.stringify(frozen))).toEqual(frozen);
      const frozenSerialized = JSON.stringify(frozen);
      for (const forbidden of [
        "kernel:store",
        '"preparation"',
        '"committedAllocation"',
        '"targetPlan"',
        '"occurrenceKey"',
      ]) {
        expect(frozenSerialized).not.toContain(forbidden);
      }
      const runtimeInstructions = observation.runtimeInstructions;
      if (runtimeInstructions != null) {
        expect(Object.getPrototypeOf(runtimeInstructions)).toBe(Object.prototype);
        expect(JSON.parse(JSON.stringify(runtimeInstructions))).toEqual(runtimeInstructions);
        const runtimeSerialized = JSON.stringify(runtimeInstructions);
        for (const forbidden of ["kernel:store", "productHandle", "sourceAddress", "compilerRead", "allocation"]) {
          expect(runtimeSerialized).not.toContain(forbidden);
        }
      }
      const compiledDefinitions = observation.compiledDefinitions;
      if (compiledDefinitions != null) {
        expect(Object.getPrototypeOf(compiledDefinitions)).toBe(Object.prototype);
        expect(JSON.parse(JSON.stringify(compiledDefinitions))).toEqual(compiledDefinitions);
        const definitionSerialized = JSON.stringify(compiledDefinitions);
        for (const forbidden of [
          "kernel:store",
          "productHandle",
          "identityHandle",
          "sourceAddress",
          "baseDefinition",
          "compilerRead",
        ]) {
          expect(definitionSerialized).not.toContain(forbidden);
        }
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

function requiredTranscriptCursor(
  observations: ReadonlyMap<string, SemanticCompilerGalleryObservation>,
  caseId: string,
): Extract<
  SemanticCompilerGalleryObservation['siteCursor'],
  { readonly admissionState: TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript }
> {
  const cursor = observations.get(caseId)?.siteCursor;
  if (cursor?.admissionState !== TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript) {
    throw new Error(`Expected cursor transcript for '${caseId}'.`);
  }
  return cursor;
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
