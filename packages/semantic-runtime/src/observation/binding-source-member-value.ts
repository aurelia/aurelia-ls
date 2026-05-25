import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import {
  readStaticValueElement,
  readStaticValueProperty,
  foldStaticValueMemberRead,
  type StaticValueMemberRead,
} from '../evaluation/property-access.js';
import type { EvaluationValue } from '../evaluation/values.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { RuntimeBindingSourceEvaluationFrame } from './binding-source-evaluation-frame.js';
import {
  bindingSourceValueEvaluationResult,
  openBindingSourceMemberNoStaticValue,
  RuntimeBindingSourceValueEvaluation,
} from './binding-source-value-evaluation.js';

/** Binding-source member reads over static evaluator values and source-independent host boundaries. */
export class RuntimeBindingSourceMemberValueReader {
  constructor(
    private readonly evaluationFrame: RuntimeBindingSourceEvaluationFrame,
  ) {}

  property(
    receiver: EvaluationValue,
    propertyName: string,
    openSummaries: readonly string[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(receiver);
    if (source != null) {
      const read = this.evaluationFrame.readPropertyValue(
        source,
        receiver,
        propertyName,
        receiver.node ?? source.sourceFile,
      );
      return bindingSourceValueEvaluationResult(read.value, [
        ...openSummaries,
        ...read.openSeams.map((seam) => seam.summary),
      ]);
    }
    return this.sourceIndependent(
      readStaticValueProperty(receiver, propertyName, null),
      `property '${propertyName}'`,
      openSummaries,
    );
  }

  element(
    receiver: EvaluationValue,
    key: EvaluationValue,
    openSummaries: readonly string[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    const source = this.evaluationFrame.sourceForValue(receiver);
    if (source != null) {
      const read = this.evaluationFrame.readElementValue(
        source,
        receiver,
        key,
        receiver.node ?? key.node ?? source.sourceFile,
      );
      return bindingSourceValueEvaluationResult(read.value, [
        ...openSummaries,
        ...read.openSeams.map((seam) => seam.summary),
      ]);
    }
    return this.sourceIndependent(
      readStaticValueElement(receiver, key, null),
      `keyed member '${key.kind}'`,
      openSummaries,
    );
  }

  private sourceIndependent(
    read: StaticValueMemberRead,
    label: string,
    openSummaries: readonly string[],
  ): RuntimeBindingSourceValueEvaluation {
    return foldStaticValueMemberRead(read, {
      value: (value) => bindingSourceValueEvaluationResult(value, openSummaries),
      getter: () => openBindingSourceMemberNoStaticValue(
        `Source-value ${label} selected a getter without an evaluated source module.`,
      ),
      open: (reason, seamKind) => RuntimeBindingSourceValueEvaluation.open(
        [...openSummaries, reason].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
        [seamKind === EvaluationOpenSeamKind.UnsupportedExpression
          ? OpenSeamReasonKind.BindingSourceUnsupportedExpression
          : OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
      ),
    });
  }
}
