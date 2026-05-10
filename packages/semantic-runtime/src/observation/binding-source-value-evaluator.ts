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
  CallFunctionExpression,
  CallMemberExpression,
  CallScopeExpression,
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
  EvaluationBoundaryKind,
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
import { OpenSeamReasonKind } from '../kernel/open-seam.js';

export const enum RuntimeBindingSourceValueEvaluationKind {
  Value = 'value',
  Open = 'open',
}

export class RuntimeBindingSourceValueEvaluation {
  constructor(
    readonly kind: RuntimeBindingSourceValueEvaluationKind,
    readonly value: EvaluationValue | null,
    readonly openReason: string | null,
    readonly openReasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}

  static value(value: EvaluationValue): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(RuntimeBindingSourceValueEvaluationKind.Value, value, null);
  }

  static open(
    reason: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): RuntimeBindingSourceValueEvaluation {
    return new RuntimeBindingSourceValueEvaluation(
      RuntimeBindingSourceValueEvaluationKind.Open,
      null,
      reason,
      compactOpenReasonKinds(reasonKinds),
    );
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
        return openNeedsRuntimeValue(`${expression.$kind} value evaluation needs a materialized binding-context instance.`);
      case 'AccessMember':
        return this.evaluateAccessMember(expression, scope);
      case 'CallScope':
        return this.evaluateCallScope(expression, scope);
      case 'CallMember':
        return this.evaluateCallMember(expression, scope);
      case 'CallFunction':
        return this.evaluateCallFunction(expression, scope);
      case 'Paren':
      case 'BindingBehavior':
        return this.evaluateNode(expression.expression, scope);
      case 'ValueConverter':
        return openUnsupportedExpression(`Value converter '${expression.name.name}' is not statically evaluated by binding-source value flow.`);
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
        return openUnsupportedExpression(`Expression kind '${expression.$kind}' is not in the binding-source value evaluator set.`);
    }
  }

  private evaluateAccessScope(
    expression: AccessScopeExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    return this.evaluateScopeName(expression.name.name, expression.ancestor, scope);
  }

  private evaluateScopeName(
    name: string,
    ancestor: number,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const lookup = scope.lookup(name, ancestor);
    if (lookup.lookupKind === BindingScopeLookupKind.MissingAncestor) {
      return openSlotNoStaticValue(`Could not resolve ancestor ${ancestor} for '${name}'.`);
    }
    if (lookup.slot == null) {
      return openSlotNoStaticValue(`Scope lookup for '${name}' did not expose a TypeChecker member slot.`);
    }
    return this.evaluateSlot(lookup.slot);
  }

  private evaluateAccessMember(
    expression: AccessMemberExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for member '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    const source = evaluatedSourceForValue(owner.value, this.evaluatedSourcesByFileName);
    if (source == null) {
      return openMemberNoStaticValue(`Member '${expression.name.name}' owner did not retain an evaluated source module.`);
    }
    const evaluator = new StaticEvaluator(source.evaluation.policy, source.evaluation.runtimeHost);
    const read = evaluator.evaluatePropertyValue(owner.value, expression.name.name, source.moduleKey, source.sourceFile);
    return evaluationResult(read.value, read.openSeams.map((seam) => seam.summary));
  }

  private evaluateCallScope(
    expression: CallScopeExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const openArgument = this.evaluateCallArguments(`CallScope '${expression.name.name}'`, expression.args, scope);
    if (openArgument != null) {
      return openArgument;
    }
    const callee = this.evaluateScopeName(expression.name.name, expression.ancestor, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? `CallScope '${expression.name.name}' callee did not close.`,
        callee.openReasonKinds,
      );
    }
    return openNeedsRuntimeValue(
      `CallScope '${expression.name.name}' requires executing a view-model function; binding-source value evaluation does not execute runtime calls.`,
    );
  }

  private evaluateCallMember(
    expression: CallMemberExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const owner = this.evaluateNode(expression.object, scope);
    if (owner.kind === RuntimeBindingSourceValueEvaluationKind.Open || owner.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        owner.openReason ?? `Owner for method '${expression.name.name}' did not close.`,
        owner.openReasonKinds,
      );
    }
    const openArgument = this.evaluateCallArguments(`CallMember '${expression.name.name}'`, expression.args, scope);
    if (openArgument != null) {
      return openArgument;
    }
    return openNeedsRuntimeValue(
      `CallMember '${expression.name.name}' requires executing a method; binding-source value evaluation does not execute runtime calls.`,
    );
  }

  private evaluateCallFunction(
    expression: CallFunctionExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const callee = this.evaluateNode(expression.func, scope);
    if (callee.kind === RuntimeBindingSourceValueEvaluationKind.Open || callee.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        callee.openReason ?? 'CallFunction callee did not close.',
        callee.openReasonKinds,
      );
    }
    const openArgument = this.evaluateCallArguments('CallFunction', expression.args, scope);
    if (openArgument != null) {
      return openArgument;
    }
    return openNeedsRuntimeValue(
      'CallFunction requires executing a function value; binding-source value evaluation does not execute runtime calls.',
    );
  }

  private evaluateCallArguments(
    label: string,
    args: readonly ExpressionAstNode[],
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation | null {
    for (let index = 0; index < args.length; index += 1) {
      const argument = this.evaluateNode(args[index]!, scope);
      if (argument.kind === RuntimeBindingSourceValueEvaluationKind.Value && argument.value != null) {
        continue;
      }
      return RuntimeBindingSourceValueEvaluation.open(
        `${label} argument ${index} did not close.${argument.openReason == null ? '' : ` ${argument.openReason}`}`,
        argument.openReasonKinds,
      );
    }
    return null;
  }

  private evaluateSlot(
    slot: BindingContextSlot,
  ): RuntimeBindingSourceValueEvaluation {
    if (slot.targetProductHandle == null) {
      if (slot.targetType != null) {
        return openSlotNoStaticValue(
          `Scope slot '${slot.name}' is runtime/local typed as '${slot.targetType.display ?? slot.targetType.shapeKind}', but it does not carry a static value carrier.`,
        );
      }
      return openSlotNoStaticValue(`Scope slot '${slot.name}' did not carry a TypeChecker member product.`);
    }
    const member = this.store.productDetails.read(TypeSystemProductDetails.TypeMember, slot.targetProductHandle);
    if (!(member instanceof CheckerTypeMember)) {
      return openSlotNoStaticValue(`Scope slot '${slot.name}' target product is not a TypeChecker member.`);
    }
    return this.evaluateMember(member);
  }

  private evaluateMember(
    member: CheckerTypeMember,
  ): RuntimeBindingSourceValueEvaluation {
    const declaration = member.carrier?.declarations[0] ?? null;
    const classNode = declaration == null ? null : enclosingClassLike(declaration);
    if (declaration == null || classNode == null || classNode.name == null) {
      return openMemberNoStaticValue(`Member '${member.name}' does not have a named class declaration for static value evaluation.`);
    }

    const source = this.evaluatedSourceForNode(classNode);
    if (source == null) {
      return openMemberNoStaticValue(`Member '${member.name}' source module was not part of static project evaluation.`);
    }
    const classValue = source.evaluation.environment.readValue(classNode.name.text);
    if (classValue?.kind !== EvaluationValueKind.Class) {
      return openMemberNoStaticValue(`Class '${classNode.name.text}' was not available as an evaluator class value.`);
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
      return openUnsupportedExpression('Template/interpolation parts do not align with expression holes.');
    }
    let text = parts[0] ?? '';
    for (let index = 0; index < expressions.length; index += 1) {
      const evaluated = this.evaluateNode(expressions[index]!, scope);
      if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Open || evaluated.value == null) {
        return RuntimeBindingSourceValueEvaluation.open(
          evaluated.openReason ?? `Expression hole ${index} did not close.`,
          evaluated.openReasonKinds,
        );
      }
      if (!isEvaluationPrimitiveValue(evaluated.value)) {
        return openUnsupportedExpression(`Expression hole ${index} did not reduce to a primitive value.`);
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
      return RuntimeBindingSourceValueEvaluation.open(
        left.openReason ?? `Left operand for '${expression.operation}' did not close.`,
        left.openReasonKinds,
      );
    }
    const right = this.evaluateNode(expression.right, scope);
    if (right.kind === RuntimeBindingSourceValueEvaluationKind.Open || right.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        right.openReason ?? `Right operand for '${expression.operation}' did not close.`,
        right.openReasonKinds,
      );
    }
    if (expression.operation === '+') {
      return evaluatePlus(left.value, right.value);
    }
    return openUnsupportedExpression(`Binary operator '${expression.operation}' is type-visible but not value-reduced by binding-source value flow.`);
  }

  private evaluateShortCircuitBinary(
    expression: BinaryExpression,
    scope: BindingScope,
  ): RuntimeBindingSourceValueEvaluation {
    const left = this.evaluateNode(expression.left, scope);
    if (left.kind === RuntimeBindingSourceValueEvaluationKind.Open || left.value == null) {
      return RuntimeBindingSourceValueEvaluation.open(
        left.openReason ?? `Left operand for '${expression.operation}' did not close.`,
        left.openReasonKinds,
      );
    }
    if (expression.operation === '??') {
      return left.value.kind === EvaluationValueKind.Null || left.value.kind === EvaluationValueKind.Undefined
        ? this.evaluateNode(expression.right, scope)
        : left;
    }
    const truthy = readEvaluationTruthiness(left.value);
    if (truthy == null) {
      return openUnsupportedExpression(`Left operand for '${expression.operation}' did not reduce to known truthiness.`);
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
          ? openUnsupportedExpression('Logical-not operand did not reduce to known truthiness.')
          : RuntimeBindingSourceValueEvaluation.value(new EvaluationBooleanValue(!truthy, null));
      }
      default:
        return openUnsupportedExpression(`Unary operator '${expression.operation}' is not value-reduced by binding-source value flow.`);
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
      return openUnsupportedExpression('Conditional expression condition did not reduce to known truthiness.');
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
      [boundaryOpenReasonKind(value.boundaryKind)],
    );
  }
  if (value.kind === EvaluationValueKind.Unknown) {
    return RuntimeBindingSourceValueEvaluation.open(
      [value.reason, ...openSummaries].filter((summary, index, all) => all.indexOf(summary) === index).join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  if (openSummaries.length > 0) {
    return RuntimeBindingSourceValueEvaluation.open(
      openSummaries.join(' '),
      [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    );
  }
  return RuntimeBindingSourceValueEvaluation.value(value);
}

function boundaryOpenReasonKind(boundaryKind: EvaluationBoundaryKind): OpenSeamReasonKind {
  switch (boundaryKind) {
    case EvaluationBoundaryKind.HostEnvironment:
      return OpenSeamReasonKind.HostEnvironmentValue;
    case EvaluationBoundaryKind.ExternalModule:
      return OpenSeamReasonKind.ExternalModuleValue;
    case EvaluationBoundaryKind.AsyncExecution:
      return OpenSeamReasonKind.AsyncExecutionValue;
  }
}

function compactOpenReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
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
    return openUnsupportedExpression("Binary '+' operands did not both reduce to primitive values.");
  }
  const leftPrimitive = readEvaluationPrimitive(left);
  const rightPrimitive = readEvaluationPrimitive(right);
  if (typeof leftPrimitive === 'string' || typeof rightPrimitive === 'string') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationStringValue(String(leftPrimitive) + String(rightPrimitive), null));
  }
  if (typeof leftPrimitive === 'number' && typeof rightPrimitive === 'number') {
    return RuntimeBindingSourceValueEvaluation.value(new EvaluationNumberValue(leftPrimitive + rightPrimitive, null));
  }
  return openUnsupportedExpression("Binary '+' operands did not reduce to a string or numeric result.");
}

function openNeedsRuntimeValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
  );
}

function openSlotNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
  );
}

function openMemberNoStaticValue(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceMemberNoStaticValue],
  );
}

function openUnsupportedExpression(summary: string): RuntimeBindingSourceValueEvaluation {
  return RuntimeBindingSourceValueEvaluation.open(
    summary,
    [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  );
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
