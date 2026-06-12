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
import { readFrameworkModuleBootIndex } from "../../framework/module-boot.js";
import ts from "typescript";
import {
  requiredSourceFileIdentity,
  resolveSourceSelector,
  sourceSpanForNode,
  type SourceProject,
  type SourceSelector,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  sourceTextBasis,
  type Basis,
} from "../basis.js";
import { clampBudget } from "../budget.js";
import {
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { stringFilter } from "./lens-filter-utils.js";
import { sourceSelectorFromInquiry } from "./source-selector.js";

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
  /** Total open-seam counts by evaluator-local kind before row paging. */
  readonly openSeamKindCounts?: Readonly<Record<string, number>>;
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
  const selector = sourceSelectorFromInquiry(inquiry);
  const resolution = resolveSourceSelector(sourceProject, selector);
  const projection = inquiry.projection ?? "effects";
  const pageOptions = {
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    maxDepth: clampBudget(inquiry.budget?.depth, 80, 500),
    ...stringFilter(inquiry.filters, "memberName"),
    ...stringFilter(inquiry.filters, "calleeName"),
    ...stringFilter(inquiry.filters, "receiverName"),
  };

  if (projection === "effects" || projection === "open-seams") {
    const effectTrace = readEvaluationEffectTrace(
      sourceProject,
      selector,
      pageOptions,
    );
    if (projection === "open-seams") {
      const openSeamOffset = pageOptions.offset ?? 0;
      const openSeamRows = effectTrace.openSeams.slice(
        openSeamOffset,
        openSeamOffset + pageOptions.limit,
      );
      return createAnswer(
        inquiry,
        effectTrace.openSeams.length === 0
          ? OutcomeKind.Miss
          : OutcomeKind.Partial,
        `Returned ${openSeamRows.length} of ${effectTrace.openSeams.length} static evaluator open seam row(s).`,
        {
          value: {
            selector,
            targetCount: resolution.targets.length,
            candidateCount: resolution.candidateCount,
            openSeams: openSeamRows,
            openSeamKindCounts: openSeamKindCounts(effectTrace.openSeams),
          },
          basis: [
            frameworkEvaluatorStaticBasis(sourceProject),
            evaluatorCheckerBasis(sourceProject),
            frameworkEvaluatorSourceTextBasis(sourceProject),
          ],
          evidence: openSeamRows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForOpenSeam),
          openSeams: openSeamRows
            .slice(0, evidenceLimit(inquiry))
            .map(answerOpenSeam),
          page: {
            size: pageOptions.limit,
            cursor: inquiry.page?.cursor,
            returned: openSeamRows.length,
            total: effectTrace.openSeams.length,
            nextCursor: openSeamOffset + openSeamRows.length >= effectTrace.openSeams.length
              ? undefined
              : String(openSeamOffset + openSeamRows.length),
          },
          continuations: openSeamContinuations(
            inquiry,
            openSeamRows,
            effectTrace.openSeams.length,
            openSeamOffset,
            pageOptions.limit,
          ),
        },
      );
    }
    const value: FrameworkEvaluatorValue = {
      selector,
      targetCount: resolution.targets.length,
      candidateCount: resolution.candidateCount,
      effectTrace,
      openSeams: effectTrace.openSeams.slice(0, pageOptions.limit),
    };
    return createAnswer(
      inquiry,
      effectTrace.totalEffects === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
      `Returned ${effectTrace.effects.length} of ${effectTrace.totalEffects} static invocation effect row(s) from ${effectTrace.roots.length} root(s).`,
      {
        value,
        basis: [
          frameworkEvaluatorStaticBasis(sourceProject),
          evaluatorCheckerBasis(sourceProject),
          frameworkEvaluatorSourceTextBasis(sourceProject),
        ],
        evidence: effectTrace.effects
          .slice(0, evidenceLimit(inquiry))
          .map(evidenceForEffect),
        openSeams: effectTrace.openSeams
          .slice(0, evidenceLimit(inquiry))
          .map(answerOpenSeam),
        page: {
          size: effectTrace.limit,
          cursor: inquiry.page?.cursor,
          returned: effectTrace.effects.length,
          total: effectTrace.totalEffects,
          nextCursor: effectTrace.nextOffset === undefined ? undefined : String(effectTrace.nextOffset),
        },
        continuations: effectContinuations(inquiry, effectTrace),
      },
    );
  }

  const modules = moduleSummaries(sourceProject, selector, pageOptions.limit);
  return createAnswer(
    inquiry,
    modules.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
    `Returned ${modules.length} static module evaluation summary row(s).`,
    {
      value: {
        selector,
        targetCount: resolution.targets.length,
        candidateCount: resolution.candidateCount,
        modules,
        openSeams: modules.flatMap((module) => module.openSeams),
      },
      basis: [
        frameworkEvaluatorStaticBasis(sourceProject),
        frameworkEvaluatorSourceTextBasis(sourceProject),
      ],
      evidence: modules
        .flatMap((module) => module.openSeams)
        .slice(0, evidenceLimit(inquiry))
        .map(evidenceForOpenSeam),
      openSeams: modules
        .flatMap((module) => module.openSeams)
        .slice(0, evidenceLimit(inquiry))
        .map(answerOpenSeam),
    },
  );
}

function openSeamKindCounts(
  seams: readonly EvaluationEffectOpenSeam[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const seam of seams) {
    counts[seam.openKind] = (counts[seam.openKind] ?? 0) + 1;
  }
  return counts;
}

function moduleSummaries(
  sourceProject: SourceProject,
  selector: SourceSelector,
  limit: number,
): readonly FrameworkEvaluatorModuleSummary[] {
  const resolution = resolveSourceSelector(sourceProject, selector);
  const sourceFiles = uniqueSourceFiles(
    resolution.targets
      .map((target) => target.sourceFile)
      .filter(
        (sourceFile): sourceFile is NonNullable<typeof sourceFile> =>
          sourceFile !== undefined,
      ),
  );
  const frameworkBoot = readFrameworkModuleBootIndex(sourceProject);
  return sourceFiles.slice(0, limit).map((sourceFile) => {
    const identity = requiredSourceFileIdentity(sourceProject, sourceFile);
    const moduleKey = identity.repoPath;
    const result =
      identity.packageId === undefined || identity.packageId === null
        ? null
        : frameworkBoot.readPackage(identity.packageId)?.evaluator.evaluateModule(
            moduleKey,
          );
    const moduleResult =
      result ??
      new StaticEvaluator(sourceProject).evaluateSourceFile(
        sourceFile,
        moduleKey,
      );
    return {
      moduleKey,
      completionKind: moduleResult.completion.kind,
      bindingCount: moduleResult.environment.readBindings().length,
      bindings: moduleResult.environment
        .readBindings()
        .slice(0, limit)
        .map((binding) => ({
          name: binding.name,
          bindingKind: binding.bindingKind,
          state: binding.state,
          valueKind: binding.value.kind,
        })),
      openSeams: moduleResult.openSeams.map((seam, index) => ({
        id: `module-evaluation-open:${moduleKey}:${index}`,
        openKind: seam.openKind,
        summary: seam.summary,
        file: identity,
        span: sourceSpanForNode(sourceFile, seam.node),
        syntaxKindName: ts.SyntaxKind[seam.node.kind] ?? String(seam.node.kind),
      })),
    };
  });
}

function effectContinuations(
  inquiry: Inquiry,
  read: EvaluationEffectTraceRead,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (read.nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.evaluator:effects:next-page",
        "Continue static invocation effects.",
        read.nextOffset,
        read.limit,
      ),
    );
  }
  if (read.openSeams.length > 0) {
    continuations.push(
      projectionContinuation(
        inquiry,
        "framework.evaluator:open-seams",
        "open-seams",
        "Inspect evaluator seams observed while tracing these effects.",
        {
          basis: [BasisKind.StaticEvaluator],
          priority: ContinuationPriority.Secondary,
        },
      ),
    );
  }
  for (const [index, effect] of read.effects.slice(0, 3).entries()) {
    const source = sourceRangeForEvaluationEffect(effect);
    const evidence = evidenceForEffect(effect);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.evaluator:effects",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        source,
        "Inspect source behind this static invocation effect.",
        "Source behind a static invocation effect.",
        { basis: [BasisKind.SourceText, BasisKind.StaticEvaluator] },
      ),
      builder.callSites(
        "type",
        source,
        "Inspect TypeChecker facts for this static invocation effect.",
        "Exact call-site row behind a static invocation effect.",
      ),
    );
  }
  return continuations;
}

function openSeamContinuations(
  inquiry: Inquiry,
  seams: readonly EvaluationEffectOpenSeam[],
  total: number,
  offset: number,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (offset + seams.length < total) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.evaluator:open-seams:next-page",
        "Continue evaluator open seam rows.",
        offset + seams.length,
        limit,
      ),
    );
  }
  for (const [index, seam] of seams.slice(0, 3).entries()) {
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.evaluator:open-seams",
      index,
      evidenceForOpenSeam(seam),
    );
    const continuation = builder.source(
      "source",
      sourceRangeForEvaluationOpenSeam(seam),
      "Inspect source behind this evaluator open seam.",
      "Source behind an evaluator open seam.",
      { basis: [BasisKind.SourceText, BasisKind.StaticEvaluator] },
    );
    continuations.push(continuation);
  }
  return continuations;
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
/** Answer-layer profile for presenting evaluator closure boundaries. */
class FrameworkEvaluatorOpenSeamProfile {
  private static readonly depthLimit =
    new FrameworkEvaluatorOpenSeamProfile(OpenSeamKind.DepthLimit);

  private static readonly unsupportedSyntax =
    new FrameworkEvaluatorOpenSeamProfile(OpenSeamKind.UnsupportedSyntax);

  private static readonly unresolvedSymbol =
    new FrameworkEvaluatorOpenSeamProfile(OpenSeamKind.UnresolvedSymbol);

  private static readonly dynamicRuntime =
    new FrameworkEvaluatorOpenSeamProfile(OpenSeamKind.DynamicRuntime);

  private constructor(
    /** Coarser answer-layer seam kind for this evaluator boundary profile. */
    readonly openSeamKind: OpenSeamKind,
  ) {}

  /** Classify evaluator-local closure evidence into its answer-layer profile. */
  static forEvaluationOpenKind(
    kind: EvaluationOpenKind,
  ): FrameworkEvaluatorOpenSeamProfile {
    switch (kind) {
      case EvaluationOpenKind.DepthLimit:
      case EvaluationOpenKind.StatementLimit:
        return FrameworkEvaluatorOpenSeamProfile.depthLimit;
      case EvaluationOpenKind.UnsupportedStatement:
      case EvaluationOpenKind.UnsupportedExpression:
      case EvaluationOpenKind.UnsupportedBindingPattern:
        return FrameworkEvaluatorOpenSeamProfile.unsupportedSyntax;
      case EvaluationOpenKind.UnresolvedIdentifier:
        return FrameworkEvaluatorOpenSeamProfile.unresolvedSymbol;
      case EvaluationOpenKind.DynamicCall:
      case EvaluationOpenKind.DynamicBranch:
      case EvaluationOpenKind.DynamicLoop:
      case EvaluationOpenKind.DynamicMutation:
        return FrameworkEvaluatorOpenSeamProfile.dynamicRuntime;
    }
  }

  /** Build the public open-seam envelope for one evaluator seam. */
  openSeamFor(seam: EvaluationEffectOpenSeam): OpenSeam {
    return {
      id: seam.id,
      kind: this.openSeamKind,
      summary: seam.summary,
      evidence: evidenceForOpenSeam(seam),
      basis: staticEvaluatorBasisForIdentity(
        "Observed while statically tracing invocation effects.",
      ),
      data: seam,
    };
  }
}

function answerOpenSeam(seam: EvaluationEffectOpenSeam): OpenSeam {
  return FrameworkEvaluatorOpenSeamProfile.forEvaluationOpenKind(
    seam.openKind,
  ).openSeamFor(seam);
}

function uniqueSourceFiles(
  sourceFiles: readonly import("typescript").SourceFile[],
): readonly import("typescript").SourceFile[] {
  const byName = new Map<string, ts.SourceFile>();
  for (const sourceFile of sourceFiles) {
    byName.set(sourceFile.fileName, sourceFile);
  }
  return [...byName.values()].sort((left, right) =>
    left.fileName.localeCompare(right.fileName),
  );
}

function frameworkEvaluatorSourceTextBasis(sourceProject: SourceProject): Basis {
  return sourceTextBasis(
    sourceProject.snapshot().identity,
    "Answered from exact source text selected in the current source project.",
  );
}

function evaluatorCheckerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Effect rows include TypeChecker-backed callee, receiver, argument, and signature facts.",
    identity: sourceProject.snapshot().identity,
  };
}

function frameworkEvaluatorStaticBasis(sourceProject: SourceProject): Basis {
  return {
    ...staticEvaluatorBasisForIdentity(
      "Answered from Atlas static invocation/effect tracing.",
    ),
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
