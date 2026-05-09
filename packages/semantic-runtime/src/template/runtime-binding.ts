import { auLink } from '../kernel/au-link.js';
import { splitWhitespace } from '../strings.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  BindingKindKey,
} from '../kernel/vocabulary.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import { HtmlNamespaceKind, type HtmlAttributeReference, type HtmlNodeReference } from './html-ir.js';
import { TemplateBindingMode } from './instruction-ir.js';
import type {
  TemplateListenerStrategy,
} from './instruction-ir.js';
import type { RuntimeRendererReference } from './runtime-renderer-reference.js';

export const enum RuntimeBindingKind {
  Property = 'property',
  Attribute = 'attribute',
  Let = 'let',
  Listener = 'listener',
  Interpolation = 'interpolation',
  Ref = 'ref',
  Content = 'content',
  Spread = 'spread',
  SpreadValue = 'spread-value',
  Translation = 'translation',
  TranslationParameters = 'translation-parameters',
  State = 'state',
  StateDispatch = 'state-dispatch',
}

export const enum RuntimeBindingScopeEffectKind {
  Let = 'let',
  Iterator = 'iterator',
}

export const enum LetBindingTargetContext {
  BindingContext = 'binding-context',
  OverrideContext = 'override-context',
}

export const enum RuntimeBindingTargetAccessLookup {
  Accessor = 'accessor',
  Observer = 'observer',
  Open = 'open',
}

export const enum RuntimeBindingTargetAccessStrategy {
  PropertyAccessor = 'property-accessor',
  SetterObserver = 'setter-observer',
  ComputedObserver = 'computed-observer',
  ValueAttributeObserver = 'value-attribute-observer',
  CheckedObserver = 'checked-observer',
  SelectValueObserver = 'select-value-observer',
  ElementPropertyAccessor = 'element-property-accessor',
  AttributeAccessor = 'attribute-accessor',
  DataAttributeAccessor = 'data-attribute-accessor',
  ClassAttributeAccessor = 'class-attribute-accessor',
  StyleAttributeAccessor = 'style-attribute-accessor',
  DirtyCheck = 'dirty-check',
  Unknown = 'unknown',
}

export const enum RuntimeBindingTargetAccessAuthority {
  FrameworkConfig = 'framework-config',
  TypeChecker = 'type-checker',
  FrameworkConfigAndTypeChecker = 'framework-config-and-type-checker',
  Open = 'open',
}

export const enum RuntimeBindingTargetOperationKind {
  PropertySet = 'property-set',
  AttributeSet = 'attribute-set',
  ClassListAdd = 'class-list-add',
  StyleCssTextAppend = 'style-css-text-append',
  TextContentSet = 'text-content-set',
  EventListenerAdd = 'event-listener-add',
  ClassListToggle = 'class-list-toggle',
  StyleSetProperty = 'style-set-property',
  AttributeSetOrRemove = 'attribute-set-or-remove',
  Open = 'open',
}

export const enum RuntimeBindingSourceOperationKind {
  RefAssignTarget = 'ref-assign-target',
  Open = 'open',
}

export const enum RuntimeTargetOperationOwnerKind {
  RuntimeBinding = 'runtime-binding',
  RuntimeRenderer = 'runtime-renderer',
}

export const enum RuntimeBindingTargetOperationAuthority {
  RuntimeRendererImplementation = 'runtime-renderer-implementation',
  RuntimeBindingImplementation = 'runtime-binding-implementation',
  Open = 'open',
}

export const enum RuntimeBindingSourceOperationAuthority {
  RuntimeBindingImplementation = 'runtime-binding-implementation',
  Open = 'open',
}

export const enum RuntimeBindingTargetKind {
  Node = 'node',
  Host = 'host',
  Controller = 'controller',
  ControllerViewModel = 'controller-view-model',
  Unknown = 'unknown',
}

export type RuntimeBindingField =
  | 'instruction'
  | 'renderer'
  | 'node'
  | 'attribute'
  | 'expression'
  | 'rawExpression'
  | 'target'
  | 'eventName'
  | 'storeName'
  | 'bindingMode'
  | 'listenerStrategy'
  | 'eventModifier'
  | 'bindingKind'
  | 'isParameterContext'
  | 'scopeEffects'
  | 'source';

export type RuntimeBindingTargetAccessField =
  | 'binding'
  | 'lookup'
  | 'targetKind'
  | 'targetNode'
  | 'targetController'
  | 'targetProperty'
  | 'strategy'
  | 'events'
  | 'targetType'
  | 'propertyType'
  | 'propertyExists'
  | 'isWritable'
  | 'isObservable'
  | 'authority'
  | 'openReason'
  | 'source';

export type RuntimeBindingTargetOperationField =
  | 'ownerKind'
  | 'binding'
  | 'renderer'
  | 'instruction'
  | 'targetKind'
  | 'targetNode'
  | 'targetController'
  | 'targetAttribute'
  | 'targetProperty'
  | 'value'
  | 'operationKind'
  | 'affectedNames'
  | 'authority'
  | 'openReason'
  | 'source';

export type RuntimeBindingSourceOperationField =
  | 'binding'
  | 'instruction'
  | 'targetKind'
  | 'targetNode'
  | 'targetController'
  | 'targetName'
  | 'targetType'
  | 'operationKind'
  | 'authority'
  | 'openReason'
  | 'source';

export type RuntimeBindingScopeEffectField =
  | 'binding'
  | 'ownerInstruction'
  | 'target'
  | 'targetContext'
  | 'localNames'
  | 'iterable'
  | 'templateController'
  | 'source';

/** Reference to a runtime binding product without expanding the binding detail. */
export class RuntimeBindingReference {
  constructor(
    /** Runtime binding class or lane represented by the target product. */
    readonly bindingKind: RuntimeBindingKind,
    /** Product handle for the runtime binding, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the runtime binding, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the binding site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a scope effect produced by a runtime binding. */
export class RuntimeBindingScopeEffectReference {
  constructor(
    /** Scope-effect lane represented by the target product. */
    readonly effectKind: RuntimeBindingScopeEffectKind,
    /** Product handle for the scope effect, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the scope effect, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the effect site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a runtime binding target-access product without expanding TypeChecker facts. */
export class RuntimeBindingTargetAccessReference {
  constructor(
    /** ObserverLocator method family used by the target access. */
    readonly lookup: RuntimeBindingTargetAccessLookup,
    /** Runtime target lane selected by renderer/controller emulation. */
    readonly targetKind: RuntimeBindingTargetKind,
    /** Runtime property key passed to ObserverLocator. */
    readonly targetProperty: string,
    /** Product handle for the target-access product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the target-access product, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the binding site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a runtime binding direct target operation product without expanding target detail. */
export class RuntimeBindingTargetOperationReference {
  constructor(
    /** Direct target update represented by the operation product. */
    readonly operationKind: RuntimeBindingTargetOperationKind,
    /** Runtime target lane selected by renderer/controller emulation. */
    readonly targetKind: RuntimeBindingTargetKind,
    /** HTML attribute lane updated by the operation. */
    readonly targetAttribute: string,
    /** Runtime property/token/key passed to AttributeBinding.updateTarget. */
    readonly targetProperty: string,
    /** Product handle for the target-operation product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the target-operation product, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the binding site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a runtime binding source-side operation without expanding source-assignment detail. */
export class RuntimeBindingSourceOperationReference {
  constructor(
    /** Source update represented by the operation product. */
    readonly operationKind: RuntimeBindingSourceOperationKind,
    /** Runtime value lane assigned into the source expression. */
    readonly targetKind: RuntimeBindingTargetKind,
    /** Ref target name passed through RefBindingRenderer getRefTarget(...). */
    readonly targetName: string,
    /** Product handle for the source-operation product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the source-operation product, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source or generated address for the binding site. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Scope effect caused by runtime LetBinding assigning into bindingContext or overrideContext. */
export class LetBindingScopeEffect {
  readonly effectKind = RuntimeBindingScopeEffectKind.Let;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly ownerInstructionProductHandle: ProductHandle,
    readonly ownerInstructionIdentityHandle: IdentityHandle,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly targetContext: LetBindingTargetContext,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingScopeEffectField>[] = [],
  ) {}

  toReference(): RuntimeBindingScopeEffectReference {
    return new RuntimeBindingScopeEffectReference(
      this.effectKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Scope effect caused by iterator binding into a template controller such as repeat. */
export class IteratorBindingScopeEffect {
  readonly effectKind = RuntimeBindingScopeEffectKind.Iterator;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly ownerInstructionProductHandle: ProductHandle,
    readonly ownerInstructionIdentityHandle: IdentityHandle,
    readonly localNames: readonly string[],
    readonly iterableExpressionProductHandle: ProductHandle | null,
    readonly templateControllerName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingScopeEffectField>[] = [],
  ) {}

  toReference(): RuntimeBindingScopeEffectReference {
    return new RuntimeBindingScopeEffectReference(
      this.effectKind,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export type RuntimeBindingScopeEffect =
  | LetBindingScopeEffect
  | IteratorBindingScopeEffect;

/**
 * Runtime target selected before a binding performs its bind-time target setup.
 *
 * This is the semantic counterpart of renderer `getTarget(target)`: controllers and renderers decide what object the
 * binding sees, while the binding decides how it uses that target during `bind(scope)`.
 */
export class RuntimeBindingTarget {
  constructor(
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: HtmlNodeReference | null,
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetType: CheckerTypeReference | null,
    readonly tagName: string | null,
    readonly namespace: HtmlNamespaceKind | null,
  ) {}
}

/** Target-side lookup requested by a framework-shaped binding during its bind lifecycle. */
export class RuntimeBindingTargetAccessRequest {
  constructor(
    readonly localKey: string,
    readonly binding: RuntimeBinding,
    readonly lookup: RuntimeBindingTargetAccessLookup,
    readonly targetProperty: string,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Direct target operation requested by a framework-shaped binding during its bind/update lifecycle. */
export class RuntimeBindingTargetOperationRequest {
  constructor(
    readonly localKey: string,
    readonly binding: RuntimeBinding,
    readonly targetAttribute: string,
    readonly targetProperty: string,
    readonly operationKind: RuntimeBindingTargetOperationKind,
    readonly affectedNames: readonly string[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Source-side assignment requested by a framework-shaped binding during bind/updateSource. */
export class RuntimeBindingSourceOperationRequest {
  constructor(
    readonly localKey: string,
    readonly binding: RuntimeBinding,
    readonly targetName: string,
    readonly operationKind: RuntimeBindingSourceOperationKind,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Host callback used by binding classes to publish bind-time target products. */
export interface RuntimeBindingBindHost {
  materializeTargetAccess(request: RuntimeBindingTargetAccessRequest): RuntimeBindingTargetAccess | null;

  materializeTargetOperation(request: RuntimeBindingTargetOperationRequest): RuntimeBindingTargetOperation | null;

  materializeSourceOperation(request: RuntimeBindingSourceOperationRequest): RuntimeBindingSourceOperation | null;
}

/** Input visible to one runtime binding while its owning controller is binding. */
export class RuntimeBindingBindInput {
  constructor(
    readonly localKey: string,
    readonly host: RuntimeBindingBindHost,
    readonly spreadValueTargetProperties: readonly string[] = [],
  ) {}

  targetAccess(
    binding: RuntimeBinding,
    lookup: RuntimeBindingTargetAccessLookup,
    targetProperty: string | null,
    localSuffix: string | null = null,
  ): RuntimeBindingBindContribution {
    if (targetProperty == null) {
      return RuntimeBindingBindContribution.none();
    }
    const localKey = localSuffix == null
      ? this.localKey
      : `${this.localKey}:${localSuffix}`;
    const targetAccess = this.host.materializeTargetAccess(new RuntimeBindingTargetAccessRequest(
      localKey,
      binding,
      lookup,
      targetProperty,
      binding.sourceAddressHandle,
    ));
    return targetAccess == null
      ? RuntimeBindingBindContribution.none()
      : RuntimeBindingBindContribution.targetAccess(targetAccess);
  }

  targetOperation(
    binding: RuntimeBinding,
    targetAttribute: string,
    targetProperty: string,
    operationKind: RuntimeBindingTargetOperationKind,
    affectedNames: readonly string[],
  ): RuntimeBindingBindContribution {
    const targetOperation = this.host.materializeTargetOperation(new RuntimeBindingTargetOperationRequest(
      this.localKey,
      binding,
      targetAttribute,
      targetProperty,
      operationKind,
      affectedNames,
      binding.sourceAddressHandle,
    ));
    return targetOperation == null
      ? RuntimeBindingBindContribution.none()
      : RuntimeBindingBindContribution.targetOperation(targetOperation);
  }

  sourceOperation(
    binding: RuntimeBinding,
    targetName: string,
    operationKind: RuntimeBindingSourceOperationKind,
  ): RuntimeBindingBindContribution {
    const sourceOperation = this.host.materializeSourceOperation(new RuntimeBindingSourceOperationRequest(
      this.localKey,
      binding,
      targetName,
      operationKind,
      binding.sourceAddressHandle,
    ));
    return sourceOperation == null
      ? RuntimeBindingBindContribution.none()
      : RuntimeBindingBindContribution.sourceOperation(sourceOperation);
  }
}

/** Products contributed by one binding during controller bind. */
export class RuntimeBindingBindContribution {
  constructor(
    readonly targetAccesses: readonly RuntimeBindingTargetAccess[],
    readonly targetOperations: readonly RuntimeBindingTargetOperation[],
    readonly sourceOperations: readonly RuntimeBindingSourceOperation[],
  ) {}

  static none(): RuntimeBindingBindContribution {
    return new RuntimeBindingBindContribution([], [], []);
  }

  static targetAccess(targetAccess: RuntimeBindingTargetAccess): RuntimeBindingBindContribution {
    return new RuntimeBindingBindContribution([targetAccess], [], []);
  }

  static targetOperation(targetOperation: RuntimeBindingTargetOperation): RuntimeBindingBindContribution {
    return new RuntimeBindingBindContribution([], [targetOperation], []);
  }

  static sourceOperation(sourceOperation: RuntimeBindingSourceOperation): RuntimeBindingBindContribution {
    return new RuntimeBindingBindContribution([], [], [sourceOperation]);
  }
}

/** Target accessor or observer selected by PropertyBinding.bind for its target side. */
export class RuntimeBindingTargetAccess {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly lookup: RuntimeBindingTargetAccessLookup,
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: HtmlNodeReference | null,
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetProperty: string,
    readonly strategy: RuntimeBindingTargetAccessStrategy,
    readonly eventNames: readonly string[],
    readonly targetType: CheckerTypeReference | null,
    readonly propertyType: CheckerTypeReference | null,
    readonly propertyExists: boolean | null,
    readonly isWritable: boolean | null,
    readonly isObservable: boolean,
    readonly authority: RuntimeBindingTargetAccessAuthority,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingTargetAccessField>[] = [],
  ) {}

  toReference(): RuntimeBindingTargetAccessReference {
    return new RuntimeBindingTargetAccessReference(
      this.lookup,
      this.targetKind,
      this.targetProperty,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Direct target update selected by renderer render or binding updateTarget behavior. */
export class RuntimeTargetOperation {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly ownerKind: RuntimeTargetOperationOwnerKind,
    readonly binding: RuntimeBindingReference | null,
    readonly renderer: RuntimeRendererReference | null,
    readonly instructionProductHandle: ProductHandle | null,
    readonly instructionIdentityHandle: IdentityHandle | null,
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: HtmlNodeReference | null,
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetAttribute: string,
    readonly targetProperty: string,
    readonly value: string | null,
    readonly operationKind: RuntimeBindingTargetOperationKind,
    readonly affectedNames: readonly string[],
    readonly authority: RuntimeBindingTargetOperationAuthority,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingTargetOperationField>[] = [],
  ) {}

  toReference(): RuntimeBindingTargetOperationReference {
    return new RuntimeBindingTargetOperationReference(
      this.operationKind,
      this.targetKind,
      this.targetAttribute,
      this.targetProperty,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export type RuntimeBindingTargetOperation = RuntimeTargetOperation;
export const RuntimeBindingTargetOperation = RuntimeTargetOperation;

/** Source-side update selected by binding updateSource behavior. */
export class RuntimeSourceOperation {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly targetKind: RuntimeBindingTargetKind,
    readonly targetNode: HtmlNodeReference | null,
    readonly targetControllerProductHandle: ProductHandle | null,
    readonly targetName: string,
    readonly targetType: CheckerTypeReference | null,
    readonly operationKind: RuntimeBindingSourceOperationKind,
    readonly authority: RuntimeBindingSourceOperationAuthority,
    readonly openReason: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingSourceOperationField>[] = [],
  ) {}

  toReference(): RuntimeBindingSourceOperationReference {
    return new RuntimeBindingSourceOperationReference(
      this.operationKind,
      this.targetKind,
      this.targetName,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export type RuntimeBindingSourceOperation = RuntimeSourceOperation;
export const RuntimeBindingSourceOperation = RuntimeSourceOperation;

/** Runtime PropertyBinding model produced by property, iterator, and style-property renderers. */
@auLink('runtime-html:PropertyBinding')
export class PropertyBinding {
  readonly bindingKind = RuntimeBindingKind.Property;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference | null,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly bindingMode: TemplateBindingMode,
    readonly semanticBindingKindKey: BindingKindKey,
    readonly command: BindingCommandExecutableReference | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.targetAccess(
      this,
      targetAccessLookupForBindingMode(this.bindingMode),
      this.target,
    );
  }
}

/** Runtime AttributeBinding model produced by attr/class/style command lowering. */
@auLink('runtime-html:AttributeBinding')
export class AttributeBinding {
  readonly bindingKind = RuntimeBindingKind.Attribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly attr: string,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return this.updateTarget(input);
  }

  updateTarget(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.targetOperation(
      this,
      this.attr,
      this.target,
      targetOperationKindForAttributeBinding(this.attr),
      affectedNamesForAttributeBinding(this.attr, this.target),
    );
  }
}

/** Runtime LetBinding model; its bind step is represented by a LetBindingScopeEffect. */
@auLink('runtime-html:LetBinding')
export class LetBinding {
  readonly bindingKind = RuntimeBindingKind.Let;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly targetContext: LetBindingTargetContext,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }
}

/** Runtime ListenerBinding model produced by trigger/capture listener renderers. */
@auLink('runtime-html:ListenerBinding')
export class ListenerBinding {
  readonly bindingKind = RuntimeBindingKind.Listener;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly eventName: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly strategy: TemplateListenerStrategy,
    readonly eventModifier: string | null,
    readonly command: BindingCommandExecutableReference | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.targetOperation(
      this,
      this.eventName,
      this.eventName,
      RuntimeBindingTargetOperationKind.EventListenerAdd,
      this.eventModifier == null ? [this.eventName] : [this.eventName, this.eventModifier],
    );
  }
}

/** Runtime InterpolationBinding model produced by text or attribute interpolation renderers. */
@auLink('runtime-html:InterpolationBinding')
export class InterpolationBinding {
  readonly bindingKind = RuntimeBindingKind.Interpolation;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference | null,
    readonly target: string | null,
    readonly expressionProductHandles: readonly ProductHandle[],
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.targetAccess(
      this,
      RuntimeBindingTargetAccessLookup.Accessor,
      this.target,
    );
  }
}

/** Runtime RefBinding model produced by ref command lowering. */
@auLink('runtime-html:RefBinding')
export class RefBinding {
  readonly bindingKind = RuntimeBindingKind.Ref;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly expressionProductHandle: ProductHandle | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return this.updateSource(input);
  }

  updateSource(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.sourceOperation(
      this,
      this.target,
      RuntimeBindingSourceOperationKind.RefAssignTarget,
    );
  }
}

/** Runtime ContentBinding model produced by text-binding renderers. */
@auLink('runtime-html:ContentBinding')
export class ContentBinding {
  readonly bindingKind = RuntimeBindingKind.Content;
  readonly target = 'textContent';

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    return input.targetOperation(
      this,
      '#text',
      this.target,
      RuntimeBindingTargetOperationKind.TextContentSet,
      [this.target],
    );
  }
}

/** Runtime SpreadBinding model for captured attribute transfer. */
@auLink('runtime-html:SpreadBinding')
export class SpreadBinding {
  readonly bindingKind = RuntimeBindingKind.Spread;
  private readonly innerBindings: RuntimeBinding[] = [];

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  addInnerBinding(binding: RuntimeBinding): void {
    this.innerBindings.push(binding);
  }

  readInnerBindings(): readonly RuntimeBinding[] {
    return [...this.innerBindings];
  }
}

/** Runtime SpreadValueBinding model produced by spread value instructions. */
@auLink('runtime-html:SpreadValueBinding')
export class SpreadValueBinding {
  readonly bindingKind = RuntimeBindingKind.SpreadValue;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: '$bindables' | '$element',
    readonly expressionProductHandle: ProductHandle | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }

  bind(input: RuntimeBindingBindInput): RuntimeBindingBindContribution {
    if (this.target === '$bindables' && input.spreadValueTargetProperties.length > 0) {
      const targetAccesses = input.spreadValueTargetProperties.flatMap((targetProperty, index) =>
        input.targetAccess(
          this,
          RuntimeBindingTargetAccessLookup.Accessor,
          targetProperty,
          `spread-bindable:${index}:${targetProperty}`,
        ).targetAccesses
      );
      return new RuntimeBindingBindContribution(targetAccesses, [], []);
    }
    return input.targetAccess(this, RuntimeBindingTargetAccessLookup.Open, this.target);
  }
}

/** Runtime i18n TranslationBinding model produced by translation renderers. */
@auLink('i18n:TranslationBinding')
export class TranslationBinding {
  constructor(
    readonly bindingKind: RuntimeBindingKind.Translation | RuntimeBindingKind.TranslationParameters,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly rawExpression: string | null,
    readonly expressionProductHandle: ProductHandle | null,
    readonly isParameterContext: boolean,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }
}

/** Runtime state plugin StateBinding model produced by the state renderer. */
@auLink('state:StateBinding')
export class StateBinding {
  readonly bindingKind = RuntimeBindingKind.State;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly target: string,
    readonly rawExpression: string,
    readonly storeName: string | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }
}

/** Runtime state plugin StateDispatchBinding model produced by the dispatch renderer. */
@auLink('state:StateDispatchBinding')
export class StateDispatchBinding {
  readonly bindingKind = RuntimeBindingKind.StateDispatch;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionProductHandle: ProductHandle,
    readonly instructionIdentityHandle: IdentityHandle,
    readonly renderer: RuntimeRendererReference,
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly eventName: string,
    readonly rawExpression: string,
    readonly storeName: string | null,
    readonly scopeEffects: readonly RuntimeBindingScopeEffectReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeBindingField>[] = [],
  ) {}

  toReference(): RuntimeBindingReference {
    return new RuntimeBindingReference(this.bindingKind, this.productHandle, this.identityHandle, this.sourceAddressHandle);
  }

  readScopeEffects(): readonly RuntimeBindingScopeEffectReference[] {
    return this.scopeEffects;
  }
}

export type RuntimeBinding =
  | PropertyBinding
  | AttributeBinding
  | LetBinding
  | ListenerBinding
  | InterpolationBinding
  | RefBinding
  | ContentBinding
  | SpreadBinding
  | SpreadValueBinding
  | TranslationBinding
  | StateBinding
  | StateDispatchBinding;

export function bindRuntimeBinding(
  binding: RuntimeBinding,
  input: RuntimeBindingBindInput,
): RuntimeBindingBindContribution {
  if (binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof InterpolationBinding
    || binding instanceof ContentBinding
    || binding instanceof ListenerBinding
    || binding instanceof RefBinding
    || binding instanceof SpreadValueBinding) {
    return binding.bind(input);
  }
  return RuntimeBindingBindContribution.none();
}

function targetAccessLookupForBindingMode(
  bindingMode: TemplateBindingMode,
): RuntimeBindingTargetAccessLookup {
  switch (bindingMode) {
    case TemplateBindingMode.FromView:
    case TemplateBindingMode.TwoWay:
      return RuntimeBindingTargetAccessLookup.Observer;
    case TemplateBindingMode.OneTime:
    case TemplateBindingMode.ToView:
      return RuntimeBindingTargetAccessLookup.Accessor;
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return RuntimeBindingTargetAccessLookup.Open;
  }
}

function targetOperationKindForAttributeBinding(
  targetAttribute: string,
): RuntimeBindingTargetOperationKind {
  switch (targetAttribute) {
    case 'class':
      return RuntimeBindingTargetOperationKind.ClassListToggle;
    case 'style':
      return RuntimeBindingTargetOperationKind.StyleSetProperty;
    default:
      return RuntimeBindingTargetOperationKind.AttributeSetOrRemove;
  }
}

function affectedNamesForAttributeBinding(
  targetAttribute: string,
  targetProperty: string,
): readonly string[] {
  switch (targetAttribute) {
    case 'class':
      return splitWhitespace(targetProperty);
    case 'style':
      return targetProperty.trim().length === 0 ? [] : [targetProperty.trim()];
    default:
      return [targetAttribute];
  }
}
