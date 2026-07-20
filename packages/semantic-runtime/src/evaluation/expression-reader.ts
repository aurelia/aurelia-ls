import ts from 'typescript';
import type { EvaluationExpressionAbruptCompletion } from './completion.js';
import { openSeamReasonKindsForEvaluationRead } from './boundary-open-reason.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  readReferenceName,
  unwrapExpression,
} from './ts-syntax.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
  type StaticModuleEvaluationResult,
} from './evaluator.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
} from './seams.js';
import {
  readStaticOwnProperty,
} from './property-access.js';
import {
  EvaluationValueKind,
  type EvaluationInstanceValue,
  type EvaluationValue,
} from './values.js';

export class EvaluationRead<TValue> {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    /** Value that closed, or null when the read stayed open. */
    readonly value: TValue | null,
    /** Source node that best explains this read. */
    readonly node: ts.Node | null,
    /** Evaluator seams observed while producing this read. */
    openSeams: readonly EvaluationOpenSeam[] = [],
    /** Abrupt ECMAScript completion produced while reading the expression, when one occurred. */
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export const enum EvaluationTargetResolutionKind {
  /** Evaluation proved a class declaration that owns the target identity. */
  ResolvedDeclaration = 'resolved-declaration',
  /** Evaluation closed normally to a value that is not a resource target. */
  ClosedNonTarget = 'closed-non-target',
  /** Evaluation pressure prevented a trustworthy target decision. */
  Unresolved = 'unresolved',
}

export class EvaluationTargetRead {
  constructor(
    readonly resolutionKind: EvaluationTargetResolutionKind,
    readonly localName: string | null,
    /** Exact authored target token or expression. */
    readonly node: ts.Node,
    /** Full declaration that owns the target, when static evaluation proved one. */
    readonly declarationNode: ts.Declaration | null,
    readonly openSeams: readonly EvaluationOpenSeam[] = [],
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
    /** Machine-readable evaluator pressure, including boundary values that do not emit evaluator seams. */
    readonly openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}
}

/** Minimal evaluator-backed expression read surface accepted by semantic indexes. */
export interface StaticExpressionEvaluationReader {
  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue>;
}

/** Generic expression reader over an already-built module environment. */
export class StaticEvaluationExpressionReader implements StaticExpressionEvaluationReader {
  private evaluator: StaticEvaluator | null = null;

  constructor(
    readonly environment: ModuleEnvironmentRecord,
    readonly moduleKey: string,
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
  ) {}

  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue> {
    const result = this.evaluatorForReader().evaluateExpressionInEnvironment(expression, this.environment, this.moduleKey);
    return new EvaluationRead(result.value, expression, result.openSeams, result.abruptCompletion);
  }

  readObjectProperty(
    expression: ts.Expression,
    propertyName: string,
  ): EvaluationRead<EvaluationValue> {
    const result = this.evaluateExpression(expression);
    const value = result.value;
    if (result.abruptCompletion != null) {
      return new EvaluationRead<EvaluationValue>(null, expression, result.openSeams, result.abruptCompletion);
    }
    if (
      value?.kind !== EvaluationValueKind.Object
      && value?.kind !== EvaluationValueKind.BoundaryObject
      && value?.kind !== EvaluationValueKind.Instance
    ) {
      return new EvaluationRead<EvaluationValue>(null, expression, result.openSeams);
    }
    const propertyResult = this.evaluatorForReader().evaluatePropertyValue(
      value,
      propertyName,
      this.moduleKey,
      expression,
    );
    const property = readStaticOwnProperty(value, propertyName);
    const propertyValue = property == null
      && propertyResult.value?.kind === EvaluationValueKind.Undefined
      ? null
      : propertyResult.value;
    return new EvaluationRead(
      propertyValue,
      property?.node ?? propertyValue?.node ?? value.node ?? expression,
      [...result.openSeams, ...propertyResult.openSeams],
      propertyResult.abruptCompletion,
    );
  }

  readExpressionTarget(expression: ts.Expression): EvaluationTargetRead {
    const result = this.evaluateExpression(expression);
    const value = result.value;
    const openReasonKinds = openSeamReasonKindsForEvaluationRead(result);
    if (value?.kind === EvaluationValueKind.Class || value?.kind === EvaluationValueKind.Instance) {
      return readClassTarget(
        classDeclarationForTargetValue(value),
        result.openSeams,
        result.abruptCompletion,
        openReasonKinds,
      );
    }
    return readSyntaxTarget(
      expression,
      openReasonKinds.length === 0
        ? EvaluationTargetResolutionKind.ClosedNonTarget
        : EvaluationTargetResolutionKind.Unresolved,
      result.openSeams,
      result.abruptCompletion,
      openReasonKinds,
    );
  }

  private evaluatorForReader(): StaticEvaluator {
    this.evaluator ??= new StaticEvaluator(this.policy, this.runtimeHost);
    return this.evaluator;
  }
}

/**
 * Expression reader that spends the call-time environment of an executed call when one owns the queried expression.
 *
 * A module's final environment is still the honest fallback for declaration-oriented source inspection. Replaying an
 * executed call against that final environment is not: a later assignment can change the receiver, key, or option
 * value. Static module evaluation retains those lexical snapshots, and this reader keeps the selection in one place.
 */
export class StaticModuleEvaluationExpressionReader implements StaticExpressionEvaluationReader {
  private readonly environmentsByCall = new Map<ts.CallExpression, ModuleEnvironmentRecord>();
  private readonly readersByEnvironment = new WeakMap<ModuleEnvironmentRecord, StaticEvaluationExpressionReader>();

  constructor(
    private readonly evaluation: StaticModuleEvaluationResult,
  ) {
    for (const call of evaluation.executedCalls) {
      this.environmentsByCall.set(call.expression, call.environment);
    }
  }

  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue> {
    return this.readerFor(expression).evaluateExpression(expression);
  }

  private readerFor(node: ts.Node): StaticEvaluationExpressionReader {
    const environment = this.callEnvironmentFor(node) ?? this.evaluation.environment;
    let reader = this.readersByEnvironment.get(environment);
    if (reader == null) {
      reader = new StaticEvaluationExpressionReader(
        environment,
        this.evaluation.moduleKey,
        this.evaluation.policy,
        this.evaluation.runtimeHost,
      );
      this.readersByEnvironment.set(environment, reader);
    }
    return reader;
  }

  private callEnvironmentFor(node: ts.Node): ModuleEnvironmentRecord | null {
    let current: ts.Node | undefined = node;
    while (current != null && !ts.isSourceFile(current)) {
      if (ts.isCallExpression(current)) {
        const environment = this.environmentsByCall.get(current);
        if (environment != null) {
          return environment;
        }
      }
      current = current.parent;
    }
    return null;
  }
}

export function readClassTarget(
  classNode: ts.ClassLikeDeclarationBase,
  openSeams: readonly EvaluationOpenSeam[] = [],
  abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
  openReasonKinds: readonly OpenSeamReasonKind[] = [],
): EvaluationTargetRead {
  return new EvaluationTargetRead(
    EvaluationTargetResolutionKind.ResolvedDeclaration,
    classNode.name?.text ?? null,
    classNode.name ?? classNode,
    classNode,
    openSeams,
    abruptCompletion,
    openReasonKinds,
  );
}

export function readSyntaxTarget(
  expression: ts.Expression,
  resolutionKind: EvaluationTargetResolutionKind,
  openSeams: readonly EvaluationOpenSeam[] = [],
  abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
  openReasonKinds: readonly OpenSeamReasonKind[] = [],
): EvaluationTargetRead {
  const current = unwrapExpression(expression);
  return new EvaluationTargetRead(
    resolutionKind,
    readReferenceName(current),
    current,
    null,
    openSeams,
    abruptCompletion,
    openReasonKinds,
  );
}

export function readStaticStringValue(
  value: EvaluationValue,
): string | null {
  switch (value.kind) {
    case EvaluationValueKind.String:
      return value.value;
    case EvaluationValueKind.StringPattern:
      return null;
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return null;
  }
}

export interface StaticStringArrayEntryRead {
  readonly value: string;
  /** Directly authored literal for this value inside the owning expression, when one exists. */
  readonly valueNode: ts.StringLiteralLike | null;
}

/**
 * Retain exact editable literals while reading a statically closed string array.
 *
 * Evaluated values can originate outside the expression that consumes them. Such values remain semantically useful,
 * but their source is not an owned field token and must not masquerade as one for rename or diagnostics.
 */
export function readStaticStringArrayEntries(
  value: EvaluationValue,
  owningNode: ts.Node | null,
): readonly StaticStringArrayEntryRead[] | null {
  if (value.kind !== EvaluationValueKind.Array || value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
    return null;
  }
  const result: StaticStringArrayEntryRead[] = [];
  for (const element of value.elements) {
    const stringValue = readStaticStringValue(element.value);
    if (stringValue == null) {
      return null;
    }
    result.push({
      value: stringValue,
      valueNode: authoredStringLiteralNode(element.value, element.expression, owningNode),
    });
  }
  return result;
}

/** Read the directly authored literal that owns a statically evaluated string value. */
export function authoredStringLiteralNode(
  value: EvaluationValue,
  expression: ts.Node | null,
  owningNode: ts.Node | null,
): ts.StringLiteralLike | null {
  const candidates = [
    value.kind === EvaluationValueKind.String ? value.node : null,
    expression,
  ];
  for (const candidate of candidates) {
    if (
      candidate != null
      && ts.isStringLiteralLike(candidate)
      && (owningNode == null || nodeBelongsTo(candidate, owningNode))
    ) {
      return candidate;
    }
  }
  return null;
}

function nodeBelongsTo(
  node: ts.Node,
  owner: ts.Node,
): boolean {
  let current: ts.Node | undefined = node;
  while (current != null) {
    if (current === owner) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function classDeclarationForTargetValue(value: EvaluationInstanceValue | Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Class }>): ts.ClassLikeDeclarationBase {
  return value.kind === EvaluationValueKind.Instance
    ? value.classValue.declaration
    : value.declaration;
}

export function readStaticStringArrayValue(
  value: EvaluationValue,
): readonly string[] | null {
  return readStaticStringArrayEntries(value, null)?.map((entry) => entry.value) ?? null;
}
