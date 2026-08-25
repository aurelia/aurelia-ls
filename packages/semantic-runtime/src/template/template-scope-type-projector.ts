import ts from 'typescript';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  BindingContextSlotMemberType,
  BindingContextSlotAssignmentAccessKind,
  BindingContextSlotDraft,
  BindingScope,
} from '../configuration/scope.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjector,
  CheckerTypeMemberProjectionPolicy,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import {
  CheckerTypeShapeAccess,
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import {
  expressionProductHandleForBinding,
  isRuntimeExpressionBinding,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  type RuntimeBindingExpressionScopeProjectionReader,
} from '../observation/runtime-binding-expression-scope.js';
import {
  aggregateRuntimeBindingSourceExpressionChainIndex,
  RuntimeBindingSourceExpressionProjectionKind,
  checkerContextForRuntimeBindingSourceExpressionProjection,
  projectRuntimeBindingSourceExpressionInScope,
} from '../observation/runtime-binding-source-expression-context.js';
import {
  checkerArrayElementType,
} from '../type-system/checker-collection-types.js';
import {
  CheckerBindingPatternLocalProjection,
} from '../type-system/binding-pattern-locals.js';
import {
  CheckerTypeNullishPresence,
  checkerTypeNullPresence,
  NoCheckerRepeatableHandlerAdmission,
  type CheckerRepeatableElementTypeInfo,
} from '../type-system/checker-related-types.js';
import {
  CheckerTypeProjectionOrigin,
  checkerTypeReferenceWithSource,
  sameCheckerTypeReference,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  HydrateTemplateControllerInstruction,
} from './instruction-ir.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
} from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';
import { TemplateProductDetails } from './product-details.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import { readTemplateExpressionParse } from './expression-parse-product.js';
import {
  TemplateControllerPromiseSettlementKind,
  type TemplateControllerPromiseState,
} from './template-controller-flow-state.js';
import {
  templateControllerValueExpressionProductHandle,
  templateControllerStaticValue,
} from './template-controller-value.js';
import type { TemplateScopeConstructionRequest } from './template-controller-scope-materializer.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import { templateControllerRuntimeValueBinding } from './template-controller-binding.js';
import {
  HtmlElement,
  normalizeHtmlTagName,
  type HtmlNodeReference,
} from './html-ir.js';
import {
  checkerLookupLocation,
  resolveCheckerDomEventType,
  resolveCheckerDomNodeType,
} from '../type-system/dom-node-type.js';
import { checkerPrimitiveLiteralType } from '../type-system/checker-primitive-types.js';
import { CheckerExpressionTypeSynthesizer } from '../type-system/expression-type-synthesis.js';
import { checkerBackedUnionTypeForReferences } from '../type-system/checker-type-union.js';
import { runtimeRepeatableHandlerAdmission } from './repeatable-handler-admission.js';

interface TemplateEventScopeInstruction {
  readonly node: HtmlNodeReference;
  readonly eventName: string;
  readonly sourceAddressHandle: AddressHandle | null;
}

export class IteratorRepeatableRuntimeIssueProjection {
  constructor(
    readonly certainty: 'definite' | 'possible',
    readonly summary: string,
    readonly sourceType: CheckerTypeReference | null,
    readonly sourceSpan: SourceSpan | null,
  ) {}
}

export class TemplateIteratorScopeProjection {
  constructor(
    /** Parsed `repeat.for` expression that produced this projection, when parsing succeeded. */
    readonly parse: TemplateExpressionParse | null,
    /** Runtime RepeatableHandlerResolver element type visible to `$index`, `$previous`, and locals. */
    readonly elementType: CheckerTypeReference | null,
    /** Binding-pattern locals projected from the repeat element type. */
    readonly localProjection: CheckerBindingPatternLocalProjection,
    /** Static repeatability issue, when the source type cannot satisfy Aurelia repeat source categories. */
    readonly repeatableIssue: IteratorRepeatableRuntimeIssueProjection | null,
  ) {}
}

/** Non-nullish type lane plus whether the original checker carrier admitted null or undefined. */
export class TemplateScopeNonNullishTypeProjection {
  constructor(
    readonly typeReference: CheckerTypeReference,
    readonly mayBeNullish: boolean | null,
  ) {}
}

/** `with` value projection preserving the runtime-significant distinction between `null` and `undefined`. */
export class TemplateControllerObjectBindingContextProjection {
  constructor(
    readonly contextType: CheckerTypeReference,
    readonly sourceType: CheckerTypeReference,
    readonly nullPresence: CheckerTypeNullishPresence | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class TemplateScopeTypeProjector {
  private readonly asyncTypeProjector: CheckerAsyncTypeProjector;
  private readonly typeSynthesizer: CheckerExpressionTypeSynthesizer;
  private readonly typeShapeAccess: CheckerTypeShapeAccess;

  constructor(
    private readonly store: KernelStore,
    private readonly typeProjector: CheckerTypeProjector,
    private readonly bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader,
  ) {
    this.asyncTypeProjector = new CheckerAsyncTypeProjector(store, typeProjector);
    this.typeSynthesizer = new CheckerExpressionTypeSynthesizer(typeProjector);
    this.typeShapeAccess = new CheckerTypeShapeAccess(store, typeProjector);
  }

  readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return readTemplateExpressionParse(this.typeProjector.publication, productHandle);
  }

  commonOrUnionTypeReference(
    references: readonly CheckerTypeReference[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const distinct: CheckerTypeReference[] = [];
    for (const reference of references) {
      if (!distinct.some((candidate) => sameCheckerTypeReference(candidate, reference))) {
        distinct.push(reference);
      }
    }
    if (distinct.length < 2) {
      return distinct[0] ?? null;
    }
    const checkerUnion = checkerBackedUnionTypeForReferences(this.typeProjector.publication, distinct);
    if (checkerUnion != null) {
      return this.typeProjector.ensureProjection({
        localKey,
        checker: checkerUnion.checker,
        type: checkerUnion.type,
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceAddressHandle,
        display: checkerUnion.checker.typeToString(checkerUnion.type),
        memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
      } satisfies CheckerTypeProjectionRequest).toReference();
    }
    const shapes = distinct.flatMap((reference) => {
      const shape = readCheckerTypeShape(this.typeProjector.publication, reference);
      return shape == null ? [] : [shape];
    });
    return shapes.length !== distinct.length
      ? null
      : this.typeSynthesizer.unionType(shapes, localKey, sourceAddressHandle).toReference();
  }

  listenerEventSlot(
    input: TemplateScopeConstructionRequest,
    instruction: TemplateEventScopeInstruction,
    localSuffix: string,
  ): BindingContextSlotDraft {
    return new BindingContextSlotDraft(
      '$event',
      null,
      null,
      this.listenerEventTypeReference(input, instruction, localSuffix),
      instruction.sourceAddressHandle,
      [],
      null,
      this.listenerEventMemberTypes(input, instruction, localSuffix),
      BindingContextSlotAssignmentAccessKind.Writable,
    );
  }

  repeatOverrideSlots(
    input: TemplateScopeConstructionRequest,
    localSuffix: string,
    sourceAddressHandle: AddressHandle | null,
    elementType: CheckerTypeReference | null,
    contextual: boolean | null,
  ): readonly BindingContextSlotDraft[] {
    return [
      new BindingContextSlotDraft('$index', null, null, this.primitiveReference(input, localSuffix, 'number', '$index', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$odd', null, null, this.primitiveReference(input, localSuffix, 'boolean', '$odd', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$even', null, null, this.primitiveReference(input, localSuffix, 'boolean', '$even', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$first', null, null, this.primitiveReference(input, localSuffix, 'boolean', '$first', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$middle', null, null, this.primitiveReference(input, localSuffix, 'boolean', '$middle', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$last', null, null, this.primitiveReference(input, localSuffix, 'boolean', '$last', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft('$length', null, null, this.primitiveReference(input, localSuffix, 'number', '$length', sourceAddressHandle), sourceAddressHandle, [], null, [], BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly),
      new BindingContextSlotDraft(
        '$previous',
        null,
        null,
        this.repeatPreviousType(input, localSuffix, elementType, contextual, sourceAddressHandle),
        sourceAddressHandle,
        [],
        null,
        [],
        BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly,
      ),
    ];
  }

  private repeatPreviousType(
    input: TemplateScopeConstructionRequest,
    localSuffix: string,
    elementType: CheckerTypeReference | null,
    contextual: boolean | null,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const undefinedType = this.literalTypeReference(
      input,
      undefined,
      `${input.localKey}:scope:${localSuffix}:repeat:$previous:undefined`,
      sourceAddressHandle,
    );
    if (contextual === false || elementType == null) {
      return contextual === false ? undefinedType : elementType;
    }
    if (undefinedType == null) {
      return elementType;
    }
    const checkerUnion = checkerBackedUnionTypeForReferences(this.typeProjector.publication, [elementType, undefinedType]);
    if (checkerUnion != null) {
      return this.typeProjector.ensureProjection({
        localKey: `${input.localKey}:scope:${localSuffix}:repeat:$previous:checker-union`,
        checker: checkerUnion.checker,
        type: checkerUnion.type,
        origin: CheckerTypeProjectionOrigin.TypeChecker,
        sourceAddressHandle,
        display: checkerUnion.checker.typeToString(checkerUnion.type),
        memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
      } satisfies CheckerTypeProjectionRequest).toReference();
    }
    const elementShape = readCheckerTypeShape(this.typeProjector.publication, elementType);
    const undefinedShape = readCheckerTypeShape(this.typeProjector.publication, undefinedType);
    return elementShape == null || undefinedShape == null
      ? elementType
      : this.typeSynthesizer.unionType(
          [elementShape, undefinedShape],
          `${input.localKey}:scope:${localSuffix}:repeat:$previous`,
          sourceAddressHandle,
        ).toReference();
  }

  iteratorProjection(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): TemplateIteratorScopeProjection {
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return new TemplateIteratorScopeProjection(parse, null, new CheckerBindingPatternLocalProjection([], []), null);
    }
    const binding = this.runtimeExpressionBinding(input, effect.binding.productHandle);
    const context = this.evaluationContextForRuntimeBinding(
      parse.result.ast,
      input,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
      binding,
    );
    if (context == null) {
      return new TemplateIteratorScopeProjection(parse, null, new CheckerBindingPatternLocalProjection([], []), null);
    }
    const handlerAdmission = binding == null
      ? NoCheckerRepeatableHandlerAdmission
      : runtimeRepeatableHandlerAdmission(
          this.store,
          input.runtimeBindings.requireRenderContextForBinding(binding.productHandle).requireActiveContainer(),
          input.typeSystem,
          input.sourceValueActivationView ?? null,
        );
    const projection = this.typeEvaluator(input, binding).evaluateIteratorProjection(
      context,
      handlerAdmission,
    );
    const elementType = projection.element.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? checkerTypeReferenceWithSource(projection.element.typeReference, projection.element.sourceAddressHandle)
      : null;
    const localProjection = projection.locals instanceof CheckerBindingPatternLocalProjection
      ? projection.locals
      : new CheckerBindingPatternLocalProjection([], []);
    return new TemplateIteratorScopeProjection(
      parse,
      elementType,
      localProjection,
      this.iteratorRepeatableIssueFromProjection(
        projection.repeatable,
        projection.iterable.kind === CheckerExpressionTypeEvaluationResultKind.Type
          ? projection.iterable.typeReference
          : null,
        parse.result.ast.iterable.span,
      ),
    );
  }

  private iteratorRepeatableIssueFromProjection(
    repeatable: CheckerRepeatableElementTypeInfo | null,
    sourceType: CheckerTypeReference | null,
    sourceSpan: SourceSpan,
  ): IteratorRepeatableRuntimeIssueProjection | null {
    if (repeatable == null || sourceType == null || repeatable.unsupportedConstituents === 0) {
      return null;
    }

    const certainty = repeatable.supportedConstituents === 0 && repeatable.openConstituents === 0
      ? 'definite'
      : 'possible';
    return new IteratorRepeatableRuntimeIssueProjection(
      certainty,
      `Type '${sourceType.display}' does not match the active repeat source categories: array, set, map, number, nullish, or a registered handler.`,
      sourceType,
      sourceSpan,
    );
  }

  letTargetType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: LetBindingScopeEffect,
  ): CheckerTypeReference | null {
    const parse = this.readParse(effect.expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (ast == null) {
      return effect.literalValue == null
        ? null
        : this.literalTypeReference(
            input,
            effect.literalValue,
            `let:${effect.productHandle}:${effect.target}:literal`,
            effect.sourceAddressHandle,
          );
    }
    const binding = this.runtimeExpressionBinding(input, effect.binding.productHandle);
    const context = this.evaluationContextForRuntimeBinding(
      ast,
      input,
      parent,
      `let:${effect.productHandle}:${effect.target}`,
      effect.sourceAddressHandle,
      binding,
    );
    if (context == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input, binding).evaluate(context);
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  templateControllerValueType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    controller: RuntimeControllerFrame | null = null,
  ): CheckerTypeReference | null {
    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.typeProjector.publication, instruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const binding = templateControllerRuntimeValueBinding(
      this.typeProjector.publication,
      input.runtimeBindings,
      instruction,
      controller,
    );
    const context = this.evaluationContextForRuntimeBinding(
      ast,
      input,
      parent,
      `${input.localKey}:scope:template-controller:${localSuffix}:value`,
      instruction.sourceAddressHandle,
      binding,
    );
    if (context == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input, binding).evaluate(context);
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  templateControllerObjectBindingContextProjection(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    controller: RuntimeControllerFrame | null = null,
  ): TemplateControllerObjectBindingContextProjection | null {
    const sourceType = this.templateControllerValueType(input, parent, instruction, localSuffix, controller);
    if (sourceType == null) {
      return null;
    }
    const nonNullish = this.nonNullishTypeProjection(
      sourceType,
      `${input.localKey}:scope:template-controller:${localSuffix}:value-context`,
      instruction.sourceAddressHandle,
    );
    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.typeProjector.publication, instruction));
    const carrier = readCheckerTypeShape(this.typeProjector.publication, sourceType)?.carrier ?? null;
    return new TemplateControllerObjectBindingContextProjection(
      nonNullish.typeReference,
      sourceType,
      carrier == null
        ? null
        : checkerTypeNullPresence(carrier.checker, carrier.type),
      parse?.site.sourceAddressHandle ?? instruction.sourceAddressHandle,
    );
  }

  templateControllerMatchTypes(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
    controller: RuntimeControllerFrame | null = null,
  ): readonly CheckerTypeReference[] | null {
    const staticValue = templateControllerStaticValue(this.typeProjector.publication, instruction);
    if (staticValue != null) {
      return [
        this.literalTypeReference(
          input,
          staticValue,
          `${input.localKey}:scope:template-controller:${localSuffix}:static-match`,
          instruction.sourceAddressHandle,
        ),
      ].filter((reference): reference is CheckerTypeReference => reference != null);
    }

    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.typeProjector.publication, instruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    return ast == null
      ? null
      : this.matchTypesForExpression(
        input,
        parent,
        ast,
        `${input.localKey}:scope:template-controller:${localSuffix}:match`,
        instruction.sourceAddressHandle,
        templateControllerRuntimeValueBinding(this.typeProjector.publication, input.runtimeBindings, instruction, controller),
      );
  }

  promiseSettlementValueType(
    input: TemplateScopeConstructionRequest,
    instruction: HydrateTemplateControllerInstruction,
    promiseState: TemplateControllerPromiseState,
    settlementKind: TemplateControllerPromiseSettlementKind,
    localSuffix: string,
  ): CheckerTypeReference | null {
    return settlementKind === TemplateControllerPromiseSettlementKind.Fulfilled
      ? this.promiseFulfilledValueType(input, promiseState, `${localSuffix}:fulfilled`)
      : this.asyncTypeProjector.unknownTypeReference(
        `${input.localKey}:scope:template-controller:${localSuffix}:rejected:unknown`,
        instruction.sourceAddressHandle,
      );
  }

  private promiseFulfilledValueType(
    input: TemplateScopeConstructionRequest,
    promiseState: TemplateControllerPromiseState,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const promiseType = this.templateControllerValueType(
      input,
      promiseState.valueScope,
      promiseState.application.instruction,
      `${localSuffix}:promise-value`,
      promiseState.application.controller,
    );
    if (promiseType == null) {
      return null;
    }

    return this.asyncTypeProjector.awaitedTypeReference(
      promiseType,
      `${input.localKey}:scope:template-controller:${localSuffix}:awaited`,
      promiseState.application.instruction.sourceAddressHandle,
    );
  }

  nonNullishTypeProjection(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateScopeNonNullishTypeProjection {
    const shape = readCheckerTypeShape(this.typeProjector.publication, reference);
    if (shape == null || shape.carrier == null) {
      return new TemplateScopeNonNullishTypeProjection(reference, null);
    }
    const narrowed = this.typeShapeAccess.nonNullishTypeShape(
      shape,
      localKey,
      sourceAddressHandle,
    );
    if (narrowed == null) {
      return new TemplateScopeNonNullishTypeProjection(reference, null);
    }
    return new TemplateScopeNonNullishTypeProjection(
      narrowed.toReference(),
      narrowed.productHandle !== shape.productHandle,
    );
  }

  private matchTypesForExpression(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    expression: ExpressionAstNode,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    binding: RuntimeExpressionBinding | null,
  ): readonly CheckerTypeReference[] | null {
    if (expression.$kind === 'Paren') {
      return this.matchTypesForExpression(input, parent, expression.expression, `${localKey}:paren`, sourceAddressHandle, binding);
    }
    if (expression.$kind === 'PrimitiveLiteral') {
      const reference = this.literalTypeReference(input, expression.value, `${localKey}:literal`, sourceAddressHandle);
      return reference == null ? null : [reference];
    }
    if (expression.$kind === 'ArrayLiteral') {
      const references = expression.elements
        .map((element, index) => element.$kind === 'PrimitiveLiteral'
          ? this.literalTypeReference(input, element.value, `${localKey}:array:${index}`, sourceAddressHandle)
          : null)
        .filter((reference): reference is CheckerTypeReference => reference != null);
      return references.length === expression.elements.length ? references : null;
    }

    const context = this.evaluationContextForRuntimeBinding(
      expression,
      input,
      parent,
      `${localKey}:dynamic`,
      sourceAddressHandle,
      binding,
    );
    if (context == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input, binding).evaluate(context);
    if (evaluation.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
      return null;
    }

    const elementType = this.arrayElementType(evaluation.typeReference);
    if (elementType != null) {
      return [elementType];
    }
    return [evaluation.typeReference];
  }

  private arrayElementType(reference: CheckerTypeReference): CheckerTypeReference | null {
    const shape = readCheckerTypeShape(this.typeProjector.publication, reference);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    const elementType = checkerArrayElementType(carrier.checker, carrier.type);
    if (elementType == null) {
      return null;
    }
    return this.typeProjector.ensureProjection({
      localKey: `template-controller-match-array-element:${reference.productHandle ?? reference.semanticKey ?? reference.display ?? 'open'}`,
      checker: carrier.checker,
      type: elementType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: carrier.declarations[0] ?? null,
      sourceAddressHandle: reference.sourceAddressHandle,
      display: carrier.checker.typeToString(elementType),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  literalTypeReference(
    input: TemplateScopeConstructionRequest,
    value: null | undefined | number | boolean | string,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (input.typeSystem == null) {
      return null;
    }
    const checker = input.typeSystem.checker;
    const type = checkerPrimitiveLiteralType(checker, value);
    return this.typeProjector.ensureProjection({
      localKey,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: checkerLookupLocation(input.typeSystem),
      sourceAddressHandle,
      display: typeof value === 'string' ? JSON.stringify(value) : checker.typeToString(type),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private typeEvaluator(
    input: TemplateScopeConstructionRequest,
    binding: RuntimeExpressionBinding | null,
  ) {
    const resourceScope = binding == null
      ? null
      : input.runtimeBindings.requireRenderContextForBinding(binding.productHandle).resourceScope;
    return input.expressionWorld.evaluator(resourceScope);
  }

  private evaluationContextForRuntimeBinding(
    expression: ExpressionAstNode,
    input: TemplateScopeConstructionRequest,
    sourceScope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    binding: RuntimeExpressionBinding | null,
  ): CheckerExpressionTypeEvaluationContext | null {
    if (binding == null) {
      return CheckerExpressionTypeEvaluationContext.knownScope(expression, sourceScope, localKey, sourceAddressHandle);
    }
    const projection = projectRuntimeBindingSourceExpressionInScope(
      input.runtimeBindings,
      this.bindingExpressionScopes,
      input.expressionResourcePlan,
      {
        binding,
        expressionProductHandle: expressionProductHandleForBinding(binding),
        expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
        expression,
        localKey,
        sourceScope,
      },
    );
    return projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open
      ? null
      : checkerContextForRuntimeBindingSourceExpressionProjection(projection, false);
  }

  private runtimeExpressionBinding(
    input: TemplateScopeConstructionRequest,
    productHandle: ProductHandle | null,
  ): RuntimeExpressionBinding | null {
    if (productHandle == null) {
      return null;
    }
    const binding = input.runtimeBindings.readBinding(productHandle);
    return binding != null && isRuntimeExpressionBinding(binding) ? binding : null;
  }

  private listenerEventTypeReference(
    input: TemplateScopeConstructionRequest,
    instruction: TemplateEventScopeInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    if (input.typeSystem == null) {
      return null;
    }

    const checker = input.typeSystem.checker;
    const location = checkerLookupLocation(input.typeSystem);
    const eventType = listenerEventType(input.typeSystem, location, instruction.eventName);
    if (eventType == null) {
      return null;
    }

    return this.typeProjector.ensureProjection({
      localKey: `${input.localKey}:scope:${localSuffix}:listener-event:$event`,
      checker,
      type: eventType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle: instruction.sourceAddressHandle,
      display: checker.typeToString(eventType),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private listenerEventMemberTypes(
    input: TemplateScopeConstructionRequest,
    instruction: TemplateEventScopeInstruction,
    localSuffix: string,
  ): readonly BindingContextSlotMemberType[] {
    const targetType = this.listenerEventTargetTypeReference(input, instruction, localSuffix);
    if (targetType == null) {
      return [];
    }

    const refinements = [
      new BindingContextSlotMemberType('currentTarget', targetType, instruction.sourceAddressHandle),
    ];
    const node = this.htmlElementFor(instruction.node);
    if (node != null && listenerTargetCanUseAttachedElement(node)) {
      refinements.push(new BindingContextSlotMemberType('target', targetType, instruction.sourceAddressHandle));
    }
    return refinements;
  }

  private listenerEventTargetTypeReference(
    input: TemplateScopeConstructionRequest,
    instruction: TemplateEventScopeInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    if (input.typeSystem == null) {
      return null;
    }
    const node = this.htmlElementFor(instruction.node);
    if (node == null) {
      return null;
    }
    const resolution = resolveCheckerDomNodeType(
      input.typeSystem,
      node.tagName,
      node.namespace,
      this.typeProjector,
      `${input.localKey}:scope:${localSuffix}:listener-event-target`,
      node.sourceAddressHandle ?? instruction.sourceAddressHandle,
    );
    return resolution?.reference ?? null;
  }

  private htmlElementFor(reference: HtmlNodeReference): HtmlElement | null {
    if (reference.productHandle == null) {
      return null;
    }
    const node = this.typeProjector.publication.readProductDetail(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private primitiveReference(
    input: TemplateScopeConstructionRequest,
    localSuffix: string,
    primitive: 'number' | 'boolean',
    name: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (input.typeSystem == null) {
      return null;
    }
    const checker = input.typeSystem.checker;
    const type = primitive === 'number' ? checker.getNumberType() : checker.getBooleanType();
    return this.typeProjector.ensureProjection({
      localKey: `${input.localKey}:scope:${localSuffix}:repeat-context:${name}`,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: primitive,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }
}

function listenerEventType(
  typeSystem: TypeSystemProject,
  location: ts.Node | null,
  eventName: string,
): ts.Type | null {
  return resolveCheckerDomEventType(typeSystem, eventName, location ?? checkerLookupLocation(typeSystem));
}

function listenerTargetCanUseAttachedElement(node: HtmlElement): boolean {
  switch (normalizeHtmlTagName(node.tagName)) {
    case 'INPUT':
    case 'SELECT':
    case 'TEXTAREA':
      return true;
    default:
      return false;
  }
}
