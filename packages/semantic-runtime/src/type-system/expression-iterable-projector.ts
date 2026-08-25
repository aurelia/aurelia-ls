import ts from 'typescript';
import type {
  ExpressionAstNode,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  CheckerBindingPatternLocalProjection,
  CheckerBindingPatternLocalTypeProjector,
} from './binding-pattern-locals.js';
import {
  checkerCollectionSymbolName,
  checkerRepeatableElementTypeInfoForHandlerAdmission,
  CheckerRepeatableHandlerAdmission,
  type CheckerRepeatableElementTypeInfo,
} from './checker-related-types.js';
import type { CheckerTypeShapeAccess } from './checker-type-shape-access.js';
import {
  CheckerTypeMemberProjectionPolicy,
} from './checker-projector.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import { CheckerExpressionTypeSynthesizer } from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  type CheckerTypeShape,
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionIterableProjectorHost {
  evaluateNode(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation;
}

export class CheckerExpressionIteratorProjection {
  constructor(
    /** Type evaluation for the authored repeat source expression. */
    readonly iterable: CheckerExpressionTypeEvaluation,
    /** One repeatability classification shared by element projection and runtime-error publication. */
    readonly repeatable: CheckerRepeatableElementTypeInfo | null,
    /** Runtime RepeatableHandlerResolver element projection, or the open result that blocked it. */
    readonly element: CheckerExpressionTypeEvaluation,
    /** Binding-pattern locals projected from `element`, or the open result that blocked them. */
    readonly locals: CheckerBindingPatternLocalProjection | CheckerExpressionTypeEvaluation,
  ) {}
}

class CheckerExpressionIteratorElementProjection {
  constructor(
    readonly evaluation: CheckerExpressionTypeEvaluation,
    readonly repeatable: CheckerRepeatableElementTypeInfo | null,
  ) {}
}

/**
 * Projects Aurelia repeat/iterator expression semantics through the TypeChecker surface.
 *
 * This is deliberately runtime-shaped: repeat.for does not mean "any TypeScript iterable". It follows the framework's
 * built-in RepeatableHandlerResolver categories, then projects the item binding-context and destructuring locals that
 * template-controller scope construction consumes.
 */
export class CheckerExpressionIterableProjector {
  private readonly bindingPatternLocals: CheckerBindingPatternLocalTypeProjector;

  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly typeAccess: CheckerTypeShapeAccess,
    private readonly synthesis: CheckerExpressionTypeSynthesizer,
    private readonly host: CheckerExpressionIterableProjectorHost,
  ) {
    this.bindingPatternLocals = new CheckerBindingPatternLocalTypeProjector(typeAccess);
  }

  evaluateForOfStatement(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation {
    const expression = context.expression;
    return expression.$kind === 'ForOfStatement'
      ? this.host.evaluateNode(context.child(expression.iterable, 'iterable'))
      : this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedExpression,
        expression,
        `Expression kind '${expression.$kind}' is not a repeat.for expression.`,
      );
  }

  evaluateIteratorProjection(
    context: CheckerExpressionTypeEvaluationContext,
    handlerAdmission: CheckerRepeatableHandlerAdmission,
  ): CheckerExpressionIteratorProjection {
    const expression = context.expression;
    if (expression.$kind !== 'ForOfStatement') {
      const open = this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedExpression,
        expression,
        `Expression kind '${expression.$kind}' is not a repeat.for expression.`,
      );
      return new CheckerExpressionIteratorProjection(open, null, open, open);
    }
    const iterable = this.host.evaluateNode(context.child(expression.iterable, 'iterator-source'));
    if (iterable.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return new CheckerExpressionIteratorProjection(iterable, null, iterable, iterable);
    }
    const iteratorSourceAddressHandle = iterable.sourceAddressHandle ?? context.sourceAddressHandle;
    const element = this.evaluateIterableElementType(
      expression,
      iterable.typeShape,
      `${context.projectionLocalKey()}:iterator-element`,
      handlerAdmission,
      iteratorSourceAddressHandle,
    );
    if (element.evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return new CheckerExpressionIteratorProjection(
        iterable,
        element.repeatable,
        element.evaluation,
        element.evaluation,
      );
    }
    const locals = this.bindingPatternLocals.projectBindingPattern(
      expression.declaration,
      element.evaluation.typeShape,
      `${context.projectionLocalKey()}:iterator-local`,
      element.evaluation.sourceAddressHandle ?? iteratorSourceAddressHandle,
    );
    return new CheckerExpressionIteratorProjection(iterable, element.repeatable, element.evaluation, locals);
  }

  private evaluateIterableElementType(
    expression: ExpressionAstNode,
    iterableType: CheckerTypeShape,
    localKey: string,
    handlerAdmission: CheckerRepeatableHandlerAdmission,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionIteratorElementProjection {
    if (iterableType.shapeKind === CheckerTypeShapeKind.Any) {
      return new CheckerExpressionIteratorElementProjection(
        this.support.type(iterableType, `Repeat local from iterable '${iterableType.display}' remains any.`, sourceAddressHandle),
        null,
      );
    }

    const checker = iterableType.carrier?.checker ?? null;
    const type = iterableType.carrier?.type ?? null;
    if (checker == null || type == null) {
      const iteratedValueType = this.typeAccess.iteratedValueType(iterableType, localKey, sourceAddressHandle);
      if (iteratedValueType != null) {
        return new CheckerExpressionIteratorElementProjection(
          this.support.type(
            iteratedValueType,
            `Projected ${expression.$kind} repeat element type through the product-owned iterated type.`,
            sourceAddressHandle,
          ),
          null,
        );
      }
      return new CheckerExpressionIteratorElementProjection(
        this.support.open(
          CheckerExpressionTypeOpenKind.MissingChecker,
          expression,
          `Iterable type '${iterableType.display}' has no checker carrier for repeat-local projection.`,
          iterableType.toReference(),
        ),
        null,
      );
    }

    const repeatable = checkerRepeatableElementTypeInfoForHandlerAdmission(
      checker,
      type,
      handlerAdmission,
    );
    if (checkerCollectionSymbolName(type) === 'Map' || checkerCollectionSymbolName(type) === 'ReadonlyMap') {
      const mapEntryType = this.evaluateMapEntryElementType(expression, checker, type, `${localKey}:map-entry`, sourceAddressHandle);
      if (mapEntryType != null) {
        return new CheckerExpressionIteratorElementProjection(mapEntryType, repeatable);
      }
    }

    if (repeatable.elementType == null) {
      return new CheckerExpressionIteratorElementProjection(
        this.support.open(
          CheckerExpressionTypeOpenKind.MissingIterableElementType,
          expression,
          repeatable.unsupportedConstituents > 0
            ? `Type '${iterableType.display}' does not match the active RepeatableHandlerResolver source categories.`
            : `Type '${iterableType.display}' is repeatable, but its repeat element type could not be represented as one TypeChecker type.`,
          iterableType.toReference(),
        ),
        repeatable,
      );
    }

    return new CheckerExpressionIteratorElementProjection(
      this.support.projectType(
        expression,
        checker,
        repeatable.elementType,
        `${localKey}:value`,
        sourceAddressHandle,
        `Projected ${expression.$kind} repeat element type through the TypeChecker.`,
        {
          memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
          origin: repeatable.handlerOpenConstituents > 0
            ? CheckerTypeProjectionOrigin.Open
            : CheckerTypeProjectionOrigin.TypeChecker,
        },
      ),
      repeatable,
    );
  }

  private evaluateMapEntryElementType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    const symbolName = checkerCollectionSymbolName(type);
    if (symbolName !== 'Map' && symbolName !== 'ReadonlyMap') {
      return null;
    }

    const [keyType, valueType] = checker.getTypeArguments(type as ts.TypeReference);
    if (keyType == null || valueType == null) {
      return null;
    }

    const keyReference = this.support.projectType(
      expression,
      checker,
      keyType,
      `${localKey}:key`,
      sourceAddressHandle,
      `Projected ${expression.$kind} map key type through the TypeChecker.`,
      { memberProjection: CheckerTypeMemberProjectionPolicy.Lazy },
    ).typeReference;
    const valueReference = this.support.projectType(
      expression,
      checker,
      valueType,
      `${localKey}:value`,
      sourceAddressHandle,
      `Projected ${expression.$kind} map value type through the TypeChecker.`,
      { memberProjection: CheckerTypeMemberProjectionPolicy.Lazy },
    ).typeReference;
    const lengthReference = this.support.projectType(
      expression,
      checker,
      checker.getNumberType(),
      `${localKey}:length`,
      sourceAddressHandle,
      `Projected ${expression.$kind} map entry length type through the TypeChecker.`,
      { memberProjection: CheckerTypeMemberProjectionPolicy.Lazy },
    ).typeReference;
    const tupleType = this.synthesis.mapEntryType(keyReference, valueReference, lengthReference, localKey, sourceAddressHandle);
    return this.support.type(tupleType, `Synthesized ${symbolName} repeat entry type for destructuring.`);
  }
}
