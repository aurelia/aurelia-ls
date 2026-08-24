import ts from 'typescript';
import {
  EvaluationCompletionKind,
  type EvaluationExpressionAbruptCompletion,
} from './completion.js';
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
} from './evaluator.js';
import type { StaticModuleEvaluationResult } from './module-evaluation-result.js';
import {
  DefaultStaticEvaluationPolicy,
  type StaticEvaluationPolicy,
} from './policy.js';
import { DefaultStaticEvaluationRuntimeHost } from './runtime-host.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from './seams.js';
import {
  isStaticInvocationOccurrence,
  type StaticInvocationFrame,
  type StaticInvocationEvaluation,
  type StaticInvocationOccurrence,
} from './invocation.js';
import {
  readStaticOwnProperty,
} from './property-access.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefinedValue,
  EvaluationValueKind,
  type EvaluationInstanceValue,
  type EvaluationValue,
} from './values.js';
import { EvaluationValueEvidence } from './value-pressure.js';

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

/** Source-only literal reader for declarative inventories that must not replay code. */
export class StaticSourceLiteralExpressionReader implements StaticExpressionEvaluationReader {
  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue> {
    return new EvaluationRead(readStaticSourceLiteralValue(expression), expression);
  }
}

/**
 * Resolve one authored dynamic import through the module graph retained by an admitted evaluation result.
 *
 * Declarative consumers use this instead of replaying their enclosing expression: module linkage is already an
 * evaluator-owned fact, while callbacks and surrounding metadata may still be unsafe to execute speculatively.
 */
export function readStaticModuleDynamicImport(
  evaluation: StaticModuleEvaluationResult,
  call: ts.CallExpression,
  moduleSpecifier: string,
): EvaluationRead<EvaluationValue> {
  return new EvaluationRead(
    evaluation.runtimeHost.resolveDynamicImport?.(evaluation.moduleKey, moduleSpecifier, call) ?? null,
    call,
  );
}

/** Generic expression reader over an already-built module environment. */
export class StaticEvaluationExpressionReader implements StaticExpressionEvaluationReader {
  private evaluator: StaticEvaluator | null = null;

  constructor(
    readonly environment: ModuleEnvironmentRecord,
    readonly moduleKey: string,
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost = DefaultStaticEvaluationRuntimeHost,
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

/** Expression reader over a selected invocation-evidence lane without source replay. */
export class StaticInvocationEvidenceExpressionReader implements StaticExpressionEvaluationReader {
  private readonly invocationsByExpression = new Map<ts.Expression, StaticInvocationOccurrence[]>();
  private readonly invocationEvaluationsByExpression = new Map<ts.Expression, StaticInvocationEvidenceInput[]>();
  private readonly evidenceByExpression = new Map<ts.Expression, EvaluationValueEvidence[]>();

  constructor(
    private readonly moduleKey: string,
    invocationEvaluations: readonly StaticInvocationEvaluation[],
  ) {
    for (const invocation of invocationEvaluations) {
      this.indexInvocationEvidence(invocation);
    }
  }

  /** Read one live preparation only while its owning runtime-host callback is still on the stack. */
  static forPreparedFrame(
    moduleKey: string,
    frame: StaticInvocationFrame,
  ): StaticInvocationEvidenceExpressionReader {
    const reader = new StaticInvocationEvidenceExpressionReader(moduleKey, []);
    reader.indexInvocationEvidence(frame);
    return reader;
  }

  evaluateExpression(expression: ts.Expression): EvaluationRead<EvaluationValue> {
    const invocations = this.invocationsByExpression.get(expression) ?? [];
    if (invocations.length === 1) {
      return readInvocationCompletion(invocations[0]!, expression);
    }
    if (invocations.length > 1) {
      return this.openInvocationRead(
        expression,
        `Source expression was reached by ${invocations.length} invocation occurrences; no single result owns this read.`,
      );
    }

    const evidence = this.evidenceByExpression.get(expression) ?? [];
    if (evidence.length === 1) {
      return new EvaluationRead(evidence[0]!.value, expression, evidence[0]!.openSeams);
    }
    if (evidence.length > 1) {
      return this.openInvocationRead(
        expression,
        `Source expression produced evidence in ${evidence.length} invocation occurrences; no single value owns this read.`,
      );
    }

    if (this.enclosingInvocationEvaluation(expression) != null) {
      return this.openInvocationRead(
        expression,
        'Invocation evaluation did not retain immutable evidence for this nested source expression.',
      );
    }
    return this.openInvocationRead(
      expression,
      'Source expression has no retained definite execution evidence; static evaluation will not replay it against the final module environment.',
    );
  }

  private indexExpressionEvidence(
    expression: ts.Expression,
    evidence: EvaluationValueEvidence,
  ): void {
    appendMapValue(this.evidenceByExpression, expression, evidence);
    this.indexRetainedChildEvidence(evidence.value, expression, new Set());
  }

  private indexInvocationEvidence(invocation: StaticInvocationEvidenceInput): void {
    appendMapValue(this.invocationEvaluationsByExpression, invocation.node, invocation);
    if (isRetainedInvocationOccurrence(invocation)) {
      appendMapValue(this.invocationsByExpression, invocation.node, invocation);
    }
    this.indexExpressionEvidence(invocation.reference.calleeNode, invocation.reference.callee);
    if (invocation.reference.receiverNode != null && invocation.reference.thisValue != null) {
      this.indexExpressionEvidence(invocation.reference.receiverNode, invocation.reference.thisValue);
    }
    if (invocation.reference.propertyKeyNode != null
      && ts.isExpression(invocation.reference.propertyKeyNode)
      && invocation.reference.propertyKeyEvidence != null) {
      this.indexExpressionEvidence(invocation.reference.propertyKeyNode, invocation.reference.propertyKeyEvidence);
    }
    for (const argument of invocation.argumentList.authoredArguments) {
      this.indexExpressionEvidence(argument.valueExpression, argument.evidence);
      if (argument.node !== argument.valueExpression) {
        this.indexExpressionEvidence(argument.node, argument.evidence);
      }
    }
  }

  private indexRetainedChildEvidence(
    value: EvaluationValue,
    owner: ts.Expression,
    seen: Set<EvaluationValue>,
  ): void {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    switch (value.kind) {
      case EvaluationValueKind.Array:
        for (const element of value.elements) {
          if (element.expression == null || !nodeBelongsTo(element.expression, owner)) {
            continue;
          }
          const evidence = new EvaluationValueEvidence(element.value, element.openSeams);
          appendMapValue(this.evidenceByExpression, element.expression, evidence);
          this.indexRetainedChildEvidence(element.value, owner, seen);
        }
        return;
      case EvaluationValueKind.Set:
        for (const element of value.elements) {
          if (element.expression == null || !nodeBelongsTo(element.expression, owner)) {
            continue;
          }
          const evidence = new EvaluationValueEvidence(
            element.value,
            [...element.openSeams, ...element.presenceOpenSeams],
          );
          appendMapValue(this.evidenceByExpression, element.expression, evidence);
          this.indexRetainedChildEvidence(element.value, owner, seen);
        }
        return;
      case EvaluationValueKind.Map:
        for (const entry of value.entries) {
          if (entry.keyExpression != null && nodeBelongsTo(entry.keyExpression, owner)) {
            appendMapValue(
              this.evidenceByExpression,
              entry.keyExpression,
              new EvaluationValueEvidence(
                entry.key,
                [...entry.keyOpenSeams, ...entry.presenceOpenSeams],
              ),
            );
            this.indexRetainedChildEvidence(entry.key, owner, seen);
          }
          if (entry.valueExpression != null && nodeBelongsTo(entry.valueExpression, owner)) {
            appendMapValue(
              this.evidenceByExpression,
              entry.valueExpression,
              new EvaluationValueEvidence(
                entry.value,
                [...entry.valueOpenSeams, ...entry.presenceOpenSeams],
              ),
            );
            this.indexRetainedChildEvidence(entry.value, owner, seen);
          }
        }
        return;
      case EvaluationValueKind.Object:
      case EvaluationValueKind.BoundaryObject:
      case EvaluationValueKind.Function:
      case EvaluationValueKind.Class:
      case EvaluationValueKind.Instance:
        for (const property of value.properties.values()) {
          const expression = propertyValueExpression(property.node);
          if (expression == null || !nodeBelongsTo(expression, owner)) {
            continue;
          }
          const evidence = new EvaluationValueEvidence(property.value, property.openSeams);
          appendMapValue(this.evidenceByExpression, expression, evidence);
          this.indexRetainedChildEvidence(property.value, owner, seen);
        }
        return;
      case EvaluationValueKind.Promise:
        this.indexRetainedChildEvidence(value.settlement.evidence.value, owner, seen);
        return;
      case EvaluationValueKind.ModuleNamespace:
      case EvaluationValueKind.Unknown:
      case EvaluationValueKind.Undefined:
      case EvaluationValueKind.Null:
      case EvaluationValueKind.Boolean:
      case EvaluationValueKind.Number:
      case EvaluationValueKind.BigInt:
      case EvaluationValueKind.String:
      case EvaluationValueKind.RegularExpression:
      case EvaluationValueKind.Date:
      case EvaluationValueKind.BoundaryValue:
      case EvaluationValueKind.StringPattern:
        return;
    }
  }

  private enclosingInvocationEvaluation(node: ts.Node): StaticInvocationEvidenceInput | null {
    let current: ts.Node | undefined = node;
    while (current != null && !ts.isSourceFile(current)) {
      if (ts.isCallExpression(current) || ts.isNewExpression(current)) {
        const evaluations = this.invocationEvaluationsByExpression.get(current);
        if (evaluations != null && evaluations.length > 0) {
          return evaluations[0]!;
        }
      }
      current = current.parent;
    }
    return null;
  }

  private openInvocationRead(
    expression: ts.Expression,
    summary: string,
  ): EvaluationRead<EvaluationValue> {
    return new EvaluationRead<EvaluationValue>(null, expression, [new EvaluationOpenSeam(
      EvaluationOpenSeamKind.InvocationSourceRead,
      summary,
      expression,
      this.moduleKey,
    )]);
  }
}

type StaticInvocationEvidenceInput = StaticInvocationEvaluation | StaticInvocationFrame;

function isRetainedInvocationOccurrence(
  invocation: StaticInvocationEvidenceInput,
): invocation is StaticInvocationOccurrence {
  return 'evaluationKind' in invocation && isStaticInvocationOccurrence(invocation);
}

/** Expression reader over every definite invocation retained by one evaluated module. */
export class StaticModuleEvaluationExpressionReader extends StaticInvocationEvidenceExpressionReader {
  constructor(evaluation: StaticModuleEvaluationResult) {
    super(evaluation.moduleKey, evaluation.invocationEvaluations);
  }
}

function readInvocationCompletion(
  invocation: StaticInvocationOccurrence,
  expression: ts.Expression,
): EvaluationRead<EvaluationValue> {
  return invocation.completion.kind === EvaluationCompletionKind.Normal
    ? new EvaluationRead(invocation.completion.value, expression, invocation.openSeams)
    : new EvaluationRead<EvaluationValue>(null, expression, invocation.openSeams, invocation.completion);
}

function propertyValueExpression(node: ts.Node | null): ts.Expression | null {
  if (node == null) {
    return null;
  }
  if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
    return node.initializer ?? null;
  }
  return ts.isShorthandPropertyAssignment(node) ? node.name : null;
}

function appendMapValue<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const values = map.get(key);
  if (values == null) {
    map.set(key, [value]);
  } else if (!values.includes(value)) {
    values.push(value);
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

/** Read only syntax-owned literal values; this never consults an environment or executes source. */
export function readStaticSourceLiteralValue(expression: ts.Expression): EvaluationValue | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return new EvaluationStringValue(current.text, current);
  }
  if (ts.isNumericLiteral(current)) {
    return new EvaluationNumberValue(Number(current.text), current);
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword || current.kind === ts.SyntaxKind.FalseKeyword) {
    return new EvaluationBooleanValue(current.kind === ts.SyntaxKind.TrueKeyword, current);
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return new EvaluationNullValue(current);
  }
  if (ts.isIdentifier(current) && current.text === 'undefined') {
    return new EvaluationUndefinedValue(current);
  }
  if (
    ts.isPrefixUnaryExpression(current)
    && (current.operator === ts.SyntaxKind.PlusToken || current.operator === ts.SyntaxKind.MinusToken)
  ) {
    const operand = readStaticSourceLiteralValue(current.operand);
    return operand?.kind === EvaluationValueKind.Number
      ? new EvaluationNumberValue(
          current.operator === ts.SyntaxKind.MinusToken ? -operand.value : operand.value,
          current,
        )
      : null;
  }
  if (ts.isArrayLiteralExpression(current)) {
    const elements: EvaluationArrayElement[] = [];
    for (const [index, element] of current.elements.entries()) {
      if (ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
        return null;
      }
      const value = readStaticSourceLiteralValue(element);
      if (value == null) {
        return null;
      }
      elements.push(new EvaluationArrayElement(value, element, [], index));
    }
    return new EvaluationArrayValue(elements, current);
  }
  return null;
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
