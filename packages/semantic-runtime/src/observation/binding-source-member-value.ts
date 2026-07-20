import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import { openSeamReasonKindsForEvaluationRead } from '../evaluation/boundary-open-reason.js';
import {
  readStaticValueElement,
  readStaticValueProperty,
  foldStaticValueMemberRead,
  StaticValueMemberReadKind,
  type StaticValueMemberRead,
} from '../evaluation/property-access.js';
import type { EvaluationValue } from '../evaluation/values.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { RuntimeBindingSourceEvaluationFrame } from './binding-source-evaluation-frame.js';
import {
  bindingSourceValueEvaluationForRead,
  bindingSourceValueEvaluationResult,
  RuntimeBindingSourceValueEvaluation,
} from '../configuration/binding-source-value-evaluation.js';

/** Binding-source member reads over static evaluator values and source-independent host boundaries. */
export class RuntimeBindingSourceMemberValueReader {
  constructor(
    private readonly evaluationFrame: RuntimeBindingSourceEvaluationFrame,
  ) {}

  property(
    receiver: EvaluationValue,
    propertyName: string,
    openSummaries: readonly string[] = [],
    openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(receiver);
    const memberRead = readStaticValueProperty(receiver, propertyName, null);
    if (source != null && memberRead.kind === StaticValueMemberReadKind.Getter) {
      const read = this.evaluationFrame.readPropertyValue(
        source,
        receiver,
        propertyName,
        receiver.node ?? source.sourceFile,
      );
      return bindingSourceValueEvaluationForRead(read, openSummaries, openReasonKinds);
    }
    return this.sourceIndependent(
      memberRead,
      `property '${propertyName}'`,
      openSummaries,
      openReasonKinds,
    );
  }

  element(
    receiver: EvaluationValue,
    key: EvaluationValue,
    openSummaries: readonly string[] = [],
    openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(receiver);
    const memberRead = readStaticValueElement(receiver, key, null);
    if (source != null && memberRead.kind === StaticValueMemberReadKind.Getter) {
      const read = this.evaluationFrame.readElementValue(
        source,
        receiver,
        key,
        receiver.node ?? key.node ?? source.sourceFile,
      );
      return bindingSourceValueEvaluationForRead(read, openSummaries, openReasonKinds);
    }
    return this.sourceIndependent(
      memberRead,
      `keyed member '${key.kind}'`,
      openSummaries,
      openReasonKinds,
    );
  }

  private sourceIndependent(
    read: StaticValueMemberRead,
    label: string,
    openSummaries: readonly string[],
    openReasonKinds: readonly OpenSeamReasonKind[],
  ): RuntimeBindingSourceValueEvaluation {
    return foldStaticValueMemberRead(read, {
      value: (value, memberOpenSeams) => bindingSourceValueEvaluationResult(
        value,
        [...openSummaries, ...memberOpenSeams.map((seam) => seam.summary)],
        null,
        [...openReasonKinds, ...reasonKindsForOpenSeams(memberOpenSeams)],
        memberOpenSeams,
      ),
      candidate: (value, memberOpenSeams) => bindingSourceValueEvaluationResult(
        value,
        [...openSummaries, ...memberOpenSeams.map((seam) => seam.summary)],
        null,
        [...openReasonKinds, ...reasonKindsForOpenSeams(memberOpenSeams)],
        memberOpenSeams,
      ),
      getter: (_getter, _thisValue, memberOpenSeams) => bindingSourceValueEvaluationResult(
        null,
        [
          ...openSummaries,
          ...memberOpenSeams.map((seam) => seam.summary),
          `Source-value ${label} selected a getter without an evaluated source module.`,
        ],
        null,
        [
          ...openReasonKinds,
          ...reasonKindsForOpenSeams(memberOpenSeams),
          OpenSeamReasonKind.BindingSourceMemberNoStaticValue,
        ],
        memberOpenSeams,
      ),
      open: (reason, seamKind, memberReasonKinds, memberOpenSeams) => bindingSourceValueEvaluationResult(
        null,
        [
          ...openSummaries,
          ...memberOpenSeams.map((seam) => seam.summary),
          reason,
        ],
        null,
        [
          ...openReasonKinds,
          ...memberReasonKinds,
          ...reasonKindsForOpenSeams(memberOpenSeams),
          seamKind === EvaluationOpenSeamKind.UnsupportedExpression
            ? OpenSeamReasonKind.BindingSourceUnsupportedExpression
            : OpenSeamReasonKind.BindingSourceMemberNoStaticValue,
        ],
        memberOpenSeams,
      ),
    });
  }
}

function reasonKindsForOpenSeams(
  openSeams: StaticValueMemberRead['openSeams'],
): readonly OpenSeamReasonKind[] {
  return openSeamReasonKindsForEvaluationRead({
    value: null,
    openSeams,
    abruptCompletion: null,
  });
}
