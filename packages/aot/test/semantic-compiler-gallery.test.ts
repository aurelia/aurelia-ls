import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import { SemanticCompilerGalleryOracle } from "../src/testing/semantic-compiler-gallery-oracle.js";
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

    expect(plan.selectedCaseCount).toBe(46);
    expect(plan.admitted).toHaveLength(31);
    expect(plan.unsupported).toHaveLength(15);
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

    expect(run.selectedCaseCount).toBe(46);
    expect(run.admittedCaseCount).toBe(31);
    expect(run.unsupported).toHaveLength(15);
    expect(run.observations).toHaveLength(31);
    expect(run.missingCaseIds).toEqual([]);
    expect(run.publicCompilationRowCount).toBe(32);
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

    const observations = new Map(run.observations.map((observation) => [observation.caseId, observation]));
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
    expect(observations.get("interaction.browser.foster-target-order")?.declaredEffects).toContainEqual(
      expect.objectContaining({ kind: "browser-recovery", conservation: "open" }),
    );
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
