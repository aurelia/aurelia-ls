import ts from 'typescript';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  BindingContextSlotDraft,
  BindingScope,
} from '../configuration/scope.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import { CheckerAsyncTypeProjector } from '../type-system/checker-async-type-projector.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import {
  checkerRepeatableElementTypeInfo,
} from '../type-system/checker-related-types.js';
import {
  CheckerBindingPatternLocalProjection,
  type CheckerBindingPatternLocalType,
} from '../type-system/binding-pattern-locals.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  HydrateTemplateControllerInstruction,
  ListenerBindingInstruction,
} from './instruction-ir.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
} from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';
import { TemplateProductDetails } from './product-details.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import {
  TemplateControllerPromiseResultKind,
  type TemplateControllerPromiseState,
} from './template-controller-flow-state.js';
import {
  type TemplateControllerValueTarget,
  templateControllerValueExpressionProductHandle,
} from './template-controller-value.js';
import type { TemplateScopeConstructionRequest } from './template-controller-scope-materializer.js';

export class IteratorRepeatableRuntimeIssueProjection {
  constructor(
    readonly certainty: 'definite' | 'possible',
    readonly summary: string,
    readonly sourceType: CheckerTypeReference | null,
    readonly sourceSpan: SourceSpan | null,
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
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }

  listenerEventSlot(
    input: TemplateScopeConstructionRequest,
    instruction: ListenerBindingInstruction,
    localSuffix: string,
  ): BindingContextSlotDraft {
    return new BindingContextSlotDraft(
      '$event',
      null,
      null,
      this.listenerEventTypeReference(input, instruction, localSuffix),
      instruction.sourceAddressHandle,
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
      ? evaluation.typeReference
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
    const parse = this.readParse(effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return new CheckerBindingPatternLocalProjection([], []);
    }
    const evaluation = this.typeEvaluator(input).evaluateIteratorLocals(
      parse.result.ast,
      parent,
      `${input.localKey}:scope:${localSuffix}`,
      effect.sourceAddressHandle,
    );
    return evaluation instanceof CheckerBindingPatternLocalProjection
      ? evaluation
      : new CheckerBindingPatternLocalProjection([], []);
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
      parse.result.ast.iterable.span,
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

  private typeEvaluator(input: TemplateScopeConstructionRequest) {
    return input.expressionWorld.evaluator(input.resourceScope);
  }

  private listenerEventTypeReference(
    input: TemplateScopeConstructionRequest,
    instruction: ListenerBindingInstruction,
    localSuffix: string,
  ): CheckerTypeReference | null {
    if (input.typeSystem == null) {
      return null;
    }

    const checker = input.typeSystem.checker;
    const location = checkerLookupLocation(input.typeSystem);
    const eventType = listenerEventType(checker, location, instruction.eventName);
    if (eventType == null) {
      return null;
    }

    return this.typeProjector.ensureProjection({
      localKey: `${input.localKey}:scope:${localSuffix}:listener-event:$event`,
      checker,
      type: eventType,
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle: instruction.sourceAddressHandle,
      display: checker.typeToString(eventType),
    } satisfies CheckerTypeProjectionRequest).toReference();
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
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
      display: primitive,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }
}

function listenerEventType(
  checker: ts.TypeChecker,
  location: ts.Node | undefined,
  eventName: string,
): ts.Type | null {
  return eventMapPropertyType(checker, location, 'GlobalEventHandlersEventMap', eventName)
    ?? eventMapPropertyType(checker, location, 'HTMLElementEventMap', eventName)
    ?? globalType(checker, location, 'CustomEvent')
    ?? globalType(checker, location, 'Event');
}

function eventMapPropertyType(
  checker: ts.TypeChecker,
  location: ts.Node | undefined,
  mapName: string,
  eventName: string,
): ts.Type | null {
  const mapType = globalType(checker, location, mapName);
  const property = mapType == null ? null : checker.getPropertyOfType(mapType, eventName);
  const declaration = property?.valueDeclaration ?? property?.declarations?.[0] ?? location ?? null;
  return property == null || declaration == null
    ? null
    : checker.getTypeOfSymbolAtLocation(property, declaration);
}

function globalType(
  checker: ts.TypeChecker,
  location: ts.Node | undefined,
  name: string,
): ts.Type | null {
  const symbol = checker.resolveName(name, location, ts.SymbolFlags.Type, false);
  return symbol == null ? null : checker.getDeclaredTypeOfSymbol(symbol);
}

function checkerLookupLocation(
  typeSystem: TypeSystemProject,
): ts.Node | undefined {
  return typeSystem.program.getSourceFiles().find((sourceFile) => !sourceFile.isDeclarationFile)
    ?? typeSystem.program.getSourceFiles()[0];
}
