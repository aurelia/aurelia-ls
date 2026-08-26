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
import {
  BrowserEffectiveTemplateMaterializer,
  executeDeterministicTemplateCompiler,
  parseBrowserTemplateFragmentDraft,
  selectBrowserTemplateCompilerCarrier,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
  type TemplateCompilerDeterministicExecutionReasonKind,
  type TemplateCompilerDeterministicExecutionState,
} from "@aurelia-ls/semantic-runtime/browser-template";
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
type BrowserMaterializationContext = ConstructorParameters<typeof BrowserEffectiveTemplateMaterializer>[0];

class SemanticCompilerGalleryObservationProjection {
  constructor(
    readonly observations: readonly SemanticCompilerGalleryObservation[],
    readonly browserMaterializationMs: number,
    readonly normalizedStructuralReplayMs: number,
  ) {}
}

class NormalizedStructuralReplayProjection {
  constructor(
    readonly observation: SemanticCompilerGalleryNormalizedStructuralReplay,
    readonly browserMaterializationMs: number,
    readonly replayMs: number,
  ) {}
}

export interface SemanticCompilerGalleryRootRow {
  readonly targetKind: string;
  readonly sequenceResolved: boolean;
  readonly instructionKinds: readonly string[];
}

export interface SemanticCompilerGalleryGeneratedDefinition {
  readonly role: string;
  readonly state: string;
  readonly needsCompile: false | null;
  readonly slotName: string | null;
  readonly parentDefinitionIndex: number | null;
  readonly compilerReachableNodeCount: number;
  readonly rows: readonly SemanticCompilerGalleryRootRow[];
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

/** Immutable characterization of normalized structural replay; it is not a JIT equivalence claim. */
export interface SemanticCompilerGalleryNormalizedStructuralReplay {
  readonly state: `${TemplateCompilerDeterministicExecutionState}`;
  readonly reasonKinds: readonly `${TemplateCompilerDeterministicExecutionReasonKind}`[];
  /** Canonical case-local ordered ledger digest; counts alone are not structural identity. */
  readonly structuralDigest: string;
  readonly normalizedContextCount: number;
  readonly realizedContextCount: number;
  readonly targetRowCount: number;
  readonly geometryCount: number;
  readonly consumedNodeCount: number;
  readonly consumedAttributeCount: number;
  readonly inputTransferCount: number;
  readonly textExpansionCount: number;
  readonly generatedOccurrenceCount: number;
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
      readonly generatedDefinitions: readonly SemanticCompilerGalleryGeneratedDefinition[];
    },
    readonly authored: {
      readonly htmlNodes: number;
      readonly htmlAttributes: number;
      readonly recoveries: number;
      readonly draftBindingsRetained: boolean;
    },
    readonly issues: readonly SemanticCompilerGalleryIssueRow[],
    readonly openSeams: readonly SemanticCompilerGalleryOpenSeamRow[],
    readonly normalizedStructuralReplay: SemanticCompilerGalleryNormalizedStructuralReplay,
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
      const replayRun = runtime.computationLifecycle.begin({
        kind: "aot-semantic-compiler-gallery-structural-replay",
        reconciliationKey: `aot-semantic-gallery-structural-replay:${plan.sourceDigest}`,
        summary: "Bracket browser-effective materialization and normalized structural replay for the AOT semantic gallery.",
      });
      let projection: SemanticCompilerGalleryObservationProjection;
      try {
        projection = observationsFor(app, plan.admitted, replayRun);
      } finally {
        replayRun.abort();
      }
      const observations = projection.observations;
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
          "semantic.browser-template-materialization": projection.browserMaterializationMs,
          "semantic.normalized-structural-replay": projection.normalizedStructuralReplayMs,
          "semantic.projection": Math.max(
            0,
            projectedAt - analyzedAt
              - projection.browserMaterializationMs
              - projection.normalizedStructuralReplayMs,
          ),
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
  browserMaterialization: BrowserMaterializationContext,
): SemanticCompilerGalleryObservationProjection {
  const resourcesByName = new Map<string, SemanticTemplateResource>();
  for (const resource of app.emission.templates.resources) {
    const name = resource.compilation.definition.name;
    if (resourcesByName.has(name)) {
      throw new Error(`Semantic compiler gallery emitted duplicate definition ${name}.`);
    }
    resourcesByName.set(name, resource);
  }
  let browserMaterializationMs = 0;
  let normalizedStructuralReplayMs = 0;
  const observations = cases.flatMap((candidate) => {
    const definition = candidate.candidate.world.entry;
    if (definition.kind !== "compile") return [];
    const resource = resourcesByName.get(definition.definition.name);
    if (resource == null) return [];
    validateDefinitionFidelity(resource, candidate);
    const replay = normalizedStructuralReplayFor(resource, candidate, browserMaterialization);
    browserMaterializationMs += replay.browserMaterializationMs;
    normalizedStructuralReplayMs += replay.replayMs;
    return [observationFor(resource, candidate, replay.observation)];
  });
  return new SemanticCompilerGalleryObservationProjection(
    observations,
    browserMaterializationMs,
    normalizedStructuralReplayMs,
  );
}

function normalizedStructuralReplayFor(
  resource: SemanticTemplateResource,
  galleryCase: SemanticCompilerGalleryCase,
  browserMaterialization: BrowserMaterializationContext,
): NormalizedStructuralReplayProjection {
  const compilation = resource.compilation;
  const markup = compilation.unit.templateSource.markup;
  if (markup == null || compilation.html.draft == null) {
    throw new Error(
      `Semantic compiler gallery case '${galleryCase.candidate.id}' has no retained markup/draft for browser replay.`,
    );
  }
  const browserStartedAt = performance.now();
  const browserDraft = parseBrowserTemplateFragmentDraft(markup);
  const browserTemplate = new BrowserEffectiveTemplateMaterializer(browserMaterialization).materialize({
    localKey: `semantic-gallery-structural-replay:${galleryCase.candidate.id}`,
    sourceRevision: compilation.definition.template?.authoredSourceRevision
      ?? compilation.unit.templateSource.productHandle,
    templateSource: compilation.unit.templateSource,
    authoredHtml: compilation.html,
    browser: browserDraft,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browserDraft.fragment),
  });
  const browserFinishedAt = performance.now();
  const result = executeDeterministicTemplateCompiler({ browserTemplate, compilation });
  const replayFinishedAt = performance.now();
  const execution = result.structuralExecution;
  const contexts = compilation.compiledTemplate.targetPlan.readContexts();
  const observation: SemanticCompilerGalleryNormalizedStructuralReplay = {
    state: result.state,
    reasonKinds: result.reasons.map((reason) => reason.reasonKind),
    structuralDigest: normalizedStructuralReplayDigest(compilation, result),
    normalizedContextCount: contexts.length,
    realizedContextCount: execution?.readContexts().length ?? 0,
    targetRowCount: contexts.reduce((sum, context) => sum + context.readRows().length, 0),
    geometryCount: execution == null
      ? 0
      : execution.readContexts().reduce(
        (sum, context) => sum + execution.readTargetGeometries(context).length,
        0,
      ),
    consumedNodeCount: execution?.readConsumedNodeDispositions().length ?? 0,
    consumedAttributeCount: execution?.readConsumedAttributeDispositions().length ?? 0,
    inputTransferCount: execution?.readInputNodeTransfers().length ?? 0,
    textExpansionCount: execution?.readInputTextExpansions().length ?? 0,
    generatedOccurrenceCount: [
      ...result.forest.readNodes(),
      ...result.forest.readAttributes(),
    ].filter((occurrence) => occurrence.generation != null).length,
  };
  return new NormalizedStructuralReplayProjection(
    observation,
    browserFinishedAt - browserStartedAt,
    replayFinishedAt - browserFinishedAt,
  );
}

function normalizedStructuralReplayDigest(
  compilation: SemanticTemplateResource["compilation"],
  result: ReturnType<typeof executeDeterministicTemplateCompiler>,
): string {
  const forest = result.forest;
  const execution = result.structuralExecution;
  const nodes = forest.readNodes();
  const attributes = forest.readAttributes();
  const contexts = compilation.compiledTemplate.targetPlan.readContexts();
  const nodeIndexes = new Map(nodes.map((node, index) => [node, index]));
  const attributeIndexes = new Map(attributes.map((attribute, index) => [attribute, index]));
  const contextIndexes = new Map(contexts.map((context, index) => [context.localKey, index]));
  const authoredNodeIndexes = new Map(compilation.html.nodes.map((node, index) => [node.productHandle, index]));
  const authoredAttributeIndexes = new Map(
    compilation.html.attributes.map((attribute, index) => [attribute.productHandle, index]),
  );
  const causeIdentities = new Map<string, string>();
  const registerCauseIdentities = (
    prefix: string,
    values: readonly { readonly productHandle: string | null }[],
  ): void => {
    values.forEach((value, index) => {
      if (value.productHandle != null && !causeIdentities.has(value.productHandle)) {
        causeIdentities.set(value.productHandle, `${prefix}:${index}`);
      }
    });
  };
  registerCauseIdentities("authored-node", compilation.html.nodes);
  registerCauseIdentities("authored-attribute", compilation.html.attributes);
  registerCauseIdentities("classification", compilation.attributeClassification.classifications);
  registerCauseIdentities("value-site", compilation.valueSites.sites);
  registerCauseIdentities("instruction", compilation.compiledTemplate.instructions);
  registerCauseIdentities("compiled-template", compilation.compiledTemplate.compiledTemplates);
  registerCauseIdentities("compiler-issue", compilation.compiledTemplate.issues);
  registerCauseIdentities("context-owner", contexts.map((context) => context.owner));
  const causeIdentity = (handle: string): string => causeIdentities.get(handle) ?? `raw:${handle}`;
  const nodesByAuthoredProduct = new Map<string, number[]>();
  for (const [node, index] of nodeIndexes) {
    const productHandle = forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
    if (productHandle != null) appendOrdinal(nodesByAuthoredProduct, productHandle, index);
  }
  const operationIndexes = new Map<string, number>();
  const generationFor = (
    generation: (typeof nodes)[number]["generation"],
  ): Record<string, unknown> | null => {
    if (generation == null) return null;
    const contextIndex = contextIndexes.get(generation.contextKey) ?? null;
    const operationKey = `${contextIndex ?? "foreign"}:${generation.operationKey}`;
    let operationIndex = operationIndexes.get(operationKey);
    if (operationIndex == null) {
      operationIndex = operationIndexes.size;
      operationIndexes.set(operationKey, operationIndex);
    }
    return {
      contextIndex,
      operationIndex,
      role: generation.role,
      outputOrdinal: generation.outputOrdinal,
      causes: generation.causeHandles.map(causeIdentity),
    };
  };
  const nodeIndex = (node: (typeof nodes)[number] | null): number | null =>
    node == null ? null : nodeIndexes.get(node) ?? null;
  const contextIndex = (localKey: string | null): number | null =>
    localKey == null ? null : contextIndexes.get(localKey) ?? null;
  const nodeValue = (node: (typeof nodes)[number]): readonly unknown[] => {
    if (node instanceof TemplateCompilerElementOccurrence) {
      return ["element", node.tagName, node.namespace, node.namespaceUri];
    }
    if (node instanceof TemplateCompilerTextOccurrence) return ["text", node.text];
    if (node instanceof TemplateCompilerCommentOccurrence) {
      return ["comment", node.text, node.semanticKind];
    }
    return [node.inputReference?.nodeKind ?? "fragment"];
  };
  const geometryFor = (row: (typeof contexts)[number]["readRows"] extends () => readonly (infer TRow)[] ? TRow : never) => {
    const geometry = execution?.readTargetGeometry(row) ?? null;
    if (geometry == null) return null;
    return "target" in geometry
      ? {
          kind: geometry.geometryKind,
          marker: nodeIndex(geometry.marker),
          logicalTarget: nodeIndex(geometry.logicalTarget),
        }
      : {
          kind: geometry.geometryKind,
          marker: nodeIndex(geometry.marker),
          start: nodeIndex(geometry.start),
          end: nodeIndex(geometry.end),
          logicalTarget: nodeIndex(geometry.logicalTarget),
          replacedNode: nodeIndex(geometry.replacedNode),
          realizedParent: nodeIndex(geometry.realizedParent),
          realizedOrdinal: geometry.realizedOrdinal,
        };
  };
  const ledger = {
    state: result.state,
    reasons: result.reasons.map((reason) => ({
      kind: reason.reasonKind,
      summary: reason.summary,
      products: reason.productHandles.map(causeIdentity),
    })),
    nodes: nodes.map((node, index) => {
      const authoredProductHandle = forest.exactAuthoredNodeOrigin(node)?.authored.productHandle ?? null;
      return {
        index,
        value: nodeValue(node),
        input: node.inputReference != null,
        authoredNodeIndex: authoredProductHandle == null
          ? null
          : authoredNodeIndexes.get(authoredProductHandle) ?? null,
        parent: nodeIndex(node.parent),
        edgeKind: node.parentEdgeKind,
        ordinal: node.readParentOrdinal(),
        generation: generationFor(node.generation),
      };
    }),
    attributes: attributes.map((attribute, index) => {
      const authoredProductHandle = forest.exactAuthoredAttributeOrigin(attribute)?.authored.productHandle ?? null;
      return {
        index,
        name: attribute.name,
        value: attribute.value,
        input: attribute.inputReference != null,
        authoredAttributeIndex: authoredProductHandle == null
          ? null
          : authoredAttributeIndexes.get(authoredProductHandle) ?? null,
        owner: nodeIndex(attribute.owner),
        ordinal: attribute.readOwnerOrdinal(),
        generation: generationFor(attribute.generation),
      };
    }),
    contexts: contexts.map((context, index) => ({
      index,
      role: context.role,
      slotName: context.slotName,
      ownerContext: contextIndex(context.ownerContext?.localKey ?? null),
      structure: (() => {
        const structure = execution?.readContextStructure(context) ?? null;
        return structure == null
          ? null
          : {
              carrier: nodeIndex(structure.compilerCarrier),
              content: nodeIndex(structure.compilerContent),
            };
      })(),
      compilerReachableNodeIndexes: context.readCompilerReachableNodeProductHandles().map((productHandle) =>
        authoredNodeIndexes.get(productHandle) ?? null
      ),
      frontiers: context.readFrontiers().map((frontier) => ({
        projectedTargetOrdinal: frontier.projectedTargetOrdinal,
        summary: frontier.summary,
      })),
      rows: context.readRows().map((row) => {
        const sourceOccurrences = nodesByAuthoredProduct.get(row.node.productHandle) ?? [];
        return {
          ordinal: row.ordinal,
          projectedTargetOrdinal: row.projectedTargetOrdinal,
          projectedTargetCount: row.projectedTargetCount,
          posture: row.posture,
          targetKind: row.targetKind,
          sourceNode: sourceOccurrences.length === 1 ? sourceOccurrences[0]! : null,
          instructionKinds: row.instructions.map((instruction) => instruction.instructionKind),
          geometry: geometryFor(row),
        };
      }),
    })),
    consumedNodes: execution?.readConsumedNodeDispositions().map((disposition) => ({
      context: contextIndex(disposition.context.localKey),
      node: nodeIndex(disposition.node),
      authoredNodeIndex: disposition.authoredProductHandle == null
        ? null
        : authoredNodeIndexes.get(disposition.authoredProductHandle) ?? null,
      membershipOrdinal: disposition.membershipOrdinal,
      owner: nodeIndex(disposition.owner),
      ownerOrdinal: disposition.ownerOrdinal,
      eventOrdinal: disposition.eventOrdinal,
      causes: disposition.causeHandles.map(causeIdentity),
    })) ?? [],
    consumedAttributes: execution?.readConsumedAttributeDispositions().map((disposition) => ({
      context: contextIndex(disposition.context.localKey),
      attribute: attributeIndexes.get(disposition.attribute) ?? null,
      authoredAttributeIndex: disposition.authoredProductHandle == null
        ? null
        : authoredAttributeIndexes.get(disposition.authoredProductHandle) ?? null,
      owner: nodeIndex(disposition.owner),
      ownerOrdinal: disposition.ownerOrdinal,
      eventOrdinal: disposition.eventOrdinal,
      causes: disposition.causeHandles.map(causeIdentity),
    })) ?? [],
    inputTransfers: execution?.readInputNodeTransfers().map((transfer) => ({
      context: contextIndex(transfer.context.localKey),
      node: nodeIndex(transfer.node),
      authoredNodeIndex: transfer.authoredProductHandle == null
        ? null
        : authoredNodeIndexes.get(transfer.authoredProductHandle) ?? null,
      structuralEntrantNodeIndex: authoredNodeIndexes.get(transfer.structuralEntrantProductHandle) ?? null,
      sourceParent: nodeIndex(transfer.sourceParent),
      sourceEdgeKind: transfer.sourceEdgeKind,
      sourceOrdinal: transfer.sourceOrdinal,
      destinationParent: nodeIndex(transfer.destinationParent),
      destinationEdgeKind: transfer.destinationEdgeKind,
      destinationOrdinal: transfer.destinationOrdinal,
      eventOrdinal: transfer.eventOrdinal,
      causes: transfer.causeHandles.map(causeIdentity),
    })) ?? [],
    textExpansions: execution?.readInputTextExpansions().map((expansion) => ({
      context: contextIndex(expansion.context.localKey),
      input: nodeIndex(expansion.input),
      sourceParent: nodeIndex(expansion.sourceParent),
      sourceOrdinal: expansion.sourceOrdinal,
      outputs: expansion.outputs.map((output) => nodeIndex(output)),
      eventOrdinal: expansion.eventOrdinal,
      causes: expansion.causeHandles.map(causeIdentity),
    })) ?? [],
  };
  return digest(canonicalCompilerJson(ledger));
}

function appendOrdinal(map: Map<string, number[]>, key: string, ordinal: number): void {
  const ordinals = map.get(key);
  if (ordinals == null) map.set(key, [ordinal]);
  else ordinals.push(ordinal);
}

function observationFor(
  resource: SemanticTemplateResource,
  galleryCase: SemanticCompilerGalleryCase,
  normalizedStructuralReplay: SemanticCompilerGalleryNormalizedStructuralReplay,
): SemanticCompilerGalleryObservation {
  const compilation = resource.compilation;
  const emission = compilation.compiledTemplate;
  const sequences = new Map(emission.instructionSequences.map((sequence) => [sequence.productHandle, sequence]));
  const rowsFor = (compiledTemplate: typeof emission.compiledTemplate): SemanticCompilerGalleryRootRow[] =>
    compiledTemplate.targets.map((target) => {
    const sequence = sequences.get(target.instructionSequenceProductHandle) ?? null;
    return {
      targetKind: target.targetKind,
      sequenceResolved: sequence != null,
      instructionKinds: sequence?.instructions.map((instruction) => instruction.instructionKind) ?? [],
    };
  });
  const rootRows = rowsFor(emission.compiledTemplate);
  const surrogate = emission.compiledTemplate.surrogateSequence;
  const definitionIndexes = new Map(emission.compiledTemplates.map((definition, index) => [
    definition.productHandle,
    index,
  ]));
  const targetContexts = new Map(emission.targetPlan.readContexts().map((context) => [
    context.compiledTemplate.productHandle,
    context,
  ]));
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
    generatedDefinitions: emission.compiledTemplates.slice(1).map((definition) => {
      const targetContext = targetContexts.get(definition.productHandle);
      if (targetContext == null) {
        throw new Error(`Compiled definition '${definition.productHandle}' has no target-plan context.`);
      }
      return {
        role: definition.context.role,
        state: definition.state,
        needsCompile: definition.needsCompile,
        slotName: targetContext.slotName,
        parentDefinitionIndex: targetContext.ownerContext == null
          ? null
          : definitionIndexes.get(targetContext.ownerContext.compiledTemplate.productHandle) ?? null,
        compilerReachableNodeCount: definition.compilerReachableNodeProductHandles.length,
        rows: rowsFor(definition),
      };
    }),
  };
  const authored = {
    htmlNodes: compilation.html.nodes.length,
    htmlAttributes: compilation.html.attributes.length,
    recoveries: compilation.html.recoveries.length,
    draftBindingsRetained: compilation.html.draft != null
      && compilation.html.nodeDraftBindings.length === compilation.html.nodes.length
      && compilation.html.attributeDraftBindings.length === compilation.html.attributes.length,
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
    digest(canonicalCompilerJson({ compilerProfile, compiledTemplate, authored, issues, openSeams, normalizedStructuralReplay })),
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
    normalizedStructuralReplay,
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
