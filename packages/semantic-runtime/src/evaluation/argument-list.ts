import ts from 'typescript';

import type { ModuleEnvironmentRecord } from './environment.js';
import {
  evaluationArrayIteratorElements,
} from './array-value-operations.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayUncertaintyKind,
  EvaluationArrayValue,
  EvaluationStringValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationArrayUncertainty,
  type EvaluationValue,
} from './values.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  EvaluationValueEvidence,
} from './value-pressure.js';

export interface StaticArgumentListEvaluationHost {
  readonly maxSpreadIterations: number;

  evaluateExpressionEvidence(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValueEvidence;

  openSpread(
    reason: string,
    node: ts.Node,
    moduleKey: string,
  ): readonly EvaluationOpenSeam[];
}

export const enum EvaluationArgumentListOutcome {
  /** Argument evaluation and spread iteration definitely reach the invocation operation. */
  ReachedInvocation = 'reached-invocation',
  /** An open spread prevents proving that control reaches the invocation operation. */
  OpenBeforeInvocation = 'open-before-invocation',
}

/** One authored argument expression and the evidence produced before spread expansion. */
export class EvaluationAuthoredArgument {
  constructor(
    /** Full authored argument node, including `...` for a spread argument. */
    readonly node: ts.Expression,
    /** Expression whose value was evaluated for this argument. */
    readonly valueExpression: ts.Expression,
    readonly evidence: EvaluationValueEvidence,
  ) {}
}

/** One reached ECMAScript argument-list phase, including iterator-based spread expansion and its closure state. */
export class EvaluationArgumentList {
  constructor(
    /** Authored argument values before any spread expansion. */
    readonly authoredArguments: readonly EvaluationAuthoredArgument[],
    /** Runtime positional values after spread expansion. */
    readonly elements: readonly EvaluationArrayElement[],
    readonly shape: EvaluationArrayShape,
    readonly outcome: EvaluationArgumentListOutcome,
  ) {}

  /** Pressure from both argument evaluation and positional/iterator uncertainty. */
  get aggregateOpenSeams(): readonly EvaluationOpenSeam[] {
    return compactEvaluationOpenSeams([
      ...this.authoredArguments.flatMap((argument) => argument.evidence.openSeams),
      ...this.elements.flatMap((element) => element.openSeams),
      ...this.shape.aggregateOpenSeams,
    ]);
  }

  /** Exact positional arguments, or null when arity/order cannot safely drive a call. */
  exactEvidence(): readonly EvaluationValueEvidence[] | null {
    if (
      !this.shape.hasExactPositions
      || this.shape.exactLength !== this.elements.length
      || this.elements.some((element, index) => element.runtimeIndex !== index)
    ) {
      return null;
    }
    return this.elements.map((element) =>
      new EvaluationValueEvidence(element.value, element.openSeams)
    );
  }
}

/** Evaluate authored arguments left-to-right until spread continuation no longer closes. */
export function evaluateStaticArgumentList(
  args: readonly ts.Expression[],
  environment: ModuleEnvironmentRecord,
  moduleKey: string,
  depth: number,
  host: StaticArgumentListEvaluationHost,
): EvaluationArgumentList {
  const authoredArguments: EvaluationAuthoredArgument[] = [];
  const elements: EvaluationArrayElement[] = [];
  let exactLength: number | null = 0;
  let hasExactElements = true;
  let hasExactOrder = true;
  let outcome = EvaluationArgumentListOutcome.ReachedInvocation;
  const uncertainties: EvaluationArrayUncertainty[] = [];
  const extentOpenSeams: EvaluationOpenSeam[] = [];
  const elementOpenSeams: EvaluationOpenSeam[] = [];
  const orderOpenSeams: EvaluationOpenSeam[] = [];

  for (const argument of args) {
    const expression = ts.isSpreadElement(argument) ? argument.expression : argument;
    const evidence = host.evaluateExpressionEvidence(expression, environment, moduleKey, depth + 1);
    authoredArguments.push(new EvaluationAuthoredArgument(argument, expression, evidence));
    if (!ts.isSpreadElement(argument)) {
      elements.push(new EvaluationArrayElement(evidence.value, argument, evidence.openSeams, exactLength));
      exactLength = exactLength == null ? null : exactLength + 1;
      continue;
    }

    if (evidence.openSeams.length > 0) {
      exactLength = null;
      hasExactElements = false;
      extentOpenSeams.push(...evidence.openSeams);
      elementOpenSeams.push(...evidence.openSeams);
      outcome = EvaluationArgumentListOutcome.OpenBeforeInvocation;
      break;
    }

    const spread = spreadArgumentElements(
      evidence.value,
      argument,
      moduleKey,
      host,
    );
    if (spread.kind === 'open') {
      const openSeams = host.openSpread(
        spread.reason,
        argument,
        moduleKey,
      );
      const offset = exactLength;
      elements.push(...spread.elements.map((element) => element.withRuntimeIndex(
        offset == null || element.runtimeIndex == null ? null : offset + element.runtimeIndex,
      )));
      exactLength = exactLength == null || spread.exactLength == null
        ? null
        : exactLength + spread.exactLength;
      hasExactElements = false;
      hasExactOrder &&= spread.hasExactOrder;
      uncertainties.push(...spread.uncertainties);
      extentOpenSeams.push(...spread.extentOpenSeams);
      elementOpenSeams.push(...spread.elementOpenSeams, ...openSeams);
      orderOpenSeams.push(...spread.orderOpenSeams);
      if (spread.exactLength == null) {
        extentOpenSeams.push(...openSeams);
      }
      if (!spread.hasExactOrder) {
        orderOpenSeams.push(...openSeams);
      }
      if (!spread.canContinueArguments) {
        outcome = EvaluationArgumentListOutcome.OpenBeforeInvocation;
        break;
      }
      continue;
    }

    const offset = exactLength;
    elements.push(...spread.elements.map((element) => element.withRuntimeIndex(
      offset == null || element.runtimeIndex == null ? null : offset + element.runtimeIndex,
    )));
    exactLength = exactLength == null || spread.shape.exactLength == null
      ? null
      : exactLength + spread.shape.exactLength;
    hasExactElements &&= spread.shape.hasExactElements;
    hasExactOrder &&= spread.shape.hasExactOrder;
    uncertainties.push(...spread.shape.uncertainties);
    extentOpenSeams.push(...spread.shape.extentOpenSeams);
    elementOpenSeams.push(...spread.shape.elementOpenSeams);
    orderOpenSeams.push(...spread.shape.orderOpenSeams);
  }

  return new EvaluationArgumentList(
    authoredArguments,
    elements,
    EvaluationArrayShape.from({
      exactLength,
      hasExactElements,
      hasExactOrder,
      uncertainties,
      extentOpenSeams,
      elementOpenSeams,
      orderOpenSeams,
    }),
    outcome,
  );
}

function spreadArgumentElements(
  value: EvaluationValue,
  node: ts.Node,
  moduleKey: string,
  host: StaticArgumentListEvaluationHost,
): {
  readonly kind: 'known';
  readonly elements: readonly EvaluationArrayElement[];
  readonly shape: EvaluationArrayShape;
} | {
  readonly kind: 'open';
  readonly reason: string;
  readonly elements: readonly EvaluationArrayElement[];
  readonly exactLength: number | null;
  readonly hasExactOrder: boolean;
  readonly uncertainties: readonly EvaluationArrayUncertainty[];
  readonly extentOpenSeams: readonly EvaluationOpenSeam[];
  readonly elementOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
  /** Whether ECMAScript is known to continue with later authored arguments. */
  readonly canContinueArguments: boolean;
} {
  if (value.kind === EvaluationValueKind.Array) {
    if (value.exactLength == null || value.exactLength > host.maxSpreadIterations) {
      return openSpreadProjection(
        value.elements,
        value.exactLength,
        value.shape.hasExactOrder,
        value.shape.uncertainties,
        value.shape.extentOpenSeams,
        value.shape.elementOpenSeams,
        value.shape.orderOpenSeams,
        value.exactLength == null
          ? 'Argument spread array extent did not close statically.'
          : 'Argument spread exceeds the static iteration guardrail.',
        true,
      );
    }
    const elements = evaluationArrayIteratorElements(value);
    if (elements != null && value.shape.hasExactPositions) {
      return { kind: 'known', elements, shape: EvaluationArrayShape.exact(value.exactLength) };
    }
    const openSeams = value.aggregateOpenSeams.length > 0
      ? value.aggregateOpenSeams
      : host.openSpread('Argument spread array positions did not close statically.', node, moduleKey);
    return {
      kind: 'known',
      elements: openArgumentSlots(value.exactLength, node, openSeams),
      shape: EvaluationArrayShape.exact(value.exactLength),
    };
  }
  if (value.kind === EvaluationValueKind.Set) {
    if (value.weak || value.mayHaveUnknownElements || value.elements.length > host.maxSpreadIterations) {
      return openSpreadProjection(
        value.elements,
        value.mayHaveUnknownElements || value.weak ? null : value.elements.length,
        true,
        [],
        [],
        [],
        [],
        value.weak
          ? 'WeakSet values are not iterable.'
          : value.mayHaveUnknownElements
            ? 'Argument spread Set membership did not close statically.'
            : 'Argument Set spread exceeds the static iteration guardrail.',
        !value.weak,
      );
    }
    return {
      kind: 'known',
      elements: value.elements.map((element, runtimeIndex) => element.withRuntimeIndex(runtimeIndex)),
      shape: EvaluationArrayShape.exact(value.elements.length),
    };
  }
  if (value.kind === EvaluationValueKind.Map) {
    const elements = value.entries.map((entry, runtimeIndex) =>
      new EvaluationArrayElement(
        new EvaluationArrayValue([
          new EvaluationArrayElement(entry.key, entry.expression, [], 0),
          new EvaluationArrayElement(entry.value, entry.expression, [], 1),
        ], entry.expression, EvaluationArrayShape.exact(2)),
        entry.expression,
        [],
        runtimeIndex,
      )
    );
    if (value.weak || value.mayHaveUnknownEntries || elements.length > host.maxSpreadIterations) {
      return openSpreadProjection(
        elements,
        value.mayHaveUnknownEntries || value.weak ? null : elements.length,
        true,
        [],
        [],
        [],
        [],
        value.weak
          ? 'WeakMap entries are not iterable.'
          : value.mayHaveUnknownEntries
            ? 'Argument spread Map membership did not close statically.'
            : 'Argument Map spread exceeds the static iteration guardrail.',
        !value.weak,
      );
    }
    return {
      kind: 'known',
      elements,
      shape: EvaluationArrayShape.exact(elements.length),
    };
  }
  if (value.kind === EvaluationValueKind.String) {
    const characters = [...value.value];
    if (characters.length > host.maxSpreadIterations) {
      return {
        kind: 'open',
        reason: 'Argument string spread exceeds the static iteration guardrail.',
        elements: [],
        exactLength: characters.length,
        hasExactOrder: true,
        uncertainties: [],
        extentOpenSeams: [],
        elementOpenSeams: [],
        orderOpenSeams: [],
        canContinueArguments: true,
      };
    }
    return {
      kind: 'known',
      elements: characters.map((character, runtimeIndex) =>
        new EvaluationArrayElement(new EvaluationStringValue(character, node), null, [], runtimeIndex)
      ),
      shape: EvaluationArrayShape.exact(characters.length),
    };
  }
  return {
    kind: 'open',
    reason: 'Argument spread did not reduce to a statically iterable value.',
    elements: [],
    exactLength: null,
    hasExactOrder: true,
    uncertainties: [{ kind: EvaluationArrayUncertaintyKind.NonArraySpread, node }],
    extentOpenSeams: [],
    elementOpenSeams: [],
    orderOpenSeams: [],
    canContinueArguments: false,
  };
}

function openArgumentSlots(
  length: number,
  node: ts.Node,
  openSeams: readonly EvaluationOpenSeam[],
): readonly EvaluationArrayElement[] {
  return Array.from({ length }, (_, runtimeIndex) =>
    new EvaluationArrayElement(
      new EvaluationUnknownValue(
        'Argument spread element position retained open pressure.',
        node,
        true,
      ),
      ts.isExpression(node) ? node : null,
      openSeams,
      runtimeIndex,
    )
  );
}

function openSpreadProjection(
  elements: readonly EvaluationArrayElement[],
  exactLength: number | null,
  hasExactOrder: boolean,
  uncertainties: readonly EvaluationArrayUncertainty[],
  extentOpenSeams: readonly EvaluationOpenSeam[],
  elementOpenSeams: readonly EvaluationOpenSeam[],
  orderOpenSeams: readonly EvaluationOpenSeam[],
  reason: string,
  canContinueArguments: boolean,
): {
  readonly kind: 'open';
  readonly reason: string;
  readonly elements: readonly EvaluationArrayElement[];
  readonly exactLength: number | null;
  readonly hasExactOrder: boolean;
  readonly uncertainties: readonly EvaluationArrayUncertainty[];
  readonly extentOpenSeams: readonly EvaluationOpenSeam[];
  readonly elementOpenSeams: readonly EvaluationOpenSeam[];
  readonly orderOpenSeams: readonly EvaluationOpenSeam[];
  readonly canContinueArguments: boolean;
} {
  return {
    kind: 'open',
    reason,
    elements: elements.map((element) => element.withRuntimeIndex(null)),
    exactLength,
    hasExactOrder,
    uncertainties,
    extentOpenSeams,
    elementOpenSeams,
    orderOpenSeams,
    canContinueArguments,
  };
}
