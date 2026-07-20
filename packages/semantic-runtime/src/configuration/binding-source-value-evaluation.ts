import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  evaluationAbruptCompletionSummary,
  type EvaluationAbruptCompletion,
} from '../evaluation/completion.js';
import {
  openSeamReasonKindsForEvaluationAbruptCompletion,
  openSeamReasonKindsForEvaluationRead,
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from '../evaluation/seams.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  evaluationValueOwnOpenSeams,
  unretainedEvaluationOpenSeams,
} from '../evaluation/value-pressure.js';

/** Source-value evaluation result shape shared by binding, router, template, and composition consumers. */
export const enum RuntimeBindingSourceValueEvaluationClosure {
  /** Evaluation closed to a modeled value without retained open pressure. */
  Value = 'value',
  /** Evaluation retained open pressure; a best-known value may still be available. */
  Open = 'open',
}

export const enum RuntimeBindingSourceOpenValueUse {
  /** The value is retained only for honest projection and must not drive semantic execution. */
  Candidate = 'candidate',
  /** All pressure belongs to the aggregate's own shape, so canonical member readers may inspect known slots. */
  Addressable = 'addressable',
}

/** Binding-source value evidence with closure state independent from best-known value presence. */
export class RuntimeBindingSourceValueEvaluation {
  readonly openSeams: readonly EvaluationOpenSeam[];

  private constructor(
    readonly closure: RuntimeBindingSourceValueEvaluationClosure,
    readonly value: EvaluationValue | null,
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[] = [],
    /** Exact evaluator completion when this open result came from modeled abrupt control flow. */
    readonly abruptCompletion: EvaluationAbruptCompletion | null = null,
    /** Exact evaluator-local causes retained beside the compact public reason vocabulary. */
    openSeams: readonly EvaluationOpenSeam[] = [],
    /** Operations admitted for a retained open value. Closed values are always executable. */
    readonly openValueUse: RuntimeBindingSourceOpenValueUse | null = null,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }

  static value(value: EvaluationValue): RuntimeBindingSourceValueEvaluation {
    const ownOpenSeams = evaluationValueOwnOpenSeams(value);
    return ownOpenSeams.length === 0
      ? new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationClosure.Value, value, null)
      : RuntimeBindingSourceValueEvaluation.openAddressableValue(
          value,
          ownOpenSeams.map((seam) => seam.summary).join(' '),
          openSeamReasonKindsForEvaluationRead({ value, openSeams: ownOpenSeams, abruptCompletion: null }),
          ownOpenSeams,
        );
  }

  static open(
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
    abruptCompletion: EvaluationAbruptCompletion | null = null,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return RuntimeBindingSourceValueEvaluation.openResult(null, reason, reasonKinds, abruptCompletion, openSeams);
  }

  /** Retains a usable value while recording pressure that prevents the derivation from being closed. */
  static openWithValue(
    value: EvaluationValue,
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
    openSeams: readonly EvaluationOpenSeam[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return RuntimeBindingSourceValueEvaluation.openResult(
      value,
      reason,
      reasonKinds,
      null,
      openSeams,
      RuntimeBindingSourceOpenValueUse.Candidate,
    );
  }

  static openAddressableValue(
    value: EvaluationValue,
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
    openSeams: readonly EvaluationOpenSeam[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return RuntimeBindingSourceValueEvaluation.openResult(
      value,
      reason,
      reasonKinds,
      null,
      openSeams,
      RuntimeBindingSourceOpenValueUse.Addressable,
    );
  }

  private static openResult(
    value: EvaluationValue | null,
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[],
    abruptCompletion: EvaluationAbruptCompletion | null,
    openSeams: readonly EvaluationOpenSeam[],
    openValueUse: RuntimeBindingSourceOpenValueUse | null = null,
  ): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(
      RuntimeBindingSourceValueEvaluationClosure.Open,
      value,
      reason,
      [...new Set(reasonKinds)],
      abruptCompletion,
      openSeams,
      openValueUse,
    );
  }

  /** Value admitted for semantic execution rather than best-known projection. */
  get executableValue(): EvaluationValue | null {
    return this.closure === RuntimeBindingSourceValueEvaluationClosure.Value
      ? this.value
      : null;
  }

  /** Aggregate admitted for canonical member selection without admitting scalar/control execution. */
  get addressableValue(): EvaluationValue | null {
    return this.closure === RuntimeBindingSourceValueEvaluationClosure.Value
      || this.openValueUse === RuntimeBindingSourceOpenValueUse.Addressable
      ? this.value
      : null;
  }
}

export function openBindingSourceNeedsRuntimeValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
  );
}

/** Converts an evaluator value plus retained open summaries into a binding-source value result. */
export function bindingSourceValueEvaluationResult(
  value: EvaluationValue | null,
  openSummaries: readonly string[],
  abruptCompletion: EvaluationAbruptCompletion | null = null,
  openReasonKinds: readonly OpenSeamReasonKind[] = [],
  openSeams: readonly EvaluationOpenSeam[] = [],
): RuntimeBindingSourceValueEvaluation {
  const uniqueOpenSummaries = openSummaries.filter((summary, index, all) => all.indexOf(summary) === index);
  if (abruptCompletion != null) {
    return RuntimeBindingSourceValueEvaluation.open(
      [evaluationAbruptCompletionSummary(abruptCompletion), ...uniqueOpenSummaries]
        .filter((summary, index, all) => all.indexOf(summary) === index)
        .join(' '),
      [
        ...openReasonKinds,
        ...openSeamReasonKindsForEvaluationAbruptCompletion(abruptCompletion),
      ],
      abruptCompletion,
      openSeams,
    );
  }
  if (value == null) {
    return RuntimeBindingSourceValueEvaluation.open(
      ['Static evaluation did not produce a value.', ...uniqueOpenSummaries]
        .filter((summary, index, all) => all.indexOf(summary) === index)
        .join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue, ...openReasonKinds],
      null,
      openSeams,
    );
  }
  if (
    value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject
  ) {
    return RuntimeBindingSourceValueEvaluation.openWithValue(
      value,
      [value.reason, ...uniqueOpenSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [openSeamReasonKindForEvaluationBoundary(value.boundaryKind), ...openReasonKinds],
      openSeams,
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    if (value.retainedCandidate != null) {
      return RuntimeBindingSourceValueEvaluation.openWithValue(
        value.retainedCandidate,
        [value.reason, ...uniqueOpenSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue, ...openReasonKinds],
        openSeams,
      );
    }
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...uniqueOpenSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue, ...openReasonKinds],
      null,
      openSeams,
    );
  }
  if (uniqueOpenSummaries.length > 0 || openReasonKinds.length > 0) {
    const reason = uniqueOpenSummaries.length === 0
      ? 'Static evaluation retained open value provenance.'
      : uniqueOpenSummaries.join(' ');
    const reasonKinds = openReasonKinds.length === 0
      ? [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue]
      : openReasonKinds;
    return retainsOnlyAddressableShapePressure(value, uniqueOpenSummaries, reasonKinds, openSeams)
      ? RuntimeBindingSourceValueEvaluation.openAddressableValue(value, reason, reasonKinds, openSeams)
      : RuntimeBindingSourceValueEvaluation.openWithValue(value, reason, reasonKinds, openSeams);
  }
  return RuntimeBindingSourceValueEvaluation.value(value);
}

function retainsOnlyAddressableShapePressure(
  value: EvaluationValue,
  openSummaries: readonly string[],
  openReasonKinds: readonly OpenSeamReasonKind[],
  openSeams: readonly EvaluationOpenSeam[],
): boolean {
  const ownOpenSeams = evaluationValueOwnOpenSeams(value);
  if (
    ownOpenSeams.length === 0
    || unretainedEvaluationOpenSeams(value, openSeams).length > 0
  ) {
    return false;
  }
  const ownSummaries = new Set(ownOpenSeams.map((seam) => seam.summary));
  if (openSummaries.some((summary) => !ownSummaries.has(summary))) {
    return false;
  }
  const ownReasonKinds = new Set(openSeamReasonKindsForEvaluationRead({
    value,
    openSeams: ownOpenSeams,
    abruptCompletion: null,
  }));
  return openReasonKinds.every((reasonKind) => ownReasonKinds.has(reasonKind));
}

/**
 * Carries input pressure through a derived binding-source result without discarding a usable value.
 *
 * Callers decide whether a source value is sufficient to perform the operation. This helper only composes the
 * epistemic envelope after that operation, matching the evaluator and DI rule that value presence and closure are
 * independent facts.
 */
export function bindingSourceValueEvaluationWithPressure(
  result: RuntimeBindingSourceValueEvaluation,
  sources: readonly RuntimeBindingSourceValueEvaluation[],
): RuntimeBindingSourceValueEvaluation {
  const sourcePressure = sources.flatMap((source) => {
    if (source.closure !== RuntimeBindingSourceValueEvaluationClosure.Open) {
      return [];
    }
    if (
      result.value == null
      || source.abruptCompletion != null
      || source.openSeams.length === 0
    ) {
      return [{ source, openSeams: source.openSeams }];
    }
    const openSeams = unretainedEvaluationOpenSeams(result.value, source.openSeams);
    return openSeams.length === 0 ? [] : [{ source, openSeams }];
  });
  const pressured = result.closure === RuntimeBindingSourceValueEvaluationClosure.Open
    ? [{ source: result, openSeams: result.openSeams }, ...sourcePressure]
    : sourcePressure;
  if (pressured.length === 0) {
    return result;
  }
  return bindingSourceValueEvaluationResult(
    result.value,
    pressured.flatMap(({ source }) => source.openReason == null ? [] : [source.openReason]),
    pressured.find(({ source }) => source.abruptCompletion != null)?.source.abruptCompletion ?? null,
    pressured.flatMap(({ source }) => source.openReasonKinds),
    pressured.flatMap(({ openSeams }) => openSeams),
  );
}

/** Converts EvaluationRead/StaticExpressionEvaluationResult-shaped evidence without rebuilding causes per consumer. */
export function bindingSourceValueEvaluationForRead(
  read: {
    readonly value: EvaluationValue | null;
    readonly openSeams: readonly EvaluationOpenSeam[];
    readonly abruptCompletion: EvaluationAbruptCompletion | null;
  },
  additionalOpenSummaries: readonly string[] = [],
  additionalOpenReasonKinds: readonly OpenSeamReasonKind[] = [],
): RuntimeBindingSourceValueEvaluation {
  return bindingSourceValueEvaluationResult(
    read.value,
    [...additionalOpenSummaries, ...read.openSeams.map((seam) => seam.summary)],
    read.abruptCompletion,
    [
      ...additionalOpenReasonKinds,
      ...openSeamReasonKindsForEvaluationRead(read),
    ],
    read.openSeams,
  );
}

export function openBindingSourceSlotNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
  );
}

export function openBindingSourceMemberNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
  );
}

export function openBindingSourceUnsupportedExpression(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  );
}
