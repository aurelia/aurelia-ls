import { createHash } from "node:crypto";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
  SemanticRuntimeProjectInputAuthority,
  SourceFileRole,
  SourceLanguage,
  type SemanticApp,
  type SemanticRuntimeAnalysisBasis,
  type SemanticRuntimeAnswer,
  type SemanticTemplateCompilationResult,
} from "@aurelia-ls/semantic-runtime";
import type {
  CompilerEffectPosture,
  CompilerOracleExpectedProduct,
} from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import {
  SemanticCompilerGalleryWorldDifference,
  type SemanticCompilerGalleryCase,
  type SemanticCompilerGalleryPlan,
} from "./semantic-compiler-gallery-plan.js";

type SemanticTemplateResource = SemanticApp["emission"]["templates"]["resources"][number];

export interface SemanticCompilerGalleryRootRow {
  readonly targetKind: string;
  readonly sequenceResolved: boolean;
  readonly instructionKinds: readonly string[];
}

export interface SemanticCompilerGalleryIssueRow {
  readonly phase: string;
  readonly issueKind: string;
  readonly frameworkErrorCode: string | null;
  readonly severity: string;
  readonly message: string;
}

export interface SemanticCompilerGalleryOpenSeamRow {
  readonly seamKindKey: string;
  readonly reasonKinds: readonly string[];
  readonly summary: string;
}

export class SemanticCompilerGalleryObservation {
  constructor(
    readonly caseId: string,
    readonly family: string,
    readonly definitionName: string,
    readonly observationDigest: string,
    readonly expectedJitProduct: CompilerOracleExpectedProduct,
    readonly worldFingerprint: string,
    readonly anticipatedWorldDifferences: readonly SemanticCompilerGalleryWorldDifference[],
    readonly worldDifferences: readonly SemanticCompilerGalleryWorldDifference[],
    readonly declaredEffects: readonly CompilerEffectPosture[],
    readonly compilerProfile: {
      readonly debug: boolean;
      readonly resolveResources: boolean;
    },
    readonly compiledTemplate: {
      readonly state: string;
      readonly needsCompile: false | null;
      readonly hasSlots: boolean;
      readonly rootRows: readonly SemanticCompilerGalleryRootRow[];
      readonly surrogateInstructionKinds: readonly string[];
      readonly allInstructionKinds: readonly string[];
      readonly nestedSequenceCount: number;
    },
    readonly authored: {
      readonly htmlNodes: number;
      readonly htmlAttributes: number;
      readonly recoveries: number;
    },
    readonly issues: readonly SemanticCompilerGalleryIssueRow[],
    readonly openSeams: readonly SemanticCompilerGalleryOpenSeamRow[],
  ) {}
}

export type SemanticCompilerGalleryObservationAuthority =
  | {
      readonly kind: "synchronous-app-emission-bracket";
      /** No portable basis exists for the direct rich-emission projection yet. */
      readonly portableAnalysisBasis: null;
      readonly currentAtEgress: true;
      readonly executableReceiptLifetime: "retired-before-return";
    }
  | {
      readonly kind: "not-created";
      readonly portableAnalysisBasis: null;
      readonly currentAtEgress: null;
      readonly executableReceiptLifetime: "not-created";
    };

export class SemanticCompilerGalleryRun {
  constructor(
    readonly adapterVersion: SemanticCompilerGalleryPlan["adapterVersion"],
    readonly compilerTreeProfile: SemanticCompilerGalleryPlan["compilerTreeProfile"],
    readonly sourceDigest: string,
    readonly selectedCaseCount: number,
    readonly admittedCaseCount: number,
    readonly unsupported: SemanticCompilerGalleryPlan["unsupported"],
    readonly observations: readonly SemanticCompilerGalleryObservation[],
    readonly missingCaseIds: readonly string[],
    readonly publicCompilationRowCount: number,
    /** Portable authority for the public summary query only, not for the direct rich-emission observations. */
    readonly summaryAnalysisBasis: SemanticRuntimeAnalysisBasis | null,
    readonly summaryAnalysisDepth: string | null,
    readonly inquiryProfile: string | null,
    readonly observationAuthority: SemanticCompilerGalleryObservationAuthority,
    readonly stages: Readonly<Record<string, number>>,
  ) {}
}

export interface SemanticCompilerGalleryOracleOptions {
  /** Existing directory that anchors module resolution for the generated source gallery. */
  readonly workspaceRoot: string;
  /** Workspace-relative virtual TypeScript source path. */
  readonly sourceFilePath?: string;
}

/** Executes every admitted case in one semantic-runtime app generation and returns observations, never equivalence. */
export class SemanticCompilerGalleryOracle {
  readonly #workspaceRoot: string;
  readonly #sourceFilePath: string;

  constructor(options: SemanticCompilerGalleryOracleOptions) {
    this.#workspaceRoot = path.resolve(options.workspaceRoot);
    this.#sourceFilePath = path.resolve(this.#workspaceRoot, options.sourceFilePath ?? "src/gallery.ts");
    if (!isPathInside(this.#workspaceRoot, this.#sourceFilePath)) {
      throw new Error("Semantic compiler gallery source path must stay inside its workspace root.");
    }
  }

  async execute(plan: SemanticCompilerGalleryPlan): Promise<SemanticCompilerGalleryRun> {
    if (plan.admitted.length === 0) {
      return new SemanticCompilerGalleryRun(
        plan.adapterVersion,
        plan.compilerTreeProfile,
        plan.sourceDigest,
        plan.selectedCaseCount,
        0,
        plan.unsupported,
        [],
        [],
        0,
        null,
        null,
        null,
        {
          kind: "not-created",
          portableAnalysisBasis: null,
          currentAtEgress: null,
          executableReceiptLifetime: "not-created",
        },
        {},
      );
    }

    const overlay = {
      readFile: (fileName: string): string | undefined =>
        samePath(fileName, this.#sourceFilePath) ? plan.sourceText : undefined,
      fileExists: (fileName: string): boolean | undefined =>
        samePath(fileName, this.#sourceFilePath) ? true : undefined,
    };
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const startedAt = performance.now();
    const runtime = await createSemanticRuntime({
      workspaceRoot: this.#workspaceRoot,
      projects: [{
        projectKey: "aot-semantic-compiler-gallery",
        rootDir: this.#workspaceRoot,
        sourceFiles: [{
          path: this.#sourceFilePath,
          language: SourceLanguage.TypeScript,
          role: SourceFileRole.AppSource,
          note: `Generated from ${plan.adapterVersion}.`,
        }],
      }],
      storeKey: `aot-semantic-gallery:${plan.sourceDigest.slice("sha256:".length, "sha256:".length + 24)}`,
      projectInputAuthority: authority,
    });
    const openedAt = performance.now();
    try {
      const app = await runtime.openApp({
        analysisDepth: "runtime-topology",
        telemetry: { inquiryProfile: "aot" },
      });
      const analyzedAt = performance.now();
      const publicAnswer = app.ask({
        kind: SemanticAppQueryKind.TemplateCompilations,
        detail: SemanticRuntimeDetail.Handles,
        inquiryProfile: "aot",
      }) as SemanticRuntimeAnswer<SemanticTemplateCompilationResult>;
      const publicCompilationRowCount = publicAnswer.value.rows.length;
      const summaryAnalysisBasis = publicAnswer.analysisBasis;
      const summaryAnalysisDepth = publicAnswer.analysisDepth;
      const inquiryProfile = app.emission.profile.inquiryProfile;
      if (summaryAnalysisBasis == null || summaryAnalysisDepth == null) {
        throw new Error("Semantic compiler gallery query returned without an app-world analysis basis and depth.");
      }
      validateGalleryMembership(app, publicAnswer.value, plan.admitted);
      const observations = observationsFor(app, plan.admitted);
      const observedIds = new Set(observations.map((observation) => observation.caseId));
      const missingCaseIds = plan.admitted
        .filter((candidate) => !observedIds.has(candidate.candidate.id))
        .map((candidate) => candidate.candidate.id);
      const projectedAt = performance.now();
      if (!app.isCurrent()) {
        throw new Error("Semantic compiler gallery app generation changed before observation egress.");
      }
      return new SemanticCompilerGalleryRun(
        plan.adapterVersion,
        plan.compilerTreeProfile,
        plan.sourceDigest,
        plan.selectedCaseCount,
        plan.admitted.length,
        plan.unsupported,
        observations,
        missingCaseIds,
        publicCompilationRowCount,
        summaryAnalysisBasis,
        summaryAnalysisDepth,
        inquiryProfile,
        {
          kind: "synchronous-app-emission-bracket",
          portableAnalysisBasis: null,
          currentAtEgress: true,
          executableReceiptLifetime: "retired-before-return",
        },
        {
          "semantic.boot": openedAt - startedAt,
          "semantic.analysis": analyzedAt - openedAt,
          "semantic.projection": projectedAt - analyzedAt,
        },
      );
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }
}

function observationsFor(
  app: SemanticApp,
  cases: readonly SemanticCompilerGalleryCase[],
): readonly SemanticCompilerGalleryObservation[] {
  const resourcesByName = new Map<string, SemanticTemplateResource>();
  for (const resource of app.emission.templates.resources) {
    const name = resource.compilation.definition.name;
    if (resourcesByName.has(name)) {
      throw new Error(`Semantic compiler gallery emitted duplicate definition ${name}.`);
    }
    resourcesByName.set(name, resource);
  }
  return cases.flatMap((candidate) => {
    const definition = candidate.candidate.world.entry;
    if (definition.kind !== "compile") return [];
    const resource = resourcesByName.get(definition.definition.name);
    if (resource == null) return [];
    validateDefinitionFidelity(resource, candidate);
    return [observationFor(resource, candidate)];
  });
}

function observationFor(
  resource: SemanticTemplateResource,
  galleryCase: SemanticCompilerGalleryCase,
): SemanticCompilerGalleryObservation {
  const compilation = resource.compilation;
  const emission = compilation.compiledTemplate;
  const sequences = new Map(emission.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
  const rootRows = emission.compiledTemplate.targets.map((target) => {
    const sequence = sequences.get(target.instructionSequenceProductHandle) ?? null;
    return {
      targetKind: target.targetKind,
      sequenceResolved: sequence != null,
      instructionKinds: sequence?.instructions.map((instruction) => instruction.instructionKind) ?? [],
    };
  });
  const surrogate = emission.compiledTemplate.surrogateSequence;
  const compilerProfile = {
    debug: compilation.compilerWorld.templateCompiler.debug,
    resolveResources: compilation.compilerWorld.templateCompiler.resolveResources,
  };
  const worldDifferences = observedWorldDifferences(galleryCase, compilerProfile);
  const compiledTemplate = {
    state: emission.compiledTemplate.state,
    needsCompile: emission.compiledTemplate.needsCompile,
    hasSlots: emission.compiledTemplate.hasSlots,
    rootRows,
    surrogateInstructionKinds: surrogate?.instructions.map((instruction) => instruction.instructionKind) ?? [],
    allInstructionKinds: emission.instructions.map((instruction) => instruction.instructionKind),
    nestedSequenceCount: emission.instructionSequences.length
      - emission.compiledTemplate.targets.length
      - (surrogate == null ? 0 : 1),
  };
  const authored = {
    htmlNodes: compilation.html.nodes.length,
    htmlAttributes: compilation.html.attributes.length,
    recoveries: compilation.html.recoveries.length,
  };
  const issues = emission.issues.map((issue): SemanticCompilerGalleryIssueRow => ({
    phase: issue.phase,
    issueKind: issue.issueKind,
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.severity,
    message: issue.message,
  }));
  const openSeams = emission.openSeams.map((seam): SemanticCompilerGalleryOpenSeamRow => ({
    seamKindKey: seam.seamKindKey,
    reasonKinds: seam.reasonKinds,
    summary: seam.summary,
  }));
  return new SemanticCompilerGalleryObservation(
    galleryCase.candidate.id,
    galleryCase.candidate.family,
    compilation.definition.name,
    digest(canonicalCompilerJson({ compilerProfile, compiledTemplate, authored, issues, openSeams })),
    expectedJitProduct(galleryCase.candidate),
    galleryCase.worldFingerprint,
    galleryCase.anticipatedWorldDifferences,
    worldDifferences,
    galleryCase.candidate.effects,
    compilerProfile,
    compiledTemplate,
    authored,
    issues,
    openSeams,
  );
}

function validateGalleryMembership(
  app: SemanticApp,
  publicResult: SemanticTemplateCompilationResult,
  cases: readonly SemanticCompilerGalleryCase[],
): void {
  const expectedNames = [
    "aot-semantic-gallery-root",
    ...cases.map((candidate) => compileDefinition(candidate).name),
  ].sort();
  const directNames = app.emission.templates.resources
    .map((resource) => resource.compilation.definition.name)
    .sort();
  if (!sameStringArrays(expectedNames, directNames)) {
    throw new Error(
      `Semantic compiler gallery resource membership differs: expected [${expectedNames.join(", ")}], `
      + `received [${directNames.join(", ")}].`,
    );
  }
  const publicNames = publicResult.rows
    .map((row) => `${row.compilationLane}:${row.definitionName}`)
    .sort();
  const expectedPublicNames = expectedNames.map((name) => `app-runtime:${name}`).sort();
  if (!sameStringArrays(expectedPublicNames, publicNames)) {
    throw new Error(
      `Semantic compiler gallery public membership differs: expected [${expectedPublicNames.join(", ")}], `
      + `received [${publicNames.join(", ")}].`,
    );
  }
}

function validateDefinitionFidelity(
  resource: SemanticTemplateResource,
  galleryCase: SemanticCompilerGalleryCase,
): void {
  const expected = compileDefinition(galleryCase);
  if (expected.template?.kind !== "markup") {
    throw new Error(`Admitted semantic gallery case ${galleryCase.candidate.id} lost its markup input.`);
  }
  const actual = resource.compilation.definition;
  const expectedCaptureKind = expected.capture === true ? "all" : "none";
  const expectedShape = {
    name: expected.name,
    definitionTemplateKind: "markup",
    definitionMarkup: expected.template.value,
    unitMarkup: expected.template.value,
    needsCompile: expected.needsCompile ?? true,
    containerless: expected.containerless ?? false,
    hasSlots: expected.hasSlots ?? false,
    enhance: expected.enhance ?? false,
    shadowMode: expected.shadowOptions?.mode ?? null,
    captureKind: expectedCaptureKind,
  };
  const actualShape = {
    name: actual.name,
    definitionTemplateKind: actual.template?.kind ?? null,
    definitionMarkup: actual.template?.markup ?? null,
    unitMarkup: resource.compilation.unit.templateSource.markup,
    needsCompile: actual.needsCompile,
    containerless: actual.containerless,
    hasSlots: actual.hasSlots,
    enhance: actual.enhance,
    shadowMode: actual.shadowOptions?.mode ?? null,
    captureKind: actual.capture.kind,
  };
  if (canonicalCompilerJson(expectedShape) !== canonicalCompilerJson(actualShape)) {
    throw new Error(
      `Semantic compiler gallery definition ${galleryCase.candidate.id} does not conserve its generated metadata: `
      + `expected ${canonicalCompilerJson(expectedShape)}, received ${canonicalCompilerJson(actualShape)}.`,
    );
  }
}

function observedWorldDifferences(
  galleryCase: SemanticCompilerGalleryCase,
  compilerProfile: { readonly debug: boolean; readonly resolveResources: boolean },
): readonly SemanticCompilerGalleryWorldDifference[] {
  return [
    ...(galleryCase.candidate.world.compiler.debug === compilerProfile.debug
      ? []
      : [SemanticCompilerGalleryWorldDifference.Debug]),
    ...(galleryCase.candidate.world.compiler.resolveResources === compilerProfile.resolveResources
      ? []
      : [SemanticCompilerGalleryWorldDifference.ResolveResources]),
    SemanticCompilerGalleryWorldDifference.SharedResourceScope,
    SemanticCompilerGalleryWorldDifference.CompilerTreeAuthority,
    SemanticCompilerGalleryWorldDifference.GeneratedDefinitionType,
  ];
}

function compileDefinition(galleryCase: SemanticCompilerGalleryCase) {
  const entry = galleryCase.candidate.world.entry;
  if (entry.kind !== "compile") {
    throw new Error(`Admitted semantic gallery case ${galleryCase.candidate.id} is not a compile entry.`);
  }
  return entry.definition;
}

function sameStringArrays(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function expectedJitProduct(candidate: SemanticCompilerGalleryCase["candidate"]): CompilerOracleExpectedProduct {
  const lanes = candidate.oracles.lanes.filter((lane) => lane.id === "framework-jit");
  if (lanes.length !== 1) {
    throw new Error(`Compiler case ${candidate.id} must declare exactly one framework JIT product.`);
  }
  return lanes[0]!.expectedProduct;
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
