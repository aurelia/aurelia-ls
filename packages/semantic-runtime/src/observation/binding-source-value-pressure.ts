import {
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
} from '../configuration/binding-source-value-evaluation.js';
import {
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  evaluationOpenSeamDefaultReasonKinds,
  type EvaluationOpenSeam,
} from '../evaluation/seams.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import type {
  OpenSeamReasonKind,
  OpenSeamReasonSource,
} from '../kernel/open-seam.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import {
  sourceAddressForRuntimeExpressionBounds,
} from '../template/runtime-expression-source-address.js';
import type { RuntimeBindingSourceValueEvaluator } from './binding-source-value-evaluator.js';

/** Kernel-facing projection of evaluator-local pressure retained by one or more binding-source reads. */
export class RuntimeBindingSourceValuePressureProjection {
  constructor(
    readonly evaluations: readonly RuntimeBindingSourceValueEvaluation[],
    readonly summary: string | null,
    readonly reasonKinds: readonly OpenSeamReasonKind[],
    readonly reasonSources: readonly OpenSeamReasonSource[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  get isOpen(): boolean {
    return this.evaluations.length > 0;
  }
}

/**
 * Projects evaluator-local nodes into durable source addresses without collapsing the binding-site fallback.
 * Domain consumers still decide whether the pressure blocks, qualifies, or merely annotates their product.
 */
export function projectRuntimeBindingSourceValuePressure(
  store: KernelPublicationContext,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  evaluations: readonly RuntimeBindingSourceValueEvaluation[],
  fallbackSourceAddressHandle: AddressHandle | null,
  localKey: string,
): RuntimeBindingSourceValuePressureProjection {
  const pressured = compactBindingSourceEvaluationPressure(evaluations);
  if (pressured.length === 0) {
    return new RuntimeBindingSourceValuePressureProjection([], null, [], [], []);
  }

  const records: KernelStoreRecord[] = [];
  const reasonSources: OpenSeamReasonSource[] = [];
  for (const evaluation of pressured) {
    const sourcedReasonKinds = new Set<OpenSeamReasonKind>();
    for (const cause of evaluationValueBoundaryCauses(evaluation.value)) {
      const addressHandle = sourceValueEvaluator == null
        ? null
        : sourceAddressForEvaluationNode(store, sourceValueEvaluator, cause.node, localKey, records);
      sourcedReasonKinds.add(cause.reasonKind);
      reasonSources.push({
        reasonKind: cause.reasonKind,
        summary: cause.summary,
        addressHandle: addressHandle ?? fallbackSourceAddressHandle,
      });
    }
    for (const seam of evaluation.openSeams) {
      const addressHandle = sourceValueEvaluator == null
        ? null
        : sourceAddressForEvaluationNode(store, sourceValueEvaluator, seam.node, localKey, records);
      const seamReasonKinds = uniqueReasonKinds([
        ...evaluationOpenSeamDefaultReasonKinds(seam.seamKind),
        ...seam.reasonKinds,
      ]);
      for (const reasonKind of seamReasonKinds) {
        sourcedReasonKinds.add(reasonKind);
        reasonSources.push({
          reasonKind,
          summary: seam.summary,
          addressHandle: addressHandle ?? fallbackSourceAddressHandle,
        });
      }
    }
    for (const reasonKind of evaluation.openReasonKinds) {
      if (sourcedReasonKinds.has(reasonKind)) {
        continue;
      }
      reasonSources.push({
        reasonKind,
        summary: evaluation.openReason ?? 'The binding-source value retained unresolved pressure.',
        addressHandle: fallbackSourceAddressHandle,
      });
    }
  }

  return new RuntimeBindingSourceValuePressureProjection(
    pressured,
    compactText(pressured.flatMap((evaluation) => evaluation.openReason == null ? [] : [evaluation.openReason])),
    uniqueReasonKinds(pressured.flatMap((evaluation) => evaluation.openReasonKinds)),
    uniqueReasonSources(reasonSources),
    records,
  );
}

interface EvaluationBoundaryCause {
  readonly node: EvaluationOpenSeam['node'];
  readonly reasonKind: OpenSeamReasonKind;
  readonly summary: string;
}

function evaluationValueBoundaryCauses(
  value: EvaluationValue | null,
): readonly EvaluationBoundaryCause[] {
  if (value == null) {
    return [];
  }
  switch (value.kind) {
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.BoundaryObject:
      return value.node == null
        ? []
        : [{
            node: value.node,
            reasonKind: openSeamReasonKindForEvaluationBoundary(value.boundaryKind),
            summary: `${value.path} is retained as a ${value.boundaryKind} boundary.`,
          }];
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Array:
      return value.uncertainties.flatMap((uncertainty) =>
        uncertainty.node == null || uncertainty.boundaryKind == null
          ? []
          : [{
              node: uncertainty.node,
              reasonKind: openSeamReasonKindForEvaluationBoundary(uncertainty.boundaryKind),
              summary: uncertainty.boundaryPath == null
                ? `The ${value.kind} value retains a ${uncertainty.boundaryKind} uncertainty.`
                : `The ${value.kind} value retains uncertainty from ${uncertainty.boundaryPath}.`,
            }]
      );
    case EvaluationValueKind.StringPattern:
      return value.holes.flatMap((hole) => hole.value.node == null
        ? []
        : [{
            node: hole.value.node,
            reasonKind: openSeamReasonKindForEvaluationBoundary(hole.value.boundaryKind),
            summary: hole.value.reason,
          }]);
    default:
      return [];
  }
}

function sourceAddressForEvaluationNode(
  store: KernelPublicationContext,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  node: EvaluationOpenSeam['node'],
  localKey: string,
  records: KernelStoreRecord[],
): AddressHandle | null {
  const source = sourceValueEvaluator.readEvaluatedSourceForNode(node);
  if (source == null) {
    return null;
  }
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.end;
  const address = sourceAddressForRuntimeExpressionBounds(
    store,
    `${localKey}:${source.admission.addressHandle}:${start}:${end}`,
    source.admission.addressHandle,
    start,
    end,
    SourceSpanRole.Value,
  );
  pushUniqueKernelRecords(records, address.records);
  return address.handle;
}

function compactBindingSourceEvaluationPressure(
  evaluations: readonly RuntimeBindingSourceValueEvaluation[],
): readonly RuntimeBindingSourceValueEvaluation[] {
  const seen = new Set<RuntimeBindingSourceValueEvaluation>();
  return evaluations.filter((evaluation) => {
    if (
      evaluation.closure !== RuntimeBindingSourceValueEvaluationClosure.Open
      || seen.has(evaluation)
    ) {
      return false;
    }
    seen.add(evaluation);
    return true;
  });
}

function pushUniqueKernelRecords(
  target: KernelStoreRecord[],
  candidates: readonly KernelStoreRecord[],
): void {
  const handles = new Set(target.map((record) => record.handle));
  for (const candidate of candidates) {
    if (handles.has(candidate.handle)) {
      continue;
    }
    handles.add(candidate.handle);
    target.push(candidate);
  }
}

function compactText(values: readonly string[]): string | null {
  const compact = [...new Set(values.filter((value) => value.length > 0))];
  return compact.length === 0 ? null : compact.join(' ');
}

function uniqueReasonKinds(values: readonly OpenSeamReasonKind[]): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function uniqueReasonSources(values: readonly OpenSeamReasonSource[]): readonly OpenSeamReasonSource[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.reasonKind}:${value.addressHandle ?? 'no-source'}:${value.summary}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
