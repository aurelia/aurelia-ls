import ts from 'typescript';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  BindingContextSlotMemberType,
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
import { readCheckerTypeShape } from '../type-system/checker-type-shape-access.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  type CheckerExpressionTypeEvaluation,
} from '../type-system/expression-type-evaluation.js';
import {
  checkerRepeatableElementTypeInfo,
  checkerCollectionSymbolName,
  checkerNumberIndexValueType,
} from '../type-system/checker-related-types.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import { checkerUnionType } from '../type-system/checker-type-union.js';
import {
  CheckerBindingPatternLocalProjection,
  type CheckerBindingPatternLocalType,
} from '../type-system/binding-pattern-locals.js';
import {
  CheckerTypeProjectionOrigin,
  checkerTypeReferenceWithSource,
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
  TemplateControllerPromiseResultKind,
  type TemplateControllerPromiseState,
} from './template-controller-flow-state.js';
import {
  type TemplateControllerValueTarget,
  templateControllerValueExpressionProductHandle,
  templateControllerStaticValue,
} from './template-controller-value.js';
import type { TemplateScopeConstructionRequest } from './template-controller-scope-materializer.js';
import {
  HtmlElement,
  normalizeHtmlTagName,
  type HtmlNodeReference,
} from './html-ir.js';
import {
  checkerLookupLocation,
  globalDeclaredType,
  resolveCheckerDomNodeType,
} from '../type-system/dom-node-type.js';
import { checkerPrimitiveLiteralType } from '../type-system/checker-primitive-types.js';

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

export class TemplateScopeTypeProjector {
  private readonly asyncTypeProjector: CheckerAsyncTypeProjector;

  constructor(
    private readonly store: KernelStore,
    private readonly typeProjector: CheckerTypeProjector,
  ) {
    this.asyncTypeProjector = new CheckerAsyncTypeProjector(store, typeProjector);
  }

  readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return readTemplateExpressionParse(this.store, productHandle);
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
    );
  }

  repeatOverrideSlots(
    input: TemplateScopeConstructionRequest,
    sourceAddressHandle: AddressHandle | null,
    elementType: CheckerTypeReference | null,
  ): readonly BindingContextSlotDraft[] {
    return [
      new BindingContextSlotDraft('$index', null, null, this.primitiveReference(input, 'number', '$index', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$odd', null, null, this.primitiveReference(input, 'boolean', '$odd', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$even', null, null, this.primitiveReference(input, 'boolean', '$even', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$first', null, null, this.primitiveReference(input, 'boolean', '$first', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$middle', null, null, this.primitiveReference(input, 'boolean', '$middle', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$last', null, null, this.primitiveReference(input, 'boolean', '$last', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$length', null, null, this.primitiveReference(input, 'number', '$length', sourceAddressHandle), sourceAddressHandle),
      new BindingContextSlotDraft('$previous', null, null, elementType, sourceAddressHandle),
    ];
  }

  iteratorElementType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateIteratorElement(
      parse.result.ast,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? checkerTypeReferenceWithSource(evaluation.typeReference, evaluation.sourceAddressHandle)
      : null;
  }

  iteratorLocalTypes(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): ReadonlyMap<string, CheckerBindingPatternLocalType> {
    const projection = this.iteratorLocalProjection(input, parent, effect, localSuffix);
    return new Map(projection.locals.map((local) => [local.name, local]));
  }

  iteratorLocalProjection(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): CheckerBindingPatternLocalProjection {
    return this.iteratorProjection(input, parent, effect, localSuffix).localProjection;
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
    const projection = this.typeEvaluator(input).evaluateIteratorProjection(
      parse.result.ast,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
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
      this.iteratorRepeatableIssueFromEvaluation(projection.iterable, parse.result.ast.iterable.span),
    );
  }

  iteratorRepeatableIssue(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    effect: IteratorBindingScopeEffect,
    localSuffix: string,
  ): IteratorRepeatableRuntimeIssueProjection | null {
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return null;
    }
    const source = this.typeEvaluator(input).evaluateWithScope(
      parse.result.ast.iterable,
      parent,
      `${input.localKey}:scope:${localSuffix}:iterator-source-repeatable`,
      effect.sourceAddressHandle,
    );
    return this.iteratorRepeatableIssueFromEvaluation(source, parse.result.ast.iterable.span);
  }

  private iteratorRepeatableIssueFromEvaluation(
    source: CheckerExpressionTypeEvaluation,
    sourceSpan: SourceSpan,
  ): IteratorRepeatableRuntimeIssueProjection | null {
    if (source.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
      return null;
    }
    const checker = source.typeShape.carrier?.checker ?? null;
    const type = source.typeShape.carrier?.type ?? null;
    if (checker == null || type == null) {
      return null;
    }

    const repeatable = checkerRepeatableElementTypeInfo(checker, type);
    if (repeatable.unsupportedConstituents === 0) {
      return null;
    }

    const certainty = repeatable.supportedConstituents === 0 && repeatable.openConstituents === 0
      ? 'definite'
      : 'possible';
    return new IteratorRepeatableRuntimeIssueProjection(
      certainty,
      `Type '${source.typeShape.display}' does not match the built-in repeat source categories: array, set, map, number, or nullish.`,
      source.typeReference,
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
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateWithScope(
      ast,
      parent,
      `let:${effect.productHandle}:${effect.target}`,
      effect.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  templateControllerValueType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.store, instruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const evaluation = this.typeEvaluator(input).evaluateWithScope(
      ast,
      parent,
      `${input.localKey}:scope:template-controller:${localSuffix}:value`,
      instruction.sourceAddressHandle,
    );
    return evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? evaluation.typeReference
      : null;
  }

  templateControllerObjectBindingContextType(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    const valueType = this.templateControllerValueType(input, parent, instruction, localSuffix);
    return valueType == null
      ? null
      : this.nonNullishTypeReference(
        valueType,
        `${input.localKey}:scope:template-controller:${localSuffix}:value-context`,
        instruction.sourceAddressHandle,
      );
  }

  templateControllerMatchTypes(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    instruction: HydrateTemplateControllerInstruction,
    localSuffix: string,
  ): readonly CheckerTypeReference[] | null {
    const staticValue = templateControllerStaticValue(this.store, instruction);
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

    const parse = this.readParse(templateControllerValueExpressionProductHandle(this.store, instruction));
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    return ast == null
      ? null
      : this.matchTypesForExpression(
        input,
        parent,
        ast,
        `${input.localKey}:scope:template-controller:${localSuffix}:match`,
        instruction.sourceAddressHandle,
      );
  }

  promiseResultSlotDraft(
    input: TemplateScopeConstructionRequest,
    instruction: HydrateTemplateControllerInstruction,
    promiseState: TemplateControllerPromiseState,
    resultKind: TemplateControllerPromiseResultKind,
    localSuffix: string,
    target: TemplateControllerValueTarget,
  ): BindingContextSlotDraft {
    return new BindingContextSlotDraft(
      target.name,
      null,
      null,
      this.promiseResultSlotType(input, instruction, promiseState, resultKind, localSuffix),
      target.sourceAddressHandle ?? instruction.sourceAddressHandle,
    );
  }

  private promiseResultSlotType(
    input: TemplateScopeConstructionRequest,
    instruction: HydrateTemplateControllerInstruction,
    promiseState: TemplateControllerPromiseState,
    resultKind: TemplateControllerPromiseResultKind,
    localSuffix: string,
  ): CheckerTypeReference | null {
    return resultKind === TemplateControllerPromiseResultKind.Fulfilled
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
      promiseState.instruction,
      `${localSuffix}:promise-value`,
    );
    if (promiseType == null) {
      return null;
    }

    return this.asyncTypeProjector.awaitedTypeReference(
      promiseType,
      `${input.localKey}:scope:template-controller:${localSuffix}:awaited`,
      promiseState.instruction.sourceAddressHandle,
    );
  }

  private nonNullishTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const shape = readCheckerTypeShape(this.store, reference);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return reference;
    }
    const narrowed = carrier.checker.getNonNullableType(carrier.type);
    if (narrowed === carrier.type) {
      return reference;
    }
    return this.typeProjector.ensureProjection({
      localKey,
      checker: carrier.checker,
      type: narrowed,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: carrier.declarations[0] ?? null,
      sourceAddressHandle,
      display: carrier.checker.typeToString(narrowed),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private matchTypesForExpression(
    input: TemplateScopeConstructionRequest,
    parent: BindingScope,
    expression: ExpressionAstNode,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerTypeReference[] | null {
    if (expression.$kind === 'Paren') {
      return this.matchTypesForExpression(input, parent, expression.expression, `${localKey}:paren`, sourceAddressHandle);
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

    const evaluation = this.typeEvaluator(input).evaluateWithScope(
      expression,
      parent,
      `${localKey}:dynamic`,
      sourceAddressHandle,
    );
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
    const shape = readCheckerTypeShape(this.store, reference);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    const elementType = checkerArrayElementType(carrier.checker, carrier.type);
    if (elementType == null) {
      return null;
    }
    return this.typeProjector.ensureProjection({
      localKey: `template-controller-match-array-element:${reference.productHandle ?? reference.checkerKey ?? reference.display ?? 'open'}`,
      checker: carrier.checker,
      type: elementType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: carrier.declarations[0] ?? null,
      sourceAddressHandle: reference.sourceAddressHandle,
      display: carrier.checker.typeToString(elementType),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private literalTypeReference(
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

  private typeEvaluator(input: TemplateScopeConstructionRequest) {
    return input.expressionWorld.evaluator(input.resourceScope);
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
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private primitiveReference(
    input: TemplateScopeConstructionRequest,
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
      localKey: `${input.localKey}:scope:repeat-context:${name}`,
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
  const lookupLocation = location ?? checkerLookupLocation(typeSystem);
  return lookupLocation == null
    ? null
    : eventMapPropertyType(typeSystem, lookupLocation, 'GlobalEventHandlersEventMap', eventName)
      ?? eventMapPropertyType(typeSystem, lookupLocation, 'HTMLElementEventMap', eventName)
      ?? globalDeclaredType(typeSystem, 'CustomEvent', lookupLocation)
      ?? globalDeclaredType(typeSystem, 'Event', lookupLocation);
}

function eventMapPropertyType(
  typeSystem: TypeSystemProject,
  location: ts.Node,
  mapName: string,
  eventName: string,
): ts.Type | null {
  const checker = typeSystem.checker;
  const mapType = globalDeclaredType(typeSystem, mapName, location);
  const property = mapType == null ? null : checkerPropertySymbol(checker, mapType, eventName);
  return property == null
    ? null
    : checkerSymbolValueType(checker, property, location);
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

function checkerArrayElementType(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  if (type.isUnion()) {
    const elementTypes = type.types
      .map((part) => checkerArrayElementType(checker, part))
      .filter((part): part is ts.Type => part != null);
    return elementTypes.length === 0 ? null : checkerUnionType(checker, elementTypes);
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return checkerNumberIndexValueType(checker, type);
  }
  const symbolName = checkerCollectionSymbolName(type);
  if (symbolName === 'Array' || symbolName === 'ReadonlyArray') {
    return checker.getTypeArguments(type as ts.TypeReference)[0]
      ?? checkerNumberIndexValueType(checker, type)
      ?? checker.getUnknownType();
  }
  return null;
}
