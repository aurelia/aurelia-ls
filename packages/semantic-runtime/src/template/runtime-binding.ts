import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  BindingKindKey,
} from '../kernel/vocabulary.js';
import type { BindingCommandExecutableReference } from './binding-command-execution.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';
import type {
  TemplateBindingMode,
  TemplateListenerStrategy,
} from './instruction-ir.js';
import type { RuntimeRendererReference } from './runtime-renderer.js';

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
}

/** Runtime ContentBinding model produced by text-binding renderers. */
@auLink('runtime-html:ContentBinding')
export class ContentBinding {
  readonly bindingKind = RuntimeBindingKind.Content;

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
}

/** Runtime SpreadBinding model for captured attribute transfer. */
@auLink('runtime-html:SpreadBinding')
export class SpreadBinding {
  readonly bindingKind = RuntimeBindingKind.Spread;

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
