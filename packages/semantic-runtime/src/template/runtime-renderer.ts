import { auLink } from '../kernel/au-link.js';
import { splitWhitespace } from '../strings.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  TemplateRenderTarget,
  TemplateRenderTargetKind,
} from './compiled-template.js';
import {
  AttributeBindingInstruction,
  DispatchBindingInstruction,
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  HydrateLetElementInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  IteratorBindingInstruction,
  LetBindingInstruction,
  ListenerBindingInstruction,
  MultiAttrInstruction,
  PropertyBindingInstruction,
  RefBindingInstruction,
  SetAttributeInstruction,
  SetClassAttributeInstruction,
  SetPropertyInstruction,
  SetStyleAttributeInstruction,
  SpreadTransferedBindingInstruction,
  SpreadValueBindingInstruction,
  StateBindingInstruction,
  StylePropertyBindingInstruction,
  TemplateBindingMode,
  TemplateInstructionKind,
  TextBindingInstruction,
  TranslationBindBindingInstruction,
  TranslationBindingInstruction,
  TranslationParametersBindingInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  IteratorBindingScopeEffect,
  LetBinding,
  LetBindingScopeEffect,
  LetBindingTargetContext,
  ListenerBinding,
  PropertyBinding,
  RefBinding,
  RuntimeBindingReference,
  RuntimeBindingKind,
  RuntimeBindingScopeEffectKind,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperationAuthority,
  type RuntimeBindingTargetOperationField,
  RuntimeBindingTargetOperationKind,
  SpreadBinding,
  SpreadValueBinding,
  StateBinding,
  StateDispatchBinding,
  TranslationBinding,
  type RuntimeBinding,
  type RuntimeBindingField,
  type RuntimeBindingScopeEffect,
  type RuntimeBindingScopeEffectField,
  RuntimeTargetOperation,
  RuntimeTargetOperationOwnerKind,
} from './runtime-binding.js';
import {
  RuntimeControllerCreationRequest,
  RuntimeControllerCreationKind,
  RuntimeControllerFrame,
} from './runtime-controller.js';
import {
  RuntimeRendererKind,
  RuntimeRendererReference,
} from './runtime-renderer-reference.js';

export const enum RuntimeRendererPackage {
  RuntimeHtml = 'runtime-html',
  I18n = 'i18n',
  State = 'state',
}

export const enum RuntimeRendererGroup {
  RuntimeHtmlDefaultRenderers = 'runtime-html-default-renderers',
  I18nTranslationRenderers = 'i18n-translation-renderers',
  StateDefaultRenderers = 'state-default-renderers',
}

export type RuntimeRendererField =
  | 'rendererKind'
  | 'targetInstructionKind'
  | 'runtimeBindingKind'
  | 'bindingKind'
  | 'scopeEffectKinds'
  | 'package'
  | 'group'
  | 'source';

export type BuiltInRuntimeRendererCatalogField =
  | 'package'
  | 'group'
  | 'renderers'
  | 'source';

export type ConfiguredBuiltInRuntimeRendererCatalogSelectionField =
  | 'registrationAdmission'
  | 'frameworkKind'
  | 'catalogs'
  | 'source';

export class RuntimeRendererAllocation {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export class RuntimeRendererInstructionOwner {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly templateControllerName: string | null,
    readonly letTargetContext: LetBindingTargetContext,
    readonly rendererOverride: RuntimeRenderer | null,
  ) {}
}

export class RuntimeRendererRenderResult {
  readonly bindings: readonly RuntimeBinding[];

  constructor(
    bindings: RuntimeBinding | readonly RuntimeBinding[] | null = [],
    readonly scopeEffects: readonly RuntimeBindingScopeEffect[] = [],
    readonly createdControllers: readonly RuntimeControllerFrame[] = [],
    readonly targetOperations: readonly RuntimeTargetOperation[] = [],
  ) {
    this.bindings = bindings == null
      ? []
      : Array.isArray(bindings)
        ? bindings
        : [bindings];
  }

  static none(): RuntimeRendererRenderResult {
    return new RuntimeRendererRenderResult();
  }

  static binding(
    binding: RuntimeBinding,
    scopeEffects: readonly RuntimeBindingScopeEffect[] = [],
  ): RuntimeRendererRenderResult {
    return new RuntimeRendererRenderResult([binding], scopeEffects);
  }

  static manyBindings(
    bindings: readonly RuntimeBinding[],
    scopeEffects: readonly RuntimeBindingScopeEffect[] = [],
  ): RuntimeRendererRenderResult {
    return new RuntimeRendererRenderResult(bindings, scopeEffects);
  }

  static targetOperation(
    targetOperation: RuntimeTargetOperation,
  ): RuntimeRendererRenderResult {
    return new RuntimeRendererRenderResult([], [], [], [targetOperation]);
  }

  get binding(): RuntimeBinding | null {
    return this.bindings[0] ?? null;
  }
}

export const enum RuntimeRendererSpreadCompileState {
  /** The owning hydration instruction has no captured attributes to spend. */
  NoCapturedAttributes = 'no-captured-attributes',
  /** Captured attributes were compiled into dynamic spread instructions. */
  Compiled = 'compiled',
  /** Captured-attribute compilation is recognized but not fully materialized. */
  Open = 'open',
}

export interface RuntimeRendererSpreadCompileRequest {
  readonly local: string;
  readonly instruction: SpreadTransferedBindingInstruction;
  readonly target: TemplateRenderTarget;
  readonly targetController: RuntimeControllerFrame;
}

export class RuntimeRendererSpreadCompileResult {
  constructor(
    readonly state: RuntimeRendererSpreadCompileState,
    /** Root dynamic instructions returned by TemplateCompiler.compileSpread for the current spread transfer. */
    readonly instructions: readonly TemplateInstruction[],
    /** Every dynamic instruction allocated for this compile, including inner instructions wrapped by SpreadElementProp. */
    readonly createdInstructions: readonly TemplateInstruction[],
    readonly summary: string | null,
    readonly addressHandle: AddressHandle | null,
  ) {}

  static noCapturedAttributes(addressHandle: AddressHandle | null): RuntimeRendererSpreadCompileResult {
    return new RuntimeRendererSpreadCompileResult(
      RuntimeRendererSpreadCompileState.NoCapturedAttributes,
      [],
      [],
      null,
      addressHandle,
    );
  }

  static open(
    summary: string,
    addressHandle: AddressHandle | null,
  ): RuntimeRendererSpreadCompileResult {
    return new RuntimeRendererSpreadCompileResult(
      RuntimeRendererSpreadCompileState.Open,
      [],
      [],
      summary,
      addressHandle,
    );
  }

  static compiled(
    instructions: readonly TemplateInstruction[],
    createdInstructions: readonly TemplateInstruction[],
    addressHandle: AddressHandle | null,
  ): RuntimeRendererSpreadCompileResult {
    return new RuntimeRendererSpreadCompileResult(
      RuntimeRendererSpreadCompileState.Compiled,
      instructions,
      createdInstructions,
      null,
      addressHandle,
    );
  }
}

export interface RuntimeRenderingRun {
  readonly provenanceHandle: ProvenanceHandle;

  allocate(local: string): RuntimeRendererAllocation;

  createChildController(input: RuntimeControllerCreationRequest): RuntimeControllerFrame | null;

  compileSpread(input: RuntimeRendererSpreadCompileRequest): RuntimeRendererSpreadCompileResult;

  recordOpenInstruction(local: string, summary: string, addressHandle: AddressHandle | null): void;

  readInstruction(productHandle: ProductHandle): TemplateInstruction | null;

  consumeInstruction(productHandle: ProductHandle): void;

  renderInstruction(
    local: string,
    instruction: TemplateInstruction,
    owner: RuntimeRendererInstructionOwner | null,
    renderingController: RuntimeControllerFrame,
    targetController: RuntimeControllerFrame,
    target: TemplateRenderTarget,
    bindingOwner?: RuntimeBinding | null,
  ): void;
}

export class RuntimeRendererInvocation {
  constructor(
    readonly local: string,
    readonly instruction: TemplateInstruction,
    readonly renderer: RuntimeRenderer,
    readonly owner: RuntimeRendererInstructionOwner | null,
    readonly renderingController: RuntimeControllerFrame,
    readonly targetController: RuntimeControllerFrame,
    readonly target: TemplateRenderTarget,
    readonly run: RuntimeRenderingRun,
  ) {}

  allocateBinding(): RuntimeRendererAllocation {
    return this.run.allocate(this.local);
  }

  allocateScopeEffect(suffix: string): RuntimeRendererAllocation {
    return this.run.allocate(`${this.local}:${suffix}`);
  }

  allocateTargetOperation(suffix = 'target-operation'): RuntimeRendererAllocation {
    return this.run.allocate(`${this.local}:${suffix}`);
  }

  createChildController(
    localSuffix: string,
    creationKind: RuntimeControllerCreationKind,
    instruction: HydrateElementInstruction | HydrateAttributeInstruction | HydrateTemplateControllerInstruction,
  ): RuntimeControllerFrame | null {
    return this.run.createChildController(new RuntimeControllerCreationRequest(
      `${this.local}:${localSuffix}`,
      creationKind,
      instruction,
      this.renderingController,
    ));
  }

  compileSpread(
    localSuffix: string,
    instruction: SpreadTransferedBindingInstruction,
  ): RuntimeRendererSpreadCompileResult {
    return this.run.compileSpread({
      local: `${this.local}:${localSuffix}`,
      instruction,
      target: this.target,
      targetController: this.targetController,
    });
  }

  recordOpenInstruction(
    localSuffix: string,
    summary: string,
    addressHandle: AddressHandle | null,
  ): void {
    this.run.recordOpenInstruction(`${this.local}:${localSuffix}`, summary, addressHandle);
  }

  readInstruction(productHandle: ProductHandle): TemplateInstruction | null {
    return this.run.readInstruction(productHandle);
  }

  consumeInstruction(productHandle: ProductHandle): void {
    this.run.consumeInstruction(productHandle);
  }

  renderNestedInstructionByHandle(
    productHandle: ProductHandle,
    localSuffix: string,
    owner: RuntimeRendererInstructionOwner | null,
    targetController: RuntimeControllerFrame,
  ): void {
    const instruction = this.run.readInstruction(productHandle);
    if (instruction == null) {
      return;
    }
    this.run.consumeInstruction(productHandle);
    this.run.renderInstruction(
      `${this.local}:${localSuffix}`,
      instruction,
      owner,
      this.renderingController,
      targetController,
      this.target,
    );
  }

  renderCompiledSpreadInstructions(
    localSuffix: string,
    instructions: readonly TemplateInstruction[],
    bindingOwner: RuntimeBinding,
  ): void {
    instructions.forEach((instruction, index) => {
      this.run.renderInstruction(
        `${this.local}:${localSuffix}:${index}`,
        instruction,
        null,
        this.renderingController,
        this.targetController,
        this.target,
        bindingOwner,
      );
    });
  }

  inputForChildInstruction(
    localSuffix: string,
    instruction: TemplateInstruction,
    owner: RuntimeRendererInstructionOwner | null,
  ): RuntimeRendererInvocation {
    return new RuntimeRendererInvocation(
      `${this.local}:${localSuffix}`,
      instruction,
      this.renderer,
      owner,
      this.renderingController,
      this.targetController,
      this.target,
      this.run,
    );
  }

  fieldProvenance<TField extends string>(
    fields: readonly (TField | null)[],
  ): readonly FieldProvenance<TField>[] {
    return compactFieldProvenance(fields.map((field) =>
      field == null ? null : new FieldProvenance(field, this.run.provenanceHandle)
    ));
  }
}

export class BuiltInRuntimeRendererCatalog {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly packageId: RuntimeRendererPackage,
    readonly group: RuntimeRendererGroup,
    readonly renderers: readonly RuntimeRenderer[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInRuntimeRendererCatalogField>[] = [],
  ) {}
}

export class ConfiguredBuiltInRuntimeRendererCatalogSelection {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly registrationAdmissionProductHandle: ProductHandle,
    readonly frameworkKind: FrameworkRegistrationKind,
    readonly catalogProductHandles: readonly ProductHandle[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ConfiguredBuiltInRuntimeRendererCatalogSelectionField>[] = [],
  ) {}
}

@auLink('runtime-html:SetPropertyRenderer')
export class SetPropertyRenderer {
  readonly rendererKind = RuntimeRendererKind.SetProperty;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SetProperty;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSetPropertyTargetOperation(input);
  }
}

@auLink('runtime-html:CustomElementRenderer')
export class CustomElementRenderer {
  readonly rendererKind = RuntimeRendererKind.CustomElement;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.HydrateElement;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    if (!(input.instruction instanceof HydrateElementInstruction)) {
      return RuntimeRendererRenderResult.none();
    }
    const childController = input.createChildController(
      'custom-element-controller',
      RuntimeControllerCreationKind.CustomElement,
      input.instruction,
    );
    if (childController == null) {
      return RuntimeRendererRenderResult.none();
    }
    const owner = new RuntimeRendererInstructionOwner(
      input.instruction.productHandle,
      input.instruction.identityHandle,
      null,
      LetBindingTargetContext.OverrideContext,
      null,
    );
    renderOwnedBindingInstructions(input, input.instruction.bindableInstructionProductHandles, 'bindable', owner, childController);
    return new RuntimeRendererRenderResult([], [], [childController]);
  }
}

@auLink('runtime-html:CustomAttributeRenderer')
export class CustomAttributeRenderer {
  readonly rendererKind = RuntimeRendererKind.CustomAttribute;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.HydrateAttribute;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    if (!(input.instruction instanceof HydrateAttributeInstruction)) {
      return RuntimeRendererRenderResult.none();
    }
    const childController = input.createChildController(
      'custom-attribute-controller',
      RuntimeControllerCreationKind.CustomAttribute,
      input.instruction,
    );
    if (childController == null) {
      return RuntimeRendererRenderResult.none();
    }
    const owner = new RuntimeRendererInstructionOwner(
      input.instruction.productHandle,
      input.instruction.identityHandle,
      null,
      LetBindingTargetContext.OverrideContext,
      null,
    );
    renderOwnedBindingInstructions(input, input.instruction.bindingInstructionProductHandles, 'property', owner, childController);
    return new RuntimeRendererRenderResult([], [], [childController]);
  }
}

@auLink('runtime-html:TemplateControllerRenderer')
export class TemplateControllerRenderer {
  readonly rendererKind = RuntimeRendererKind.TemplateController;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.HydrateTemplateController;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    if (!(input.instruction instanceof HydrateTemplateControllerInstruction)) {
      return RuntimeRendererRenderResult.none();
    }
    const childController = input.createChildController(
      'template-controller',
      RuntimeControllerCreationKind.TemplateController,
      input.instruction,
    );
    if (childController == null) {
      return RuntimeRendererRenderResult.none();
    }
    const owner = new RuntimeRendererInstructionOwner(
      input.instruction.productHandle,
      input.instruction.identityHandle,
      input.instruction.controllerName,
      LetBindingTargetContext.OverrideContext,
      null,
    );
    renderOwnedBindingInstructions(input, input.instruction.bindingInstructionProductHandles, 'property', owner, childController);
    return new RuntimeRendererRenderResult([], [], [childController]);
  }
}

function renderOwnedBindingInstructions(
  input: RuntimeRendererInvocation,
  handles: readonly ProductHandle[],
  localPrefix: string,
  owner: RuntimeRendererInstructionOwner,
  childController: RuntimeControllerFrame,
): void {
  const iteratorTailHandles = new Set(handles.flatMap((handle) => {
    const instruction = input.readInstruction(handle);
    return instruction instanceof IteratorBindingInstruction
      ? instruction.tailInstructionProductHandles
      : [];
  }));
  handles.forEach((handle, index) => {
    if (iteratorTailHandles.has(handle)) {
      return;
    }
    input.renderNestedInstructionByHandle(handle, `${localPrefix}:${index}`, owner, childController);
  });
}

@auLink('runtime-html:LetElementRenderer')
export class LetElementRenderer {
  readonly rendererKind = RuntimeRendererKind.LetElement;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.HydrateLetElement;
  readonly runtimeBindingKind = RuntimeBindingKind.Let;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Let.key;
  readonly scopeEffectKinds = [RuntimeBindingScopeEffectKind.Let] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    if (!(input.instruction instanceof HydrateLetElementInstruction)) {
      return RuntimeRendererRenderResult.none();
    }
    const owner = new RuntimeRendererInstructionOwner(
      input.instruction.productHandle,
      input.instruction.identityHandle,
      null,
      input.instruction.toBindingContext ? LetBindingTargetContext.BindingContext : LetBindingTargetContext.OverrideContext,
      input.renderer,
    );
    const bindings: RuntimeBinding[] = [];
    const effects: RuntimeBindingScopeEffect[] = [];
    input.instruction.instructionProductHandles.forEach((handle, index) => {
      const child = input.readInstruction(handle);
      if (!(child instanceof LetBindingInstruction)) {
        return;
      }
      input.consumeInstruction(handle);
      const childResult = renderLetRuntimeBinding(input.inputForChildInstruction(`let:${index}`, child, owner));
      bindings.push(...childResult.bindings);
      effects.push(...childResult.scopeEffects);
    });
    return RuntimeRendererRenderResult.manyBindings(bindings, effects);
  }
}

@auLink('runtime-html:RefBindingRenderer')
export class RefBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.RefBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.RefBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Ref;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Ref.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderRefRuntimeBinding(input);
  }
}

@auLink('runtime-html:InterpolationBindingRenderer')
export class InterpolationBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.InterpolationBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.Interpolation;
  readonly runtimeBindingKind = RuntimeBindingKind.Interpolation;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Interpolation.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderInterpolationRuntimeBinding(input);
  }
}

@auLink('runtime-html:PropertyBindingRenderer')
export class PropertyBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.PropertyBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.PropertyBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Property;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Property.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderPropertyRuntimeBinding(input);
  }
}

@auLink('runtime-html:IteratorBindingRenderer')
export class IteratorBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.IteratorBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.IteratorBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Property;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Iterator.key;
  readonly scopeEffectKinds = [RuntimeBindingScopeEffectKind.Iterator] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderPropertyRuntimeBinding(input);
  }
}

@auLink('runtime-html:TextBindingRenderer')
export class TextBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.TextBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.TextBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Content;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Content.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderContentRuntimeBinding(input);
  }
}

@auLink('runtime-html:ListenerBindingRenderer')
export class ListenerBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.ListenerBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.ListenerBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Listener;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Listener.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderListenerRuntimeBinding(input);
  }
}

@auLink('runtime-html:SetAttributeRenderer')
export class SetAttributeRenderer {
  readonly rendererKind = RuntimeRendererKind.SetAttribute;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SetAttribute;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSetAttributeTargetOperation(input);
  }
}

@auLink('runtime-html:SetClassAttributeRenderer')
export class SetClassAttributeRenderer {
  readonly rendererKind = RuntimeRendererKind.SetClassAttribute;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SetClassAttribute;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSetClassAttributeTargetOperation(input);
  }
}

@auLink('runtime-html:SetStyleAttributeRenderer')
export class SetStyleAttributeRenderer {
  readonly rendererKind = RuntimeRendererKind.SetStyleAttribute;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SetStyleAttribute;
  readonly runtimeBindingKind = null;
  readonly semanticBindingKindKey = null;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSetStyleAttributeTargetOperation(input);
  }
}

@auLink('runtime-html:StylePropertyBindingRenderer')
export class StylePropertyBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.StylePropertyBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.StylePropertyBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Property;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.StyleProperty.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderPropertyRuntimeBinding(input);
  }
}

@auLink('runtime-html:AttributeBindingRenderer')
export class AttributeBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.AttributeBinding;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.AttributeBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Attribute;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Attribute.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderAttributeRuntimeBinding(input);
  }
}

@auLink('runtime-html:SpreadRenderer')
export class SpreadRenderer {
  readonly rendererKind = RuntimeRendererKind.Spread;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SpreadTransferedBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Spread;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Spread.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSpreadRuntimeBinding(input);
  }
}

@auLink('runtime-html:SpreadValueRenderer')
export class SpreadValueRenderer {
  readonly rendererKind = RuntimeRendererKind.SpreadValue;
  readonly packageId = RuntimeRendererPackage.RuntimeHtml;
  readonly group = RuntimeRendererGroup.RuntimeHtmlDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.SpreadValueBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.SpreadValue;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.SpreadValue.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderSpreadValueRuntimeBinding(input);
  }
}

@auLink('i18n:TranslationBindingRenderer')
export class TranslationBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.TranslationBinding;
  readonly packageId = RuntimeRendererPackage.I18n;
  readonly group = RuntimeRendererGroup.I18nTranslationRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.TranslationBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Translation;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Translation.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderTranslationRuntimeBinding(input);
  }
}

@auLink('i18n:TranslationBindBindingRenderer')
export class TranslationBindBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.TranslationBindBinding;
  readonly packageId = RuntimeRendererPackage.I18n;
  readonly group = RuntimeRendererGroup.I18nTranslationRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.TranslationBindBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.Translation;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.Translation.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderTranslationRuntimeBinding(input);
  }
}

@auLink('i18n:TranslationParametersBindingRenderer')
export class TranslationParametersBindingRenderer {
  readonly rendererKind = RuntimeRendererKind.TranslationParametersBinding;
  readonly packageId = RuntimeRendererPackage.I18n;
  readonly group = RuntimeRendererGroup.I18nTranslationRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.TranslationParametersBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.TranslationParameters;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.TranslationParameters.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderTranslationRuntimeBinding(input);
  }
}

@auLink('state:StateBindingInstructionRenderer')
export class StateBindingInstructionRenderer {
  readonly rendererKind = RuntimeRendererKind.StateBinding;
  readonly packageId = RuntimeRendererPackage.State;
  readonly group = RuntimeRendererGroup.StateDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.StateBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.State;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.State.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderStateRuntimeBinding(input);
  }
}

@auLink('state:DispatchBindingInstructionRenderer')
export class DispatchBindingInstructionRenderer {
  readonly rendererKind = RuntimeRendererKind.DispatchBinding;
  readonly packageId = RuntimeRendererPackage.State;
  readonly group = RuntimeRendererGroup.StateDefaultRenderers;
  readonly targetInstructionKind = TemplateInstructionKind.DispatchBinding;
  readonly runtimeBindingKind = RuntimeBindingKind.StateDispatch;
  readonly semanticBindingKindKey = KernelVocabulary.Binding.StateDispatch.key;
  readonly scopeEffectKinds = [] as const;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeRendererField>[] = [],
  ) {}

  toReference(): RuntimeRendererReference {
    return rendererReference(this);
  }

  render(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
    return renderDispatchRuntimeBinding(input);
  }
}

export type RuntimeRenderer =
  | SetPropertyRenderer
  | CustomElementRenderer
  | CustomAttributeRenderer
  | TemplateControllerRenderer
  | LetElementRenderer
  | RefBindingRenderer
  | InterpolationBindingRenderer
  | PropertyBindingRenderer
  | IteratorBindingRenderer
  | TextBindingRenderer
  | ListenerBindingRenderer
  | SetAttributeRenderer
  | SetClassAttributeRenderer
  | SetStyleAttributeRenderer
  | StylePropertyBindingRenderer
  | AttributeBindingRenderer
  | SpreadRenderer
  | SpreadValueRenderer
  | TranslationBindingRenderer
  | TranslationBindBindingRenderer
  | TranslationParametersBindingRenderer
  | StateBindingInstructionRenderer
  | DispatchBindingInstructionRenderer;

export const RuntimeHtmlDefaultRenderers = [
  new SetPropertyRenderer(),
  new CustomElementRenderer(),
  new CustomAttributeRenderer(),
  new TemplateControllerRenderer(),
  new LetElementRenderer(),
  new RefBindingRenderer(),
  new InterpolationBindingRenderer(),
  new PropertyBindingRenderer(),
  new IteratorBindingRenderer(),
  new TextBindingRenderer(),
  new ListenerBindingRenderer(),
  new SetAttributeRenderer(),
  new SetClassAttributeRenderer(),
  new SetStyleAttributeRenderer(),
  new StylePropertyBindingRenderer(),
  new AttributeBindingRenderer(),
  new SpreadRenderer(),
  new SpreadValueRenderer(),
] as const;

export const I18nTranslationRenderers = [
  new TranslationBindingRenderer(),
  new TranslationBindBindingRenderer(),
  new TranslationParametersBindingRenderer(),
] as const;

export const StateDefaultRenderers = [
  new StateBindingInstructionRenderer(),
  new DispatchBindingInstructionRenderer(),
] as const;

function rendererReference(renderer: RuntimeRenderer): RuntimeRendererReference {
  return new RuntimeRendererReference(
    renderer.rendererKind,
    renderer.productHandle,
    renderer.identityHandle,
    renderer.targetInstructionKind,
    renderer.sourceAddressHandle,
  );
}

function renderSetPropertyTargetOperation(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SetPropertyInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const targetClosed = input.targetController.viewModel != null;
  return RuntimeRendererRenderResult.targetOperation(renderRendererTargetOperation(
    input,
    RuntimeBindingTargetOperationKind.PropertySet,
    targetClosed ? RuntimeBindingTargetKind.ControllerViewModel : RuntimeBindingTargetKind.Unknown,
    targetClosed ? null : 'SetPropertyRenderer.render uses getTarget(controller), but the semantic controller frame has no closed view-model target.',
    null,
    input.targetController.productHandle,
    instruction.attribute.rawName ?? instruction.targetProperty,
    instruction.targetProperty,
    instruction.value,
    [instruction.targetProperty],
  ));
}

function renderSetAttributeTargetOperation(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SetAttributeInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const isSurrogate = input.target.targetKind === TemplateRenderTargetKind.Surrogate;
  return RuntimeRendererRenderResult.targetOperation(renderRendererTargetOperation(
    input,
    RuntimeBindingTargetOperationKind.AttributeSet,
    isSurrogate
      ? RuntimeBindingTargetKind.Host
      : instruction.node.productHandle == null ? RuntimeBindingTargetKind.Unknown : RuntimeBindingTargetKind.Node,
    !isSurrogate && instruction.node.productHandle == null
      ? 'SetAttributeRenderer.render received a target instruction whose authored HTML node is not closed.'
      : null,
    isSurrogate ? null : instruction.node,
    isSurrogate ? input.renderingController.productHandle : null,
    instruction.targetAttribute,
    instruction.targetAttribute,
    instruction.value,
    [instruction.targetAttribute],
  ));
}

function renderSetClassAttributeTargetOperation(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SetClassAttributeInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const isSurrogate = input.target.targetKind === TemplateRenderTargetKind.Surrogate;
  return RuntimeRendererRenderResult.targetOperation(renderRendererTargetOperation(
    input,
    RuntimeBindingTargetOperationKind.ClassListAdd,
    isSurrogate
      ? RuntimeBindingTargetKind.Host
      : instruction.node.productHandle == null ? RuntimeBindingTargetKind.Unknown : RuntimeBindingTargetKind.Node,
    !isSurrogate && instruction.node.productHandle == null
      ? 'SetClassAttributeRenderer.render received a target instruction whose authored HTML node is not closed.'
      : null,
    isSurrogate ? null : instruction.node,
    isSurrogate ? input.renderingController.productHandle : null,
    instruction.attribute.rawName ?? 'class',
    'classList',
    instruction.value,
    splitWhitespace(instruction.value),
  ));
}

function renderSetStyleAttributeTargetOperation(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SetStyleAttributeInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const isSurrogate = input.target.targetKind === TemplateRenderTargetKind.Surrogate;
  return RuntimeRendererRenderResult.targetOperation(renderRendererTargetOperation(
    input,
    RuntimeBindingTargetOperationKind.StyleCssTextAppend,
    isSurrogate
      ? RuntimeBindingTargetKind.Host
      : instruction.node.productHandle == null ? RuntimeBindingTargetKind.Unknown : RuntimeBindingTargetKind.Node,
    !isSurrogate && instruction.node.productHandle == null
      ? 'SetStyleAttributeRenderer.render received a target instruction whose authored HTML node is not closed.'
      : null,
    isSurrogate ? null : instruction.node,
    isSurrogate ? input.renderingController.productHandle : null,
    instruction.attribute.rawName ?? 'style',
    'cssText',
    instruction.value,
    affectedStyleNamesFromCssText(instruction.value),
  ));
}

function renderRendererTargetOperation(
  input: RuntimeRendererInvocation,
  operationKind: RuntimeBindingTargetOperationKind,
  targetKind: RuntimeBindingTargetKind,
  openReason: string | null,
  targetNode: RuntimeTargetOperation['targetNode'],
  targetControllerProductHandle: ProductHandle | null,
  targetAttribute: string,
  targetProperty: string,
  value: string,
  affectedNames: readonly string[],
): RuntimeTargetOperation {
  const allocation = input.allocateTargetOperation();
  return new RuntimeTargetOperation(
    allocation.productHandle,
    allocation.identityHandle,
    RuntimeTargetOperationOwnerKind.RuntimeRenderer,
    null,
    input.renderer.toReference(),
    input.instruction.productHandle,
    input.instruction.identityHandle,
    targetKind,
    targetNode,
    targetControllerProductHandle,
    targetAttribute,
    targetProperty,
    value,
    openReason == null ? operationKind : RuntimeBindingTargetOperationKind.Open,
    affectedNames,
    openReason == null
      ? RuntimeBindingTargetOperationAuthority.RuntimeRendererImplementation
      : RuntimeBindingTargetOperationAuthority.Open,
    openReason,
    input.instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingTargetOperationField>([
      'ownerKind',
      'renderer',
      'instruction',
      'targetKind',
      targetNode == null ? null : 'targetNode',
      targetControllerProductHandle == null ? null : 'targetController',
      'targetAttribute',
      'targetProperty',
      'value',
      'operationKind',
      affectedNames.length === 0 ? null : 'affectedNames',
      'authority',
      openReason == null ? null : 'openReason',
      'source',
    ]),
  );
}

function affectedStyleNamesFromCssText(cssText: string): readonly string[] {
  return cssText
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part.slice(0, part.indexOf(':')).trim())
    .filter((name) => name.length > 0);
}

function renderPropertyRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof PropertyBindingInstruction)
    && !(instruction instanceof IteratorBindingInstruction)
    && !(instruction instanceof StylePropertyBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const semanticBindingKindKey = input.renderer.semanticBindingKindKey;
  if (semanticBindingKindKey == null) {
    return RuntimeRendererRenderResult.none();
  }

  const allocation = input.allocateBinding();
  let effect: IteratorBindingScopeEffect | null = null;
  if (instruction instanceof IteratorBindingInstruction) {
    consumeIteratorTailInstructions(input, instruction);
    const effectAllocation = input.allocateScopeEffect('iterator-effect');
    effect = new IteratorBindingScopeEffect(
      effectAllocation.productHandle,
      effectAllocation.identityHandle,
      new RuntimeBindingReference(RuntimeBindingKind.Property, allocation.productHandle, allocation.identityHandle, instruction.sourceAddressHandle),
      input.owner?.productHandle ?? instruction.productHandle,
      input.owner?.identityHandle ?? instruction.identityHandle,
      instruction.localNames,
      instruction.iterableExpressionProductHandle,
      input.owner?.templateControllerName ?? null,
      instruction.sourceAddressHandle,
      input.fieldProvenance<RuntimeBindingScopeEffectField>([
        'binding',
        'ownerInstruction',
        'localNames',
        'iterable',
        input.owner?.templateControllerName == null ? null : 'templateController',
        'source',
      ]),
    );
  }

  return new RuntimeRendererRenderResult(
    new PropertyBinding(
      allocation.productHandle,
      allocation.identityHandle,
      instruction.productHandle,
      instruction.identityHandle,
      input.renderer.toReference(),
      instruction.node,
      instruction.attribute,
      instruction.targetProperty,
      instruction instanceof IteratorBindingInstruction
        ? instruction.iterableExpressionProductHandle
        : instruction.expressionProductHandle,
      instruction instanceof IteratorBindingInstruction
        ? TemplateBindingMode.ToView
        : instruction instanceof StylePropertyBindingInstruction
          ? TemplateBindingMode.ToView
          : instruction.bindingMode,
      semanticBindingKindKey,
      instruction instanceof PropertyBindingInstruction ? instruction.command : null,
      effect == null ? [] : [effect.toReference()],
      instruction.sourceAddressHandle,
      input.fieldProvenance<RuntimeBindingField>([
        'instruction',
        'renderer',
        'node',
        instruction instanceof IteratorBindingInstruction ? null : 'attribute',
        'expression',
        'target',
        'bindingMode',
        'bindingKind',
        effect == null ? null : 'scopeEffects',
        'source',
      ]),
    ),
    effect == null ? [] : [effect],
  );
}

function consumeIteratorTailInstructions(
  input: RuntimeRendererInvocation,
  instruction: IteratorBindingInstruction,
): void {
  instruction.tailInstructionProductHandles.forEach((handle, index) => {
    const tail = input.readInstruction(handle);
    if (tail == null) {
      input.recordOpenInstruction(
        `iterator-tail:${index}:missing`,
        `Iterator binding tail instruction '${handle}' could not be hydrated for runtime Rendering.`,
        instruction.sourceAddressHandle,
      );
      return;
    }
    input.consumeInstruction(tail.productHandle);
    if (!(tail instanceof MultiAttrInstruction)) {
      input.recordOpenInstruction(
        `iterator-tail:${index}:unexpected`,
        `Iterator binding tail instruction '${handle}' was not a MultiAttrInstruction.`,
        tail.sourceAddressHandle,
      );
    }
  });
}

function renderAttributeRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof AttributeBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new AttributeBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.attr,
    instruction.target,
    instruction.expressionProductHandle,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>(['instruction', 'renderer', 'node', 'attribute', 'expression', 'target', 'bindingKind', 'source']),
  ));
}

function renderLetRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof LetBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  const targetContext = input.owner?.letTargetContext ?? LetBindingTargetContext.OverrideContext;
  const effectAllocation = input.allocateScopeEffect('let-effect');
  const effect = new LetBindingScopeEffect(
    effectAllocation.productHandle,
    effectAllocation.identityHandle,
    new RuntimeBindingReference(RuntimeBindingKind.Let, allocation.productHandle, allocation.identityHandle, instruction.sourceAddressHandle),
    input.owner?.productHandle ?? instruction.productHandle,
    input.owner?.identityHandle ?? instruction.identityHandle,
    instruction.target,
    instruction.expressionProductHandle,
    targetContext,
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingScopeEffectField>([
      'binding',
      'ownerInstruction',
      'target',
      'targetContext',
      'source',
    ]),
  );
  return new RuntimeRendererRenderResult(
    new LetBinding(
      allocation.productHandle,
      allocation.identityHandle,
      instruction.productHandle,
      instruction.identityHandle,
      input.renderer.toReference(),
      instruction.node,
      instruction.attribute,
      instruction.target,
      instruction.expressionProductHandle,
      targetContext,
      [effect.toReference()],
      instruction.sourceAddressHandle,
      input.fieldProvenance<RuntimeBindingField>([
        'instruction',
        'renderer',
        'node',
        'attribute',
        'expression',
        'target',
        'bindingKind',
        'scopeEffects',
        'source',
      ]),
    ),
    [effect],
  );
}

function renderListenerRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof ListenerBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new ListenerBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.eventName,
    instruction.expressionProductHandle,
    instruction.strategy,
    instruction.eventModifier,
    instruction.command,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>([
      'instruction',
      'renderer',
      'node',
      'attribute',
      'expression',
      'eventName',
      'listenerStrategy',
      instruction.eventModifier == null ? null : 'eventModifier',
      'bindingKind',
      'source',
    ]),
  ));
}

function renderInterpolationRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof InterpolationInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new InterpolationBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction.expressionProductHandles,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>([
      'instruction',
      'renderer',
      'node',
      instruction.attribute == null ? null : 'attribute',
      'expression',
      instruction.target == null ? null : 'target',
      'bindingKind',
      'source',
    ]),
  ));
}

function renderRefRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof RefBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new RefBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction.expressionProductHandle,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>(['instruction', 'renderer', 'node', 'attribute', 'expression', 'target', 'bindingKind', 'source']),
  ));
}

function renderContentRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof TextBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new ContentBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.expressionProductHandle,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>(['instruction', 'renderer', 'node', 'expression', 'bindingKind', 'source']),
  ));
}

function renderSpreadRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SpreadTransferedBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  const spreadBinding = new SpreadBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>(['instruction', 'renderer', 'node', 'attribute', 'bindingKind', 'source']),
  );
  const spreadCompile = input.compileSpread('compile-spread', instruction);
  if (spreadCompile.state === RuntimeRendererSpreadCompileState.Open && spreadCompile.summary != null) {
    input.recordOpenInstruction('compile-spread', spreadCompile.summary, spreadCompile.addressHandle);
  }
  if (spreadCompile.state === RuntimeRendererSpreadCompileState.Compiled) {
    input.renderCompiledSpreadInstructions('compiled-spread', spreadCompile.instructions, spreadBinding);
  }
  return new RuntimeRendererRenderResult(spreadBinding);
}

function renderSpreadValueRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof SpreadValueBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new SpreadValueBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction.expressionProductHandle,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>(['instruction', 'renderer', 'node', 'attribute', 'expression', 'target', 'bindingKind', 'source']),
  ));
}

function renderTranslationRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof TranslationBindingInstruction)
    && !(instruction instanceof TranslationBindBindingInstruction)
    && !(instruction instanceof TranslationParametersBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  const isParameterContext = instruction instanceof TranslationParametersBindingInstruction;
  return new RuntimeRendererRenderResult(new TranslationBinding(
    isParameterContext ? RuntimeBindingKind.TranslationParameters : RuntimeBindingKind.Translation,
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction instanceof TranslationBindingInstruction ? instruction.rawExpression : null,
    instruction instanceof TranslationBindingInstruction ? null : instruction.expressionProductHandle,
    isParameterContext,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>([
      'instruction',
      'renderer',
      'node',
      'attribute',
      instruction instanceof TranslationBindingInstruction ? 'rawExpression' : 'expression',
      'target',
      'bindingKind',
      isParameterContext ? 'isParameterContext' : null,
      'source',
    ]),
  ));
}

function renderStateRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof StateBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new StateBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.target,
    instruction.rawExpression,
    instruction.storeName,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>([
      'instruction',
      'renderer',
      'node',
      'attribute',
      'rawExpression',
      'target',
      instruction.storeName == null ? null : 'storeName',
      'bindingKind',
      'source',
    ]),
  ));
}

function renderDispatchRuntimeBinding(input: RuntimeRendererInvocation): RuntimeRendererRenderResult {
  const instruction = input.instruction;
  if (!(instruction instanceof DispatchBindingInstruction)) {
    return RuntimeRendererRenderResult.none();
  }
  const allocation = input.allocateBinding();
  return new RuntimeRendererRenderResult(new StateDispatchBinding(
    allocation.productHandle,
    allocation.identityHandle,
    instruction.productHandle,
    instruction.identityHandle,
    input.renderer.toReference(),
    instruction.node,
    instruction.attribute,
    instruction.eventName,
    instruction.rawExpression,
    instruction.storeName,
    [],
    instruction.sourceAddressHandle,
    input.fieldProvenance<RuntimeBindingField>([
      'instruction',
      'renderer',
      'node',
      'attribute',
      'eventName',
      'rawExpression',
      instruction.storeName == null ? null : 'storeName',
      'bindingKind',
      'source',
    ]),
  ));
}
