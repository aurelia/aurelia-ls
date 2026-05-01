import {
  EvaluationOpenKind,
  StaticEvaluator,
  readEvaluationEffectTrace,
  sourceRangeForEvaluationEffect,
  sourceRangeForEvaluationOpenSeam,
  type EvaluationEffectOpenSeam,
  type EvaluationEffectTraceRead,
  type EvaluationInvocationEffect,
} from "../../evaluation/index.js";
import ts from "typescript";
import {
  SourceSelectorScheme,
  resolveSourceSelector,
  sourceSelectorForRange,
  type SourceProject,
  type SourceSelector,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind, type Basis } from "../basis.js";
import { clampBudget } from "../budget.js";
import { ContinuationKind, ContinuationPriority, type Continuation } from "../continuation.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole, OpenSeamKind, type Evidence, type OpenSeam } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind } from "../locus.js";
import { NavigationPlane, NavigationRelation, type NavigationRouteClaim } from "../navigation.js";

/** Value returned by the framework.evaluator runtime lens. */
export interface FrameworkEvaluatorValue {
  /** Selector used to root static evaluation. */
  readonly selector: SourceSelector;
  /** Number of current-epoch targets matched by the selector. */
  readonly targetCount: number;
  /** Number of candidates before occurrence slicing. */
  readonly candidateCount: number;
  /** Static invocation/effect trace, for the effects projection. */
  readonly effectTrace?: EvaluationEffectTraceRead;
  /** Module-level value summaries, for the value projection. */
  readonly modules?: readonly FrameworkEvaluatorModuleSummary[];
  /** Open seams returned as first-class rows. */
  readonly openSeams?: readonly EvaluationEffectOpenSeam[];
}

/** Serializable module-evaluation summary. */
export interface FrameworkEvaluatorModuleSummary {
  /** Module key evaluated by the static evaluator. */
  readonly moduleKey: string;
  /** Final completion kind for the module body. */
  readonly completionKind: string;
  /** Number of environment bindings after module-body evaluation. */
  readonly bindingCount: number;
  /** Bounded binding summaries. */
  readonly bindings: readonly FrameworkEvaluatorBindingSummary[];
  /** Open seams produced by module-body evaluation. */
  readonly openSeams: readonly EvaluationEffectOpenSeam[];
}

/** Serializable evaluator binding summary. */
export interface FrameworkEvaluatorBindingSummary {
  /** Local binding name. */
  readonly name: string;
  /** Binding source category. */
  readonly bindingKind: string;
  /** Binding lifecycle state after evaluation. */
  readonly state: string;
  /** Evaluator-local value kind. */
  readonly valueKind: string;
}

/** Answer framework static evaluator inquiries from the hot SourceProject. */
export function answerFrameworkEvaluator(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkEvaluatorValue> {
  const selector = selectorFromInquiry(inquiry);
  const resolution = resolveSourceSelector(sourceProject, selector);
  const projection = inquiry.projection ?? "effects";
  const pageOptions = {
    limit: clampBudget(inquiry.budget?.rows, 80, 1_000),
    offset: pageOffset(inquiry),
    maxDepth: clampBudget(inquiry.budget?.depth, 80, 500),
    ...stringFilter(inquiry.filters, "memberName"),
    ...stringFilter(inquiry.filters, "calleeName"),
    ...stringFilter(inquiry.filters, "receiverName"),
  };

  if (projection === "effects" || projection === "open-seams") {
    const effectTrace = readEvaluationEffectTrace(sourceProject, selector, pageOptions);
    const value: FrameworkEvaluatorValue = {
      selector,
      targetCount: resolution.targets.length,
      candidateCount: resolution.candidateCount,
      effectTrace,
      openSeams: effectTrace.openSeams,
    };
    if (projection === "open-seams") {
      return createAnswer(inquiry, effectTrace.openSeams.length === 0 ? OutcomeKind.Miss : OutcomeKind.Partial, `Returned ${effectTrace.openSeams.length} static evaluator open seam(s).`, {
        value,
        basis: [staticEvaluatorBasis(sourceProject), checkerBasis(sourceProject), sourceTextBasis(sourceProject)],
        evidence: effectTrace.openSeams.slice(0, evidenceLimit(inquiry)).map(evidenceForOpenSeam),
        openSeams: effectTrace.openSeams.slice(0, evidenceLimit(inquiry)).map(answerOpenSeam),
        continuations: openSeamContinuations(inquiry, effectTrace.openSeams),
      });
    }
    return createAnswer(inquiry, effectTrace.totalEffects === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${effectTrace.effects.length} of ${effectTrace.totalEffects} static invocation effect row(s) from ${effectTrace.roots.length} root(s).`, {
      value,
      basis: [staticEvaluatorBasis(sourceProject), checkerBasis(sourceProject), sourceTextBasis(sourceProject)],
      evidence: effectTrace.effects.slice(0, evidenceLimit(inquiry)).map(evidenceForEffect),
      openSeams: effectTrace.openSeams.slice(0, evidenceLimit(inquiry)).map(answerOpenSeam),
      page: {
        size: effectTrace.limit,
        cursor: inquiry.page?.cursor,
        returned: effectTrace.effects.length,
        total: effectTrace.totalEffects,
        ...(effectTrace.nextOffset === undefined ? {} : { nextCursor: String(effectTrace.nextOffset) }),
      },
      continuations: effectContinuations(inquiry, effectTrace),
    });
  }

  const modules = moduleSummaries(sourceProject, selector, pageOptions.limit);
  return createAnswer(inquiry, modules.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${modules.length} static module evaluation summary row(s).`, {
    value: {
      selector,
      targetCount: resolution.targets.length,
      candidateCount: resolution.candidateCount,
      modules,
      openSeams: modules.flatMap((module) => module.openSeams),
    },
    basis: [staticEvaluatorBasis(sourceProject), sourceTextBasis(sourceProject)],
    evidence: modules.flatMap((module) => module.openSeams).slice(0, evidenceLimit(inquiry)).map(evidenceForOpenSeam),
    openSeams: modules.flatMap((module) => module.openSeams).slice(0, evidenceLimit(inquiry)).map(answerOpenSeam),
  });
}

function moduleSummaries(sourceProject: SourceProject, selector: SourceSelector, limit: number): readonly FrameworkEvaluatorModuleSummary[] {
  const resolution = resolveSourceSelector(sourceProject, selector);
  const sourceFiles = uniqueSourceFiles(resolution.targets.map((target) => target.sourceFile).filter((sourceFile): sourceFile is NonNullable<typeof sourceFile> => sourceFile !== undefined));
  return sourceFiles.slice(0, limit).map((sourceFile) => {
    const moduleKey = sourceProject.sourceFileIdentity(sourceFile)?.repoPath ?? sourceFile.fileName;
    const result = new StaticEvaluator(sourceProject).evaluateSourceFile(sourceFile, moduleKey);
    return {
      moduleKey,
      completionKind: result.completion.kind,
      bindingCount: result.environment.readBindings().length,
      bindings: result.environment.readBindings().slice(0, limit).map((binding) => ({
        name: binding.name,
        bindingKind: binding.bindingKind,
        state: binding.state,
        valueKind: binding.value.kind,
      })),
      openSeams: result.openSeams.map((seam, index) => ({
        id: `module-evaluation-open:${moduleKey}:${index}`,
        openKind: seam.openKind,
        summary: seam.summary,
        file: sourceProject.sourceFileIdentity(sourceFile) ?? {
          absolutePath: sourceFile.fileName,
          repoPath: moduleKey as never,
          packageId: sourceProject.packageForFileName(sourceFile.fileName)?.id ?? null,
        },
        span: sourceSpan(sourceFile, seam.node),
        syntaxKindName: ts.SyntaxKind[seam.node.kind] ?? String(seam.node.kind),
      })),
    };
  });
}

function selectorFromInquiry(inquiry: Inquiry): SourceSelector {
  const subjectSelector = selectorFromSubject(inquiry.subject);
  if (subjectSelector !== null) {
    return subjectSelector;
  }
  switch (inquiry.locus.kind) {
    case LocusKind.SourceFile:
      return { scheme: SourceSelectorScheme.File, filePath: inquiry.locus.filePath };
    case LocusKind.SourceRange:
      return sourceSelectorForRange(inquiry.locus.range);
    case LocusKind.Symbol:
      return {
        scheme: SourceSelectorScheme.Declaration,
        name: inquiry.locus.name,
        ...(inquiry.locus.filePath === undefined ? {} : { filePath: inquiry.locus.filePath }),
        ...(inquiry.locus.packageName === undefined ? {} : { packageName: inquiry.locus.packageName }),
      };
    case LocusKind.Package:
      return {
        scheme: SourceSelectorScheme.Package,
        ...(inquiry.locus.packageId === undefined ? {} : { packageId: inquiry.locus.packageId }),
        ...(inquiry.locus.packageName === undefined ? {} : { packageName: inquiry.locus.packageName }),
      };
    case LocusKind.Handle:
      return { scheme: SourceSelectorScheme.Workspace, ...(typeof inquiry.subject === "string" ? { query: inquiry.subject } : {}) };
    case LocusKind.Repo:
    case LocusKind.RepoArea:
    case LocusKind.GitTree:
      return { scheme: SourceSelectorScheme.Workspace, ...(typeof inquiry.subject === "string" ? { query: inquiry.subject } : {}) };
  }
}

function selectorFromSubject(subject: unknown): SourceSelector | null {
  if (subject === null || typeof subject !== "object" || !("scheme" in subject)) {
    return null;
  }
  const source = subject as Record<string, unknown>;
  const scheme = source.scheme;
  switch (scheme) {
    case SourceSelectorScheme.Workspace:
      return { scheme, ...(typeof source.query === "string" ? { query: source.query } : {}) };
    case SourceSelectorScheme.Package:
      return {
        scheme,
        ...(typeof source.packageId === "string" ? { packageId: source.packageId } : {}),
        ...(typeof source.packageName === "string" ? { packageName: source.packageName } : {}),
      };
    case SourceSelectorScheme.File:
      return { scheme, filePath: stringField(source, "filePath") };
    case SourceSelectorScheme.Range:
      return {
        scheme,
        filePath: stringField(source, "filePath"),
        start: positionField(source, "start"),
        end: positionField(source, "end"),
      };
    case SourceSelectorScheme.Declaration:
      return {
        scheme,
        name: stringField(source, "name"),
        ...(typeof source.kind === "string" ? { kind: source.kind } : {}),
        ...(typeof source.packageId === "string" ? { packageId: source.packageId } : {}),
        ...(typeof source.packageName === "string" ? { packageName: source.packageName } : {}),
        ...(typeof source.filePath === "string" ? { filePath: source.filePath } : {}),
        ...(typeof source.occurrence === "number" ? { occurrence: source.occurrence } : {}),
      };
    case SourceSelectorScheme.Export:
      return {
        scheme,
        exportName: stringField(source, "exportName"),
        ...(typeof source.packageId === "string" ? { packageId: source.packageId } : {}),
        ...(typeof source.packageName === "string" ? { packageName: source.packageName } : {}),
        ...(typeof source.filePath === "string" ? { filePath: source.filePath } : {}),
      };
    default:
      return null;
  }
}

function effectContinuations(inquiry: Inquiry, read: EvaluationEffectTraceRead): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (read.nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.evaluator:effects:next-page", "Continue static invocation effects.", read.nextOffset, read.limit));
  }
  if (read.openSeams.length > 0) {
    continuations.push(projectionContinuation(inquiry, "framework.evaluator:open-seams", "open-seams", "Inspect evaluator seams observed while tracing these effects."));
  }
  for (const [index, effect] of read.effects.slice(0, 3).entries()) {
    const source = sourceRangeForEvaluationEffect(effect);
    const evidence = evidenceForEffect(effect);
    continuations.push({
      id: `framework.evaluator:effects:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect source behind this static invocation effect.",
      inquiry: {
        lens: LensId.TsSource,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "text",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.StaticEvaluator], "Source behind a static invocation effect."),
    });
    continuations.push({
      id: `framework.evaluator:effects:type:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for this static invocation effect.",
      inquiry: {
        lens: LensId.TsType,
        locus: { kind: LocusKind.SourceRange, range: source },
        projection: "call-sites",
        budget: inquiry.budget,
      },
      evidence: [evidence],
      route: route(NavigationPlane.Flow, NavigationRelation.CallSitesOf, [BasisKind.TypeScriptChecker, BasisKind.SourceText], "Exact call-site row behind a static invocation effect."),
    });
  }
  return continuations;
}

function openSeamContinuations(inquiry: Inquiry, seams: readonly EvaluationEffectOpenSeam[]): readonly Continuation[] {
  return seams.slice(0, 3).map((seam, index) => ({
    id: `framework.evaluator:open-seams:source:${index}`,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Primary,
    rationale: "Inspect source behind this evaluator open seam.",
    inquiry: {
      lens: LensId.TsSource,
      locus: { kind: LocusKind.SourceRange, range: sourceRangeForEvaluationOpenSeam(seam) },
      projection: "text",
      budget: inquiry.budget,
    },
    evidence: [evidenceForOpenSeam(seam)],
    route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.StaticEvaluator], "Source behind an evaluator open seam."),
  }));
}

function projectionContinuation(inquiry: Inquiry, id: string, projection: string, rationale: string): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: { ...inquiry, projection, page: undefined },
    route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.StaticEvaluator], rationale),
  };
}

function nextPageContinuation(inquiry: Inquiry, id: string, rationale: string, nextOffset: number, limit: number): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: { ...inquiry, page: { size: limit, cursor: String(nextOffset) } },
    route: route(NavigationPlane.Addressing, NavigationRelation.NextPageOf, [], rationale),
  };
}

function evidenceForEffect(effect: EvaluationInvocationEffect): Evidence {
  return {
    id: effect.id,
    kind: EvidenceKind.CallSite,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: `${effect.root.label}: ${effect.callSite.calleeName} with ${effect.callSite.argumentCount} argument(s), ${effect.certainty}`,
    source: sourceRangeForEvaluationEffect(effect),
    data: effect,
  };
}

function evidenceForOpenSeam(seam: EvaluationEffectOpenSeam): Evidence {
  return {
    id: seam.id,
    kind: EvidenceKind.OpenSeam,
    role: EvidenceRole.Boundary,
    confidence: EvidenceConfidence.Exact,
    summary: seam.summary,
    source: sourceRangeForEvaluationOpenSeam(seam),
    data: seam,
  };
}

function answerOpenSeam(seam: EvaluationEffectOpenSeam): OpenSeam {
  return {
    id: seam.id,
    kind: openSeamKind(seam.openKind),
    summary: seam.summary,
    evidence: evidenceForOpenSeam(seam),
    basis: staticEvaluatorBasisForIdentity("Observed while statically tracing invocation effects."),
    data: seam,
  };
}

function openSeamKind(kind: EvaluationOpenKind): OpenSeamKind {
  switch (kind) {
    case EvaluationOpenKind.DepthLimit:
    case EvaluationOpenKind.StatementLimit:
      return OpenSeamKind.DepthLimit;
    case EvaluationOpenKind.UnsupportedStatement:
    case EvaluationOpenKind.UnsupportedExpression:
    case EvaluationOpenKind.UnsupportedBindingPattern:
      return OpenSeamKind.UnsupportedSyntax;
    case EvaluationOpenKind.UnresolvedIdentifier:
      return OpenSeamKind.UnresolvedSymbol;
    case EvaluationOpenKind.DynamicCall:
    case EvaluationOpenKind.DynamicBranch:
    case EvaluationOpenKind.DynamicLoop:
    case EvaluationOpenKind.DynamicMutation:
      return OpenSeamKind.DynamicRuntime;
  }
}

function uniqueSourceFiles(sourceFiles: readonly import("typescript").SourceFile[]): readonly import("typescript").SourceFile[] {
  const byName = new Map<string, ts.SourceFile>();
  for (const sourceFile of sourceFiles) {
    byName.set(sourceFile.fileName, sourceFile);
  }
  return [...byName.values()].sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node) {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function stringFilter(source: Record<string, unknown> | undefined, key: string): object {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function stringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function positionField(source: Record<string, unknown>, key: string): { readonly line: number; readonly character: number } {
  const value = source[key];
  if (value === null || typeof value !== "object") {
    return { line: 0, character: 0 };
  }
  const record = value as Record<string, unknown>;
  return {
    line: typeof record.line === "number" ? record.line : 0,
    character: typeof record.character === "number" ? record.character : 0,
  };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}

function sourceTextBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.SourceText,
    closure: BasisClosure.Exact,
    freshness: BasisFreshness.Live,
    summary: "Answered from exact source text selected in the current source project.",
    identity: sourceProject.snapshot().identity,
  };
}

function checkerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary: "Effect rows include TypeChecker-backed callee, receiver, argument, and signature facts.",
    identity: sourceProject.snapshot().identity,
  };
}

function staticEvaluatorBasis(sourceProject: SourceProject): Basis {
  return {
    ...staticEvaluatorBasisForIdentity("Answered from Atlas static invocation/effect tracing."),
    identity: sourceProject.snapshot().identity,
  };
}

function staticEvaluatorBasisForIdentity(summary: string): Basis {
  return {
    kind: BasisKind.StaticEvaluator,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Evaluator,
    freshness: BasisFreshness.Live,
    summary,
    identity: "@aurelia-ls/atlas/evaluation",
  };
}

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}
