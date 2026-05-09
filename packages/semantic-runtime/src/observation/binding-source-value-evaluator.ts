import ts from 'typescript';
import {
  BindingScope,
  BindingScopeLookupKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import type {
  AccessMemberExpression,
  AccessScopeExpression,
  BinaryExpression,
  ConditionalExpression,
  ExpressionAstNode,
  Interpolation,
  TemplateExpression,
  UnaryExpression,
} from '../expression/ast.js';
import {
  StaticEvaluator,
} from '../evaluation/evaluator.js';
import {
  isEvaluatedProjectSource,
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  normalizeModuleKey,
} from '../evaluation/module-graph.js';
import {
  EvaluationBooleanValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  readEvaluationTruthiness,
  type EvaluationClassValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { KernelStore } from '../kernel/store.js';
import {
  TypeSystemProductDetails,
} from '../type-system/product-details.js';
import {
  CheckerTypeMember,
} from '../type-system/type-shape.js';

export const enum RuntimeBindingSourceValueEvaluationKind {
  Value = 'value',
  Open = 'open',
}

export class RuntimeBindingSourceValueEvaluation {
  constructor(
    readonly kind: RuntimeBindingSourceValueEvaluationKind,
    readonly value: EvaluationValue | null,
    readonly openReason: string | null,
  ) {}

  static value(value: EvaluationValue): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationKind.Value, value, null);
  }

  static open(reason: string): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationKind.Open, null, reason);
  }
}

/**
 * Evaluates Aurelia binding-source expressions against modeled runtime Scope plus the static ECMAScript evaluator.
 *
 * This is intentionally binding-owned substrate. Consumers such as router resources can ask whether a binding source
 * carries a static value, but source lookup, view-model member access, and getter execution stay with the binding flow.
 */
export class RuntimeBindingSourceValueEvaluator {
  private readonly evaluatedSourcesByFileName = new Map<string, EvaluatedProjectSource>();

  constructor(
    readonly store: KernelStore,
    readonly evaluation: StaticProjectEvaluationResult,
  ) {
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      this.evaluatedSourcesByFileName.set(normalizeModuleKey(source.sourceFile.fileName), source);
      this.evaluatedSourcesByFileName.set(normalizeModuleKey(source.moduleKey), source);
    }
  }

  evaluate(
    expression: ExpressionAstNode,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateNode(expression, scope);
  }

  private evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    switch (expression.$kind) {
      case 'PrimitiveLiteral':
        return RuntimeBindingSourceValueEvaluation.value(primitiveValue(expression.value, null));
      case 'AccessScope':
        return this.evaluateAccessScope(expression, scope);
      case 'AccessThis':
      case 'AccessBoundary':
        return RuntimeBindingSourceValueEvaluation.open(`${expression.$kind} value evaluation needs a materialized binding-context instance.`);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, scope);
      case 'Paren':
      case 'BindingBehavior':
        return this.evaluateNode(expression.expression, scope);
      case 'ValueConverter':
        return RuntimeBindingSourceValueEvaluation.open(`Value converter '${expression.name.name}' is not statically evaluated by binding-source value flow.`);
      case 'Template':
        return this.evaluateTemplate(expression, scope);
      case 'Interpolation':
        return this.evaluateInterpolation(expression, scope);
      case 'Binary':
        return this.evaluateBinary(expression, scope);
      case 'Unary':
        return this.evaluateUnary(expression, scope);
      case 'Conditional':
        return this.evaluateConditional(expression, scope);
      default:
        return RuntimeBindingSourceValueEvaluation.open(`Expression kind '${expression.$kind}' is not in the binding-source value evaluator set.`);
    }
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const lookup = scope.lookup(expression.name.name, expression.ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return RuntimeBindingSourceValueEvaluation.open(`Could not resolve ancestor ${expression.ancestor} for '${expression.name.name}'.`);
    }
    if (lookup.slot == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Scope lookup for '${expression.name.name}' did not expose a TypeChecker member slot.`);
    }
    return this.evaluateSlot(lookup.slot);
  }

  private evaluateAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(owner.openReason ?? `Owner for member '${expression.name.name}' did not close.`);
    }
    const source = evaluatedSourceForValue(owner.value, this.evaluatedSourcesByFileName);
    if (source == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Member '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const read = evaluator.evaluatePropertyValue(owner.value, expression.name.name, source.moduleKey, source.sourceFile);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateSlot(
    slot: BindingContextSlot,
  ): RuntimeBindingSourceValueEvaluation {
    if (slot.targetProductHandle == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    if (!(member instanceof CheckerTypeMember)) {
      return RuntimeBindingSourceValueEvaluation.open(`Scope slot '${slot.name}' target product is not a TypeChecker member.`);
    }
    return this.evaluateMember(member);
  }

  private evaluateMember(
    member: CheckerTypeMember,
  ): RuntimeBindingSourceValueEvaluation {
    const declaration = member.carrier?.declarations[0] ?? null;
    const classNode = declaration == null ? null : enclosingClassLike(declaration);
    if (declaration == null || classNode == null || classNode.name == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Member '${member.name}' does not have a named class declaration for static value evaluation.`);
    }

    const source = this.evaluatedSourceForNode(classNode);
    if (source == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Member '${member.name}' source module was not part of static project evaluation.`);
    }
    const classValue = source.evaluation.environment.readValue(classNode.name.text);
    if (classValue?.kind !== EvaluationValueKind.Class) {
      return RuntimeBindingSourceValueEvaluation.open(`Class '${classNode.name.text}' was not available as an evaluator class value.`);
    }

    return this.evaluateClassMemberValue(classValue, member.name, classNode, source);
  }

  private evaluateClassMemberValue(
    classValue: EvaluationClassValue,
    memberName: string,
    classNode: ts.ClassLikeDeclarationBase,
    source: EvaluatedProjectSource,
  ): RuntimeBindingSourceValueEvaluation {
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const instance = evaluator.evaluateClassValueInstantiation(classValue, source.moduleKey, classNode);
    if (instance.value.kind === EvaluationValueKind.Unknown) {
      return evaluationResult(instance.value, instance.openSeams.map((seam) => seam.summary));
    }
    const value = evaluator.evaluatePropertyValue(instance.value, memberName, source.moduleKey, classNode);
    return evaluationResult(value.value, [
      ...instance.openSeams.map((seam) => seam.summary),
      ...value.openSeams.map((seam) => seam.summary),
    ]);
  }

  private evaluateTemplate(
    expression: TemplateExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.cooked, expression.expressions, scope);
  }

  private evaluateInterpolation(
    expression: Interpolation,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateStringParts(expression.parts, expression.expressions, scope);
  }

  private evaluateStringParts(
    parts: readonly string[],
    expressions: readonly ExpressionAstNode[],
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (parts.length !== expressions.length + 1) {
      return RuntimeBindingSourceValueEvaluation.open('Template/interpolation parts do not align with expression holes.');
    }
    let text = parts[0] ?? '';
    for (let index = 0; index < expressions.length; index += 1) {
      const evaluated = this.evaluateNode(expressions[index]!, scope);
      if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Open || evaluated.value == null) {
        return RuntimeBindingSourceValueEvaluation.open(evaluated.openReason ?? `Expression hole ${index} did not close.`);
      }
      if (!isEvaluationPrimitiveValue(evaluated.value)) {
        return RuntimeBindingSourceValueEvaluation.open(`Expression hole ${index} did not reduce to a primitive value.`);
      }
      text += String(readEvaluationPrimitive(evaluated.value)) + (parts[index + 1] ?? '');
    }
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(text, null));
  }

  private evaluateBinary(
    expression: BinaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    if (expression.operation === '||' || expression.operation === '&&' || expression.operation === '??') {
      return this.evaluateShortCircuitBinary(expression, scope);
    }
    const left = this.evaluateNode(expression.left, scope);
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(left.openReason ?? `Left operand for '${expression.operation}' did not close.`);
    }
    const right = this.evaluateNode(expression.right, scope);
    if (right.kind === RuntimeBindingSourceValueEvaluationKind.Open || right.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(right.openReason ?? `Right operand for '${expression.operation}' did not close.`);
    }
    if (expression.operation === '+') {
      return evaluatePlus(left.value, right.value);
    }
    return RuntimeBindingSourceValueEvaluation.open(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`);
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const left = this.evaluateNode(expression.left, scope);
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(left.openReason ?? `Left operand for '${expression.operation}' did not close.`);
    }
    if (expression.operation === '??') {
      return left.value.kind === EvaluationValueKind.Null || left.value.kind === EvaluationValueKind.Undefined
        ? this.evaluateNode(expression.right, scope)
        : left;
    }
    const truthy = readEvaluationTruthiness(left.value);
    if (truthy == null) {
      return RuntimeBindingSourceValueEvaluation.open(`Left operand for '${expression.operation}' did not reduce to known truthiness.`);
    }
    return expression.operation === '||'
      ? truthy ? left : this.evaluateNode(expression.right, scope)
      : truthy ? this.evaluateNode(expression.right, scope) : left;
  }

  private evaluateUnary(
    expression: UnaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const value = this.evaluateNode(expression.expression, scope);
    if (value.kind === RuntimeBindingSourceValueEvaluationKind.Open || value.value == null) {
      return value;
    }
    switch (expression.operation) {
      case '!': {
        const truthy = readEvaluationTruthiness(value.value);
        return truthy == null
          ? RuntimeBindingSourceValueEvaluation.open('Logical-not operand did not reduce to known truthiness.')
          : RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(!truthy, null));
      }
      default:
        return RuntimeBindingSourceValueEvaluation.open(`Unary operator '${expression.operation}' is not value-reduced by binding-source value flow.`);
    }
  }

  private evaluateConditional(
    expression: ConditionalExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const condition = this.evaluateNode(expression.condition, scope);
    if (condition.kind === RuntimeBindingSourceValueEvaluationKind.Open || condition.value == null) {
      return condition;
    }
    const truthy = readEvaluationTruthiness(condition.value);
    if (truthy == null) {
      return RuntimeBindingSourceValueEvaluation.open('Conditional expression condition did not reduce to known truthiness.');
    }
    return this.evaluateNode(truthy ? expression.yes : expression.no, scope);
  }

  private evaluatedSourceForNode(node: ts.Node): EvaluatedProjectSource | null {
    return this.evaluatedSourcesByFileName.get(normalizeModuleKey(node.getSourceFile().fileName)) ?? null;
  }
}

function evaluatedSourceForValue(
  value: EvaluationValue,
  evaluatedSourcesByFileName: ReadonlyMap<string, EvaluatedProjectSource>,
): EvaluatedProjectSource | null {
  const sourceFile = value.node?.getSourceFile() ?? null;
  return sourceFile == null
    ? null
    : evaluatedSourcesByFileName.get(normalizeModuleKey(sourceFile.fileName)) ?? null;
}

function evaluationResult(
  value: EvaluationValue,
  openSummaries: readonly string[],
): RuntimeBindingSourceValueEvaluation {
  if (value.kind === EvaluationValueKind.BoundaryValue) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
    );
  }
  if (openSummaries.length > 0) {
    return RuntimeBindingSourceValueEvaluation.open(openSummaries.join(' '));
  }
  return RuntimeBindingSourceValueEvaluation.value(value);
}

function primitiveValue(
  value: null | undefined | number | boolean | string,
  node: ts.Node | null,
): EvaluationValue {
  switch (typeof value) {
    case 'string':
      return new EvaluationStringValue(value, node);
    case 'number':
      return new EvaluationNumberValue(value, node);
    case 'boolean':
      return new EvaluationBooleanValue(value, node);
    case 'undefined':
      return EvaluationUndefined;
    default:
      return value === null ? new EvaluationNullValue(node) : EvaluationUndefined;
  }
}

function evaluatePlus(
  left: EvaluationValue,
  right: EvaluationValue,
): RuntimeBindingSourceValueEvaluation {
  if (!isEvaluationPrimitiveValue(left) || !isEvaluationPrimitiveValue(right)) {
    return RuntimeBindingSourceValueEvaluation.open("Binary '+' operands did not both reduce to primitive values.");
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);
  if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), null));
  }
  if (typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(leftPrimitive + rightPrimitive, null));
  }
  return RuntimeBindingSourceValueEvaluation.open("Binary '+' operands did not reduce to a string or numeric result.");
}

function enclosingClassLike(node: ts.Node): ts.ClassLikeDeclarationBase | null {
  let current: ts.Node | undefined = node;
  while (current != null) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}
