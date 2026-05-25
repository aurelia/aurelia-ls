import type { CheckerTypeReference } from '../type-system/type-shape.js';
import {
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  type RuntimeBindingValueChannel,
} from './runtime-binding-observation.js';
import {
  bindingValueChannelMutatesCollection,
} from './binding-data-flow-assignability.js';
import {
  bindingDataFlowDirectionIncludesTargetToSource,
} from './binding-data-flow-direction.js';
import {
  SourceWriteCapabilityKind,
  type SourceWriteCapability,
} from './binding-source-write-capability.js';

/** Source-assignment policy derived after binding direction, observer channel, source-write, and TypeChecker facts. */
export type BindingDataFlowSourceAssignment = {
  readonly kind: RuntimeBindingDataFlowSourceAssignmentKind | null;
  readonly reason: string | null;
  readonly reasonKinds: readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[];
};

/** Classifies whether target-to-source binding flow can write the authored source slot or collection. */
export function sourceAssignmentForDataFlow(input: {
  readonly direction: RuntimeBindingDataFlowDirection;
  readonly sourceWriteCapability: SourceWriteCapability | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly valueChannel: RuntimeBindingValueChannel | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
}): BindingDataFlowSourceAssignment {
  if (!bindingDataFlowDirectionIncludesTargetToSource(input.direction)
    || bindingValueChannelMutatesCollection(input.valueChannel)) {
    return { kind: null, reason: null, reasonKinds: [] };
  }
  const sourceWriteCapability = input.sourceWriteCapability;
  if (sourceWriteCapability == null) {
    return {
      kind: RuntimeBindingDataFlowSourceAssignmentKind.Open,
      reason: 'Target-to-source data flow did not request source write capability.',
      reasonKinds: [],
    };
  }
  switch (sourceWriteCapability.capabilityKind) {
    case SourceWriteCapabilityKind.Writable:
      return sourceAssignmentForWritableCapability(input);
    case SourceWriteCapabilityKind.TypeScriptStrictness:
      return sourceAssignmentForStrictCapability(input, sourceWriteCapability);
    case SourceWriteCapabilityKind.RuntimeUnassignable:
      return {
        kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeUnassignable,
        reason: sourceWriteCapability.reason,
        reasonKinds: compactReasonKinds([sourceWriteCapability.reasonKind]),
      };
    case SourceWriteCapabilityKind.Open:
      return {
        kind: RuntimeBindingDataFlowSourceAssignmentKind.Open,
        reason: sourceWriteCapability.reason,
        reasonKinds: compactReasonKinds([sourceWriteCapability.reasonKind]),
      };
  }
}

function sourceAssignmentForWritableCapability(input: {
  readonly targetToSourceAssignable: boolean | null;
  readonly sourceAssignmentValueType: CheckerTypeReference | null;
  readonly targetToSourceValueType: CheckerTypeReference | null;
}): BindingDataFlowSourceAssignment {
  const typeReason = targetToSourceStrictnessReason(
    input.targetToSourceAssignable,
    input.targetToSourceValueType,
    input.sourceAssignmentValueType,
  );
  return typeReason == null
    ? { kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignable, reason: null, reasonKinds: [] }
    : {
      kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness,
      reason: typeReason.reason,
      reasonKinds: [typeReason.kind],
    };
}

function sourceAssignmentForStrictCapability(
  input: {
    readonly targetToSourceAssignable: boolean | null;
    readonly sourceAssignmentValueType: CheckerTypeReference | null;
    readonly targetToSourceValueType: CheckerTypeReference | null;
  },
  sourceWriteCapability: SourceWriteCapability,
): BindingDataFlowSourceAssignment {
  const typeReason = targetToSourceStrictnessReason(
    input.targetToSourceAssignable,
    input.targetToSourceValueType,
    input.sourceAssignmentValueType,
  );
  const reasons = compactStrings([
    sourceWriteCapability.reason,
    typeReason?.reason,
  ]);
  return {
    kind: RuntimeBindingDataFlowSourceAssignmentKind.RuntimeAssignableWithTypeScriptStrictness,
    reason: reasons.join(' '),
    reasonKinds: compactReasonKinds([
      sourceWriteCapability.reasonKind,
      typeReason?.kind,
    ]),
  };
}

function targetToSourceStrictnessReason(
  targetToSourceAssignable: boolean | null,
  targetToSourceValueType: CheckerTypeReference | null,
  sourceAssignmentValueType: CheckerTypeReference | null,
): { readonly kind: RuntimeBindingDataFlowSourceAssignmentReasonKind; readonly reason: string } | null {
  return targetToSourceAssignable === false
    ? {
      kind: RuntimeBindingDataFlowSourceAssignmentReasonKind.TargetToSourceTypeMismatch,
      reason: `TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (${typeDisplay(targetToSourceValueType)} -> ${typeDisplay(sourceAssignmentValueType)}); Aurelia runtime still passes the observer value to astAssign.`,
    }
    : null;
}

function typeDisplay(reference: CheckerTypeReference | null): string {
  return reference?.display ?? 'unknown';
}

function compactStrings(values: readonly (string | null | undefined)[]): readonly string[] {
  return values.filter((value): value is string => value != null && value.length > 0);
}

function compactReasonKinds(
  values: readonly (RuntimeBindingDataFlowSourceAssignmentReasonKind | null | undefined)[],
): readonly RuntimeBindingDataFlowSourceAssignmentReasonKind[] {
  return [...new Set(values.filter((value): value is RuntimeBindingDataFlowSourceAssignmentReasonKind => value != null))];
}
