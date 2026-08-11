import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { uniqueByKey } from '../collections.js';
import {
  OpenSeam,
  openSeamBoundaryKindForReason,
} from '../kernel/open-seam.js';
import { materializationOpenSeamHandlesForOwners } from '../kernel/materialization.js';
import type { KernelStore } from '../kernel/store.js';
import {
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingSourceEvaluationKind,
  type RuntimeBindingDataFlow,
} from '../observation/runtime-binding-observation.js';
import {
  bindingDataFlowDirectionIncludesSourceToTarget,
  bindingDataFlowDirectionIncludesTargetToSource,
} from '../observation/binding-data-flow-direction.js';
import {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import { RuntimeBindingKind } from '../template/runtime-binding.js';
import { resourceLocalBindingDataFlows } from '../template/runtime-resource-ownership.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticBindingDataFlowRow,
  type SemanticBindingUncertaintyExplanation,
  type SemanticBindingUncertaintyExplanationBlocker,
  type SemanticBindingUncertaintyExplanationConclusion,
  type SemanticBindingUncertaintyExplanationContender,
  type SemanticBindingUncertaintyExplanationNextStep,
  type SemanticBindingUncertaintyExplanationResult,
  type SemanticBindingUncertaintyExplanationSubject,
  type SemanticBindingUncertaintyExplanationUncertainty,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceCursorInput,
} from './contracts.js';
import { answer } from './answer-helpers.js';
import { bindingDataFlowRow } from './binding-projections.js';
import {
  describeAddress,
  semanticSourceReferenceContainsFileOffset,
  semanticSourceReferenceKey,
  type SemanticSourceReference,
} from './source-reference.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';
import {
  templateResourceCursorSelections,
  type TemplateResourceCursorSelection,
} from './template-completion.js';

interface BindingExplanationCandidate {
  readonly selection: TemplateResourceCursorSelection;
  readonly dataFlows: readonly RuntimeBindingDataFlow[];
  readonly rows: readonly SemanticBindingDataFlowRow[];
  readonly subject: SemanticBindingUncertaintyExplanationSubject;
  readonly matchRank: number;
  readonly matchWidth: number;
}

/** Explain exactly what Aurelia can prove, and what blocks stronger certainty, for one authored PropertyBinding. */
export function readBindingUncertaintyExplanation(
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
): SemanticRuntimeAnswer<SemanticBindingUncertaintyExplanationResult> {
  const projectKey = emission.project.projectKey;
  const emptyValue = (
    displayText: string,
    contenders: readonly SemanticBindingUncertaintyExplanationContender[] = [],
  ): SemanticBindingUncertaintyExplanationResult => ({
    displayText,
    projectKey,
    explanation: null,
    contenders,
  });
  const discoveryTruncated = emission.project.sourceDiscovery?.truncated === true;
  const selectionCoverage = discoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : SemanticRuntimeAnswerCoverage.Complete;
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Binding uncertainty explanation requires a source cursor.',
      emptyValue('No source cursor was supplied.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }
  const resolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    emission.project.rootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (resolution.cursor?.offset == null) {
    const summary = resolution.summary ?? 'The supplied binding cursor could not be resolved.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }

  const candidates = bindingExplanationCandidates(
    emission,
    store,
    resolution.cursor.filePath,
    resolution.cursor.offset,
  );
  const bestRank = Math.min(...candidates.map((candidate) => candidate.matchRank));
  const ranked = candidates.filter((candidate) => candidate.matchRank === bestRank);
  const bestWidth = Math.min(...ranked.map((candidate) => candidate.matchWidth));
  const selected = ranked.filter((candidate) => candidate.matchWidth === bestWidth);
  if (selected.length === 0) {
    const summary = 'No template-authored property binding was found at the supplied source cursor.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: selectionCoverage,
      },
    );
  }

  const explanations = selected.map((candidate) => bindingUncertaintyExplanation(
    store,
    candidate,
    cursor,
    discoveryTruncated,
  ));
  const contenders = explanations.map((explanation): SemanticBindingUncertaintyExplanationContender => ({
    subject: explanation.subject,
    conclusionKind: explanation.conclusion.kind,
  }));
  if (explanations.length !== 1) {
    const summary = `The supplied source cursor matches ${explanations.length} equally specific property binding contexts.`;
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(
        'Multiple current app analysis contexts represent this authored binding; no explanation was selected.',
        contenders,
      ),
      {
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
        coverage: selectionCoverage,
      },
    );
  }

  const explanation = explanations[0]!;
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    explanation.conclusion.title,
    {
      displayText: [
        explanation.conclusion.title,
        explanation.conclusion.explanation,
        explanation.uncertainty.state === 'closed' ? null : explanation.uncertainty.explanation,
        explanation.conclusion.action,
      ].filter((part): part is string => part != null).join('\n'),
      projectKey,
      explanation,
      contenders,
    },
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage: bindingUncertaintyExplanationCoverage(explanation),
    },
  );
}

function bindingExplanationCandidates(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  filePath: string,
  offset: number,
): readonly BindingExplanationCandidate[] {
  const candidates: BindingExplanationCandidate[] = [];
  for (const selection of templateResourceCursorSelections(store, emission, filePath, offset)) {
    const byBinding = new Map<string, RuntimeBindingDataFlow[]>();
    for (const dataFlow of resourceLocalBindingDataFlows(store, selection.resource)) {
      const bindingIdentity = dataFlow.binding.identityHandle;
      if (dataFlow.binding.bindingKind !== RuntimeBindingKind.Property || bindingIdentity == null) {
        continue;
      }
      const rows = byBinding.get(bindingIdentity) ?? [];
      rows.push(dataFlow);
      byBinding.set(bindingIdentity, rows);
    }
    for (const dataFlows of byBinding.values()) {
      const sortedDataFlows = [...dataFlows].sort((left, right) =>
        bindingDataFlowSortKey(left).localeCompare(bindingDataFlowSortKey(right))
      );
      const rows = sortedDataFlows.map((dataFlow) =>
        bindingDataFlowRow(selection.resource.compilation.definition.name, dataFlow, store, false)
      );
      const match = bindingCursorMatch(rows, filePath, offset);
      if (match == null) {
        continue;
      }
      const subject = bindingExplanationSubject(emission, store, selection, rows);
      if (subject == null) {
        continue;
      }
      candidates.push({
        selection,
        dataFlows: sortedDataFlows,
        rows,
        subject,
        matchRank: match.rank,
        matchWidth: match.width,
      });
    }
  }
  return candidates.sort((left, right) => left.subject.subjectKey.localeCompare(right.subject.subjectKey));
}

function bindingCursorMatch(
  rows: readonly SemanticBindingDataFlowRow[],
  filePath: string,
  offset: number,
): { readonly rank: number; readonly width: number } | null {
  let best: { readonly rank: number; readonly width: number } | null = null;
  const consider = (source: SemanticSourceReference | null, rank: number): void => {
    if (!semanticSourceReferenceContainsFileOffset(source, filePath, offset)) {
      return;
    }
    const width = source?.start == null || source.end == null
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, source.end - source.start);
    if (best == null || rank < best.rank || (rank === best.rank && width < best.width)) {
      best = { rank, width };
    }
  };
  for (const row of rows) {
    consider(row.expressionSource, 0);
    consider(row.sourceAssignmentOccurrenceSource, 0);
    consider(row.source, 1);
  }
  return best;
}

function bindingExplanationSubject(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  selection: TemplateResourceCursorSelection,
  rows: readonly SemanticBindingDataFlowRow[],
): SemanticBindingUncertaintyExplanationSubject | null {
  const source = firstSource(rows.map((row) => row.source));
  if (source == null) {
    return null;
  }
  const compilation = selection.resource.compilation;
  const expressionSource = firstSource(rows.map((row) => row.expressionSource));
  const templateSource = describeAddress(store, compilation.unit.templateSource.sourceAddressHandle);
  const compilerWorld = compilation.compilerWorld;
  const targetProperties = [...new Set(rows
    .map((row) => row.targetProperty)
    .filter((property): property is string => property != null))].sort();
  const subjectKey = JSON.stringify([
    'binding-uncertainty-subject',
    emission.project.projectKey,
    selection.lane,
    compilation.definition.name,
    semanticSourceReferenceKey(describeAddress(store, compilation.definition.sourceAddressHandle)),
    semanticSourceReferenceKey(templateSource),
    compilerWorld.world.worldKind,
    semanticSourceReferenceKey(describeAddress(store, compilerWorld.world.sourceAddressHandle)),
    semanticSourceReferenceKey(describeAddress(store, compilerWorld.resourceScope.sourceAddressHandle)),
    RuntimeBindingKind.Property,
    semanticSourceReferenceKey(source),
    semanticSourceReferenceKey(expressionSource),
    targetProperties,
  ]);
  return {
    subjectKey,
    projectKey: emission.project.projectKey,
    definitionName: compilation.definition.name,
    compilationLane: selection.lane,
    bindingKind: RuntimeBindingKind.Property,
    source,
    expressionSource,
    templateSource,
    targetProperties,
  };
}

function bindingUncertaintyExplanation(
  store: KernelStore,
  candidate: BindingExplanationCandidate,
  cursor: SemanticRuntimeSourceCursorInput,
  discoveryTruncated: boolean,
): SemanticBindingUncertaintyExplanation {
  const blockers = bindingExplanationBlockers(store, candidate.dataFlows);
  const uncertainty = bindingExplanationUncertainty(candidate.rows, blockers, discoveryTruncated);
  const conclusion = bindingExplanationConclusion(candidate.subject, candidate.rows, uncertainty);
  return {
    subject: candidate.subject,
    conclusion,
    evidence: {
      lanes: candidate.rows,
      blockers,
    },
    uncertainty,
    currentness: {
      authority: 'answer-analysis-basis',
      explanation: 'This explanation describes the semantic basis attached to this answer; requery after source or project input changes.',
    },
    nextSteps: bindingExplanationNextSteps(candidate.subject, candidate.rows, blockers, cursor),
  };
}

function bindingExplanationBlockers(
  store: KernelStore,
  dataFlows: readonly RuntimeBindingDataFlow[],
): readonly SemanticBindingUncertaintyExplanationBlocker[] {
  const blockers = new Map<string, {
    readonly seam: OpenSeam;
    readonly laneIndexes: Set<number>;
  }>();
  dataFlows.forEach((dataFlow, laneIndex) => {
    for (const handle of materializationOpenSeamHandlesForOwners(store, [dataFlow.identityHandle])) {
      const seam = store.read(handle);
      if (!(seam instanceof OpenSeam)) {
        continue;
      }
      const existing = blockers.get(handle);
      if (existing == null) {
        blockers.set(handle, { seam, laneIndexes: new Set([laneIndex]) });
      } else {
        existing.laneIndexes.add(laneIndex);
      }
    }
  });
  return [...blockers.values()]
    .sort((left, right) => `${left.seam.seamKindKey}:${left.seam.summary}`
      .localeCompare(`${right.seam.seamKindKey}:${right.seam.summary}`))
    .map(({ seam, laneIndexes }) => ({
      kind: 'open-seam',
      seamKindKey: seam.seamKindKey,
      summary: seam.summary,
      reasonKinds: seam.reasonKinds,
      boundaryKinds: [...new Set(seam.reasonKinds.map(openSeamBoundaryKindForReason))],
      laneIndexes: [...laneIndexes].sort((left, right) => left - right),
      sources: uniqueByKey(
        [
          describeAddress(store, seam.addressHandle),
          ...seam.reasonSources.map((reasonSource) => describeAddress(store, reasonSource.addressHandle)),
        ].filter((source): source is SemanticSourceReference => source != null),
        semanticSourceReferenceKey,
      ),
    }));
}

function bindingExplanationUncertainty(
  rows: readonly SemanticBindingDataFlowRow[],
  blockers: readonly SemanticBindingUncertaintyExplanationBlocker[],
  discoveryTruncated: boolean,
): SemanticBindingUncertaintyExplanationUncertainty {
  const reasons: SemanticBindingUncertaintyExplanationUncertainty['reasons'][number][] = [];
  if (rows.some((row) => row.direction === RuntimeBindingDataFlowDirection.Open)) {
    reasons.push('binding-direction-open');
  }
  if (rows.some((row) =>
    row.sourceEvaluationKind === RuntimeBindingSourceEvaluationKind.Open
    || row.sourceEvaluationReachability === RuntimeOperationReachability.Open
  )) {
    reasons.push('source-evaluation-open');
  }
  if (rows.some((row) => row.realization === RuntimeOperationRealization.Open)) {
    reasons.push('target-realization-open');
  }
  if (rows.some((row) => row.sourceTypeOpenKind != null || row.sourceTypeOpenReason != null)) {
    reasons.push('source-type-open');
  }
  if (rows.some((row) => row.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.Open)) {
    reasons.push('source-assignment-open');
  }
  if (rows.some((row) =>
    row.targetToSourceValueTypeOpenKind != null || row.targetToSourceValueTypeOpenReason != null
  )) {
    reasons.push('target-to-source-value-open');
  }
  if (rows.some((row) => row.valueConverterWritebackStages.some((stage) =>
    stage.openKind != null
    || stage.openReason != null
    || stage.projectionState === 'open'
    || stage.projectionState === 'input-open'
  ))) {
    reasons.push('value-converter-writeback-open');
  }
  if (rows.some((row) =>
    bindingDataFlowDirectionIncludesSourceToTarget(row.direction)
    && row.sourceToTargetAssignable == null
  )) {
    reasons.push('source-to-target-assignability-open');
  }
  if (rows.some((row) =>
    bindingDataFlowDirectionIncludesTargetToSource(row.direction)
    && row.targetToSourceAssignable == null
  )) {
    reasons.push('target-to-source-assignability-open');
  }
  if (rows.some((row) => row.openReason != null)) {
    reasons.push('data-flow-open');
  }
  if (blockers.length > 0) {
    reasons.push('blocking-open-seam');
  }
  if (discoveryTruncated) {
    reasons.push('source-discovery-truncated');
  }
  const uniqueReasons = [...new Set(reasons)];
  if (discoveryTruncated) {
    return {
      state: 'truncated',
      reasons: uniqueReasons,
      explanation: 'Project source discovery was truncated, so this binding explanation is limited to the admitted source basis.',
    };
  }
  if (uniqueReasons.length > 0) {
    return {
      state: 'open',
      reasons: uniqueReasons,
      explanation: `Aurelia cannot prove a stronger conclusion because ${uniqueReasons.map(bindingUncertaintyReasonText).join('; ')}.`,
    };
  }
  return {
    state: 'closed',
    reasons: [],
    explanation: 'No modeled direction, source type, writeback, or causal blocker uncertainty remains for this binding.',
  };
}

function bindingExplanationConclusion(
  subject: SemanticBindingUncertaintyExplanationSubject,
  rows: readonly SemanticBindingDataFlowRow[],
  uncertainty: SemanticBindingUncertaintyExplanationUncertainty,
): SemanticBindingUncertaintyExplanationConclusion {
  const blocked = rows.some((row) =>
    row.frameworkErrorCode != null
    || row.sourceEvaluationReachability === RuntimeOperationReachability.BlockedByBindFailure
    || row.sourceEvaluationReachability === RuntimeOperationReachability.BlockedByOuterFailure
  );
  const proof = bindingProofText(subject, rows);
  if (blocked) {
    const errors = [...new Set(rows
      .map((row) => row.frameworkErrorCode)
      .filter((code): code is string => code != null))];
    return {
      kind: 'flow-blocked',
      title: 'Aurelia can prove that this binding flow is blocked',
      explanation: errors.length > 0
        ? `${proof} Aurelia also reports ${errors.join(', ')} as a closed framework failure for this flow.`
        : `${proof} The modeled binding lifecycle is blocked before source evaluation completes.`,
      action: uncertainty.state === 'closed'
        ? 'Inspect the retained framework failure or lifecycle evidence before changing the binding.'
        : 'Inspect both the retained failure and the explicit uncertainty blockers before changing the binding.',
    };
  }
  if (uncertainty.state !== 'closed') {
    return {
      kind: 'flow-partially-proved',
      title: 'Aurelia can prove part of this binding flow',
      explanation: proof,
      action: 'Inspect the retained blockers before assuming a stronger source type, assignment, or runtime value guarantee.',
    };
  }
  return {
    kind: 'flow-proved',
    title: 'Aurelia can prove the outcome of this binding flow',
    explanation: proof,
    action: bindingHasProvedNegativeFact(rows)
      ? 'Aurelia has proved a type or writeback incompatibility; inspect those closed facts before changing the binding.'
      : 'No modeled uncertainty blocks the binding facts shown in this explanation.',
  };
}

function bindingProofText(
  subject: SemanticBindingUncertaintyExplanationSubject,
  rows: readonly SemanticBindingDataFlowRow[],
): string {
  const directions = [...new Set(rows.map((row) => bindingDirectionText(row.direction)))];
  const sourceNames = [...new Set(rows.map((row) => row.sourceName).filter((name): name is string => name != null))];
  const sourceTypes = [...new Set(rows.map((row) => row.sourceType).filter((type): type is string => type != null))];
  const targetProperties = subject.targetProperties;
  const sourceToTargetAssignability = [...new Set(rows
    .filter((row) => bindingDataFlowDirectionIncludesSourceToTarget(row.direction))
    .map((row) => row.sourceToTargetAssignable)
    .filter((value): value is boolean => value != null))];
  const targetToSourceAssignability = [...new Set(rows
    .filter((row) => bindingDataFlowDirectionIncludesTargetToSource(row.direction))
    .map((row) => row.targetToSourceAssignable)
    .filter((value): value is boolean => value != null))];
  const sourceWritable = [...new Set(rows
    .filter((row) => bindingDataFlowDirectionIncludesTargetToSource(row.direction))
    .map((row) => row.sourceWritable)
    .filter((value): value is boolean => value != null))];
  const sourceAssignmentKinds = [...new Set(rows
    .filter((row) => bindingDataFlowDirectionIncludesTargetToSource(row.direction))
    .map((row) => row.sourceAssignmentKind)
    .filter((kind): kind is NonNullable<typeof kind> => kind != null))];
  const mismatchKinds = [...new Set(rows.flatMap((row) => [
    ...row.sourceToTargetTypeMismatchKinds,
    ...row.targetToSourceTypeMismatchKinds,
  ]))];
  const facts = [
    `Aurelia can prove ${directions.join(' and ')} for this property binding`,
    sourceNames.length === 0
      ? null
      : `the source is ${sourceNames.map((name) => `“${name}”`).join(', ')}`,
    sourceTypes.length === 0
      ? null
      : `the projected source type is ${sourceTypes.join(' | ')}`,
    targetProperties.length === 0
      ? null
      : `the target ${targetProperties.length === 1 ? 'property is' : 'properties are'} ${targetProperties.map((property) => `“${property}”`).join(', ')}`,
    assignabilityFact('the source value', 'the target value type', sourceToTargetAssignability),
    assignabilityFact('the target value', 'the source assignment type', targetToSourceAssignability),
    sourceWritable.length === 0
      ? null
      : sourceWritable.length === 1
        ? `the source assignment target is ${sourceWritable[0] ? 'writable' : 'not writable'}`
        : 'different runtime lanes disagree about whether the source assignment target is writable',
    sourceAssignmentKinds.length === 0
      ? null
      : `the source assignment policy is ${sourceAssignmentKinds.map(bindingSourceAssignmentKindText).join(' and ')}`,
    mismatchKinds.length === 0
      ? null
      : `the proved mismatch is ${mismatchKinds.map(bindingTypeMismatchKindText).join(' and ')}`,
  ].filter((fact): fact is string => fact != null);
  return `${facts.join('; ')}.`;
}

function assignabilityFact(
  valueLabel: string,
  targetLabel: string,
  values: readonly boolean[],
): string | null {
  if (values.length === 0) {
    return null;
  }
  if (values.length > 1) {
    return `different runtime lanes disagree about whether ${valueLabel} is assignable to ${targetLabel}`;
  }
  return `${valueLabel} is ${values[0] ? '' : 'not '}assignable to ${targetLabel}`;
}

function bindingSourceAssignmentKindText(
  kind: NonNullable<SemanticBindingDataFlowRow['sourceAssignmentKind']>,
): string {
  switch (kind) {
    case RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignable:
      return 'runtime-assignable';
    case RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness:
      return 'runtime-assignable with a TypeScript strictness mismatch';
    case RuntimeBindingDataFlowSourceAssignmentKind.RuntimeUnassignable:
      return 'runtime-unassignable';
    case RuntimeBindingDataFlowSourceAssignmentKind.FrameworkManagedReadOnly:
      return 'framework-managed and read-only';
    case RuntimeBindingDataFlowSourceAssignmentKind.Open:
      return 'open';
  }
  throw new Error(`Unsupported source assignment kind '${String(kind)}'.`);
}

function bindingTypeMismatchKindText(
  kind: SemanticBindingDataFlowRow['sourceToTargetTypeMismatchKinds'][number],
): string {
  switch (kind) {
    case 'source-nullish-to-required-target':
      return 'a nullable source value flowing to a required target';
    case 'target-nullish-to-required-source':
      return 'a nullable target value flowing to a required source';
  }
  throw new Error(`Unsupported binding type mismatch kind '${String(kind)}'.`);
}

function bindingHasProvedNegativeFact(rows: readonly SemanticBindingDataFlowRow[]): boolean {
  return rows.some((row) =>
    row.sourceToTargetAssignable === false
    || row.targetToSourceAssignable === false
    || row.sourceWritable === false
    || row.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.RuntimeUnassignable
    || row.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness
    || row.sourceAssignmentKind === RuntimeBindingDataFlowSourceAssignmentKind.FrameworkManagedReadOnly
    || row.sourceToTargetTypeMismatchKinds.length > 0
    || row.targetToSourceTypeMismatchKinds.length > 0
  );
}

function bindingDirectionText(
  direction: SemanticBindingDataFlowRow['direction'],
): string {
  switch (direction) {
    case RuntimeBindingDataFlowDirection.SourceRead:
      return 'a source read without a generic target write';
    case RuntimeBindingDataFlowDirection.SourceToTarget:
      return 'source-to-target value flow';
    case RuntimeBindingDataFlowDirection.TargetToSource:
      return 'target-to-source writeback';
    case RuntimeBindingDataFlowDirection.TwoWay:
      return 'two-way value flow';
    case RuntimeBindingDataFlowDirection.Open:
      return 'that a binding exists while its value-flow direction remains open';
  }
  throw new Error(`Unsupported runtime binding data-flow direction '${String(direction)}'.`);
}

function bindingExplanationNextSteps(
  subject: SemanticBindingUncertaintyExplanationSubject,
  rows: readonly SemanticBindingDataFlowRow[],
  blockers: readonly SemanticBindingUncertaintyExplanationBlocker[],
  cursor: SemanticRuntimeSourceCursorInput,
): readonly SemanticBindingUncertaintyExplanationNextStep[] {
  const steps: SemanticBindingUncertaintyExplanationNextStep[] = [];
  const firstBlockerSource = blockers.flatMap((blocker) => blocker.sources)[0] ?? null;
  const firstDeclarationSource = rows
    .map((row) => row.sourceAssignmentTargetSource)
    .find((source): source is SemanticSourceReference => source != null) ?? null;
  const firstSpecificSource = firstBlockerSource ?? firstDeclarationSource;
  if (firstSpecificSource != null) {
    steps.push({
      kind: 'inspect-source',
      label: firstBlockerSource == null
        ? 'Open the source declaration used by this binding.'
        : 'Open the first source that blocks stronger certainty.',
      source: firstSpecificSource,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  steps.push({
    kind: 'inspect-query',
    label: 'Inspect the semantic cursor context for this binding.',
    source: null,
    relatedQueryKind: SemanticAppQueryKind.TemplateCursorInfo,
    targetQuery: {
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor,
    },
  });
  if (blockers.length > 0 && subject.source.path != null) {
    steps.push({
      kind: 'inspect-query',
      label: 'Inspect open semantic sites in this binding’s source file.',
      source: null,
      relatedQueryKind: SemanticAppQueryKind.OpenSeamSites,
      targetQuery: {
        kind: SemanticAppQueryKind.OpenSeamSites,
        sourceFile: { filePath: subject.source.path },
      },
    });
  } else {
    steps.push({
      kind: 'inspect-query',
      label: 'Inspect detailed binding data-flow rows across the current app analysis.',
      source: null,
      relatedQueryKind: SemanticAppQueryKind.BindingDataFlows,
      targetQuery: { kind: SemanticAppQueryKind.BindingDataFlows },
    });
  }
  return steps.slice(0, 3);
}

function bindingUncertaintyExplanationCoverage(
  explanation: SemanticBindingUncertaintyExplanation,
): SemanticRuntimeAnswerCoverage {
  return explanation.uncertainty.state === 'closed'
    ? SemanticRuntimeAnswerCoverage.Complete
    : explanation.uncertainty.state === 'truncated'
      ? SemanticRuntimeAnswerCoverage.Truncated
      : SemanticRuntimeAnswerCoverage.Open;
}

function bindingUncertaintyReasonText(
  reason: SemanticBindingUncertaintyExplanationUncertainty['reasons'][number],
): string {
  switch (reason) {
    case 'binding-direction-open':
      return 'the binding mode did not close to one value-flow direction';
    case 'source-evaluation-open':
      return 'source evaluation or its lifecycle reachability remains open';
    case 'target-realization-open':
      return 'target-side operation realization remains open';
    case 'source-type-open':
      return 'the source expression type could not be closed';
    case 'source-assignment-open':
      return 'target-to-source assignment policy remains open';
    case 'target-to-source-value-open':
      return 'the value presented to source writeback remains open';
    case 'value-converter-writeback-open':
      return 'a value-converter writeback stage remains open';
    case 'source-to-target-assignability-open':
      return 'source-to-target assignability could not be proved';
    case 'target-to-source-assignability-open':
      return 'target-to-source assignability could not be proved';
    case 'data-flow-open':
      return 'the modeled data-flow row retains an explicit open reason';
    case 'blocking-open-seam':
      return 'typed causal blockers remain';
    case 'source-discovery-truncated':
      return 'project source discovery was truncated';
  }
}

function firstSource(
  sources: readonly (SemanticSourceReference | null)[],
): SemanticSourceReference | null {
  return [...uniqueByKey(
    sources.filter((source): source is SemanticSourceReference => source != null),
    semanticSourceReferenceKey,
  )].sort((left, right) => semanticSourceReferenceKey(left).localeCompare(semanticSourceReferenceKey(right)))[0] ?? null;
}

function bindingDataFlowSortKey(dataFlow: RuntimeBindingDataFlow): string {
  return JSON.stringify([
    dataFlow.direction,
    dataFlow.targetAccess?.targetProperty
      ?? dataFlow.targetOperation?.targetProperty
      ?? dataFlow.sourceOperation?.targetName
      ?? '',
    dataFlow.sourceName ?? '',
    dataFlow.sourceAddressHandle ?? '',
  ]);
}
