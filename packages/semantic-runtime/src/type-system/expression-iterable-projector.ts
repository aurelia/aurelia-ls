import ts from 'typescript';
import type { BindingScope } from '../configuration/scope.js';
import type {
  ExpressionAstNode,
  ForOfStatement,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  CheckerBindingPatternLocalProjection,
  CheckerBindingPatternLocalTypeProjector,
} from './binding-pattern-locals.js';
import {
  checkerCollectionSymbolName,
  checkerRepeatableElementTypeInfo,
} from './checker-related-types.js';
import type { CheckerTypeShapeAccess } from './checker-type-shape-access.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeSynthesizer } from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  type CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionIterableProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation;
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
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation {
    return this.host.evaluateNode(expression.iterable, scope, `${localKey}:iterable`, sourceAddressHandle);
  }

  evaluateIteratorElement(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const iterable = this.host.evaluateNode(
      expression.iterable,
      scope,
      `${localKey}:iterator-source`,
      sourceAddressHandle,
    );
    if (iterable.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return iterable;
    }
    return this.evaluateIterableElementType(expression, iterable.typeShape, `${localKey}:iterator-element`, sourceAddressHandle);
  }

  evaluateIteratorLocals(
    expression: ForOfStatement,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation | CheckerBindingPatternLocalProjection {
    const element = this.evaluateIteratorElement(expression, scope, localKey, sourceAddressHandle);
    if (element.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return element;
    }
    return this.bindingPatternLocals.projectBindingPattern(
      expression.declaration,
      element.typeShape,
      `${localKey}:iterator-local`,
      sourceAddressHandle,
    );
  }

  private evaluateIterableElementType(
    expression: ExpressionAstNode,
    iterableType: CheckerTypeShape,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (iterableType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.support.type(iterableType, `Repeat local from iterable '${iterableType.display}' remains any.`);
    }

    const checker = iterableType.carrier?.checker ?? null;
    const type = iterableType.carrier?.type ?? null;
    if (checker == null || type == null) {
      if (iterableType.iteratedValueType?.productHandle != null) {
        return this.support.resolveReference(
          expression,
          iterableType.iteratedValueType,
          localKey,
          CheckerExpressionTypeOpenKind.MissingIterableElementType,
          `Iterated value type for '${iterableType.display}' could not be hydrated.`,
        );
      }
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        `Iterable type '${iterableType.display}' has no checker carrier for repeat-local projection.`,
        iterableType.toReference(),
      );
    }

    if (checkerCollectionSymbolName(type) === 'Map' || checkerCollectionSymbolName(type) === 'ReadonlyMap') {
      const mapEntryType = this.evaluateMapEntryElementType(expression, checker, type, `${localKey}:map-entry`, sourceAddressHandle);
      if (mapEntryType != null) {
        return mapEntryType;
      }
    }

    const repeatable = checkerRepeatableElementTypeInfo(checker, type);
    if (repeatable.elementType == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.MissingIterableElementType,
        expression,
        repeatable.unsupportedConstituents > 0
          ? `Type '${iterableType.display}' does not match the built-in RepeatableHandlerResolver source categories.`
          : `Type '${iterableType.display}' is repeatable, but its repeat element type could not be represented as one TypeChecker type.`,
        iterableType.toReference(),
      );
    }

    return this.support.projectType(expression, checker, repeatable.elementType, `${localKey}:value`, sourceAddressHandle);
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

    const keyReference = this.support.projectType(expression, checker, keyType, `${localKey}:key`, sourceAddressHandle).typeReference;
    const valueReference = this.support.projectType(expression, checker, valueType, `${localKey}:value`, sourceAddressHandle).typeReference;
    const lengthReference = this.support.projectType(expression, checker, checker.getNumberType(), `${localKey}:length`, sourceAddressHandle).typeReference;
    const tupleType = this.synthesis.mapEntryType(keyReference, valueReference, lengthReference, localKey, sourceAddressHandle);
    return this.support.type(tupleType, `Synthesized ${symbolName} repeat entry type for destructuring.`);
  }
}
