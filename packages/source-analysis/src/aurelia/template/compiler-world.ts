import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { AppRootReference } from '../configuration/app-root.js';
import type { ContainerReference } from '../di/container.js';
import {
  BindableBindingMode,
  BindableDefinition,
  BindableDefinitionReference,
  BindableSetterDefinition,
  BindableSetterKind,
} from '../resources/bindable-definition.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type {
  CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import type {
  FullResourceDefinition,
  TemplateCompilableResourceDefinition,
} from '../resources/resource-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  SpreadElementPropBindingInstruction,
  TemplateInstructionKind,
  type TemplateInstruction,
} from './instruction-ir.js';
import type {
  CompiledTemplate,
  TemplateRenderTarget,
} from './compiled-template.js';
import type { TemplateInstructionSequence } from './instruction-ir.js';
import {
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
} from './runtime-binding.js';
import {
  RuntimeRendererAllocation,
  RuntimeRendererInstructionOwner,
  RuntimeRendererInvocation,
  type RuntimeRenderer,
  type RuntimeRendererReference,
  type RuntimeRenderingRun,
} from './runtime-renderer.js';
import type {
  RuntimeControllerCreationInput,
  RuntimeControllerFrame,
} from './runtime-controller.js';

export const enum TemplateCompilerWorldKind {
  /** Compiler world for an app root or app-level container. */
  AppRoot = 'app-root',
  /** Compiler world for one component template. */
  Component = 'component',
  /** Compiler world for a synthetic view or template-controller child template. */
  SyntheticView = 'synthetic-view',
  /** Compiler world exists but its owner is still open. */
  Unknown = 'unknown',
}

export const enum TemplateCompilerServiceKind {
  /** Runtime TemplateCompiler service. */
  TemplateCompiler = 'template-compiler',
  /** Runtime IResourceResolver service for custom element/custom attribute lookup and bindable maps. */
  ResourceResolver = 'resource-resolver',
  /** Runtime IAttributeParser service for raw attribute syntax classification. */
  AttributeParser = 'attribute-parser',
  /** Runtime IBindingCommandResolver service for binding command lookup. */
  BindingCommandResolver = 'binding-command-resolver',
  /** Expression parser used by binding commands and renderers. */
  ExpressionParser = 'expression-parser',
  /** Attribute mapper used by binding commands and plain-attribute lowering. */
  AttributeMapper = 'attribute-mapper',
  /** Runtime Rendering service that dispatches lowered instructions to IRenderer products. */
  Rendering = 'rendering',
}

export const enum TemplateResourceVisibilityKind {
  /** Resource is visible through the current container. */
  Local = 'local',
  /** Resource is visible through an ancestor/root container. */
  Inherited = 'inherited',
  /** Resource is visible because compiler configuration injected it directly. */
  Configured = 'configured',
  /** Resource is the root component supplied to Aurelia.app(...). */
  AppRoot = 'app-root',
  /** Visibility is known to be requested but the container path is open. */
  Open = 'open',
}

export type TemplateCompilerWorldField =
  | 'worldKind'
  | 'appRoot'
  | 'container'
  | 'services'
  | 'resourceScope'
  | 'source';

/** Reference to a compiler world without expanding scope or service products. */
export class TemplateCompilerWorldReference {
  constructor(
    /** Product handle for the compiler world. */
    readonly productHandle: ProductHandle,
    /** Identity for the compiler world. */
    readonly identityHandle: IdentityHandle,
    /** Compiler world owner lane. */
    readonly worldKind: TemplateCompilerWorldKind,
    /** Container whose DI/resource state feeds compilation. */
    readonly container: ContainerReference,
    /** Source address for the world owner. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a compiler resource scope without expanding all visible resources. */
export class TemplateResourceScopeReference {
  constructor(
    /** Product handle for the resource scope. */
    readonly productHandle: ProductHandle,
    /** Identity for the resource scope. */
    readonly identityHandle: IdentityHandle,
    /** Container whose resource/factory/resolver state produced the scope. */
    readonly container: ContainerReference,
    /** Source address for the scope owner. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export type TemplateResourceScopeField =
  | 'container'
  | 'resources'
  | 'syntaxResources'
  | 'source';

export type TemplateCompilerServiceField =
  | 'serviceKind'
  | 'container'
  | 'resources'
  | 'renderers'
  | 'source';

export const enum TemplateResourceResolutionKind {
  /** Lookup closed over a full resource definition. */
  Definition = 'definition',
  /** Lookup closed only over a visible header or slot. */
  HeaderOnly = 'header-only',
}

/** Runtime-shaped bindable lookup entry owned by a resource definition. */
export class TemplateBindableReference {
  constructor(
    /** Runtime bindable definition metadata. */
    readonly definition: BindableDefinition,
    /** Durable reference for the nested bindable. */
    readonly reference: BindableDefinitionReference,
  ) {}
}

/** Runtime IElementBindablesInfo model for custom element definitions. */
@auLink('template-compiler:IElementBindablesInfo')
export class TemplateElementBindablesInfo {
  readonly primary = null;

  constructor(
    /** Attribute-name lookup entries. */
    readonly attrs: readonly TemplateBindableReference[],
    /** Property-name lookup entries. */
    readonly bindables: readonly TemplateBindableReference[],
  ) {}

  attr(attribute: string): TemplateBindableReference | null {
    return this.attrs.find((entry) => entry.definition.attribute === attribute) ?? null;
  }

  prop(name: string): TemplateBindableReference | null {
    return this.bindables.find((entry) => entry.definition.name === name) ?? null;
  }
}

/** Runtime IAttributeBindablesInfo model for custom attribute and template-controller definitions. */
@auLink('template-compiler:IAttributeBindablesInfo')
export class TemplateAttributeBindablesInfo {
  constructor(
    /** Attribute-name lookup entries. */
    readonly attrs: readonly TemplateBindableReference[],
    /** Property-name lookup entries. */
    readonly bindables: readonly TemplateBindableReference[],
    /** Primary bindable selected by defaultProperty, including runtime's implicit default when needed. */
    readonly primary: TemplateBindableReference,
  ) {}

  attr(attribute: string): TemplateBindableReference | null {
    return this.attrs.find((entry) => entry.definition.attribute === attribute) ?? null;
  }

  prop(name: string): TemplateBindableReference | null {
    return this.bindables.find((entry) => entry.definition.name === name) ?? null;
  }
}

export type TemplateBindablesInfo =
  | TemplateElementBindablesInfo
  | TemplateAttributeBindablesInfo;

/** Result of runtime-shaped IResourceResolver lookup inside one compiler world. */
export class TemplateResolvedResource {
  constructor(
    /** Whether the resolver closed over a full definition or only a visible header. */
    readonly resolutionKind: TemplateResourceResolutionKind,
    /** Visible resource row that answered the lookup. */
    readonly resource: TemplateVisibleResource | null,
    /** Full custom element/custom attribute definition when known. */
    readonly definition: TemplateCompilableResourceDefinition | null,
  ) {}
}

/** Resource definition visible to template compilation through DI/container lookup. */
export class TemplateVisibleResource {
  constructor(
    /** Resource kind visible to the compiler. */
    readonly resourceKind: ResourceDefinitionKind,
    /** Runtime lookup name such as element name, attribute name, converter name, or binding-command name. */
    readonly name: string,
    /** Other lookup names that resolve to the same resource product. */
    readonly aliases: readonly string[],
    /** Product handle for the visible resource model, which may be a header, full definition, or syntax executable. */
    readonly resourceProductHandle: ProductHandle | null,
    /** Identity handle for the visible resource model, when materialized. */
    readonly resourceIdentityHandle: IdentityHandle | null,
    /** Product handle for the full resource definition, when convergence has produced one. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Full definition detail visible to compiler and inquiry consumers, when known. */
    readonly definition: FullResourceDefinition | null,
    /** How this resource became visible to the compiler world. */
    readonly visibilityKind: TemplateResourceVisibilityKind,
    /** Source address for the registration, definition, import, or convention that made it visible. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Reference to a compiler service without retaining a runtime singleton instance. */
export class TemplateCompilerServiceReference {
  constructor(
    /** Service lane represented by this reference. */
    readonly serviceKind: TemplateCompilerServiceKind,
    /** Product handle for the service model, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for the service model, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Source address for the lookup or registration that produced this service. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Kernel-materialization host used by the runtime Rendering service emulation. */
export interface TemplateRenderingRunHost {
  allocate(local: string): RuntimeRendererAllocation;

  createChildController(input: RuntimeControllerCreationInput): RuntimeControllerFrame | null;
}

/** Input to the runtime Rendering service dispatch loop. */
export class TemplateRenderingRunInput {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Compiled-template product whose rows are being spent by Rendering. */
    readonly compiledTemplate: CompiledTemplate,
    /** Render targets paired with their instruction rows. */
    readonly targets: readonly TemplateRenderingTargetInput[],
    /** All compiled instruction products, including nested hydrate props not directly present in target rows. */
    readonly instructions: readonly TemplateInstruction[],
    /** Current runtime controller that receives renderer-created bindings. */
    readonly rootController: RuntimeControllerFrame,
    /** Provenance to attach to renderer-created binding models. */
    readonly provenanceHandle: ProvenanceHandle,
    /** Kernel-materialization operations needed when the runtime render loop creates products. */
    readonly host: TemplateRenderingRunHost,
  ) {}
}

/** One compiled-template row as consumed by runtime Rendering. */
export class TemplateRenderingTargetInput {
  constructor(
    /** Compiler-produced render target corresponding to one runtime target node. */
    readonly target: TemplateRenderTarget,
    /** Instruction sequence paired with the target. */
    readonly sequence: TemplateInstructionSequence,
    /** Hydrated instruction products in row order. */
    readonly instructions: readonly TemplateInstruction[],
  ) {}
}

/** One instruction that the runtime Rendering service spent through an IRenderer. */
export class TemplateRenderedInstruction {
  constructor(
    readonly local: string,
    readonly target: TemplateRenderTarget,
    readonly instruction: TemplateInstruction,
    readonly renderer: RuntimeRenderer,
    readonly renderingController: RuntimeControllerFrame,
    readonly targetController: RuntimeControllerFrame,
    readonly bindings: readonly RuntimeBinding[],
    readonly scopeEffects: readonly RuntimeBindingScopeEffect[],
    readonly createdControllers: readonly RuntimeControllerFrame[],
  ) {}
}

/** Runtime Rendering dispatch pressure that could not close over a concrete renderer/input. */
export class TemplateRenderingOpenInstruction {
  constructor(
    readonly local: string,
    readonly summary: string,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Result of emulating the runtime Rendering.render loop over lowered instruction products. */
export class TemplateRenderingRunResult {
  get bindings(): readonly RuntimeBinding[] {
    return this.renderedInstructions.flatMap((rendered) => rendered.bindings);
  }

  get scopeEffects(): readonly RuntimeBindingScopeEffect[] {
    return this.renderedInstructions.flatMap((rendered) => rendered.scopeEffects);
  }

  get controllers(): readonly RuntimeControllerFrame[] {
    const seen = new Set<ProductHandle>();
    const controllers: RuntimeControllerFrame[] = [];
    const push = (controller: RuntimeControllerFrame): void => {
      if (seen.has(controller.productHandle)) {
        return;
      }
      seen.add(controller.productHandle);
      controllers.push(controller);
    };
    push(this.rootController);
    for (const rendered of this.renderedInstructions) {
      push(rendered.renderingController);
      push(rendered.targetController);
      for (const child of rendered.createdControllers) {
        push(child);
      }
    }
    return controllers;
  }

  constructor(
    readonly rootController: RuntimeControllerFrame,
    readonly renderedInstructions: readonly TemplateRenderedInstruction[],
    readonly openInstructions: readonly TemplateRenderingOpenInstruction[],
  ) {}
}

/** Resource and syntax-resource scope visible to a template compiler world. */
export class TemplateResourceScope {
  constructor(
    /** Product handle for the materialized-product envelope that represents this scope. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled resource scope. */
    readonly identityHandle: IdentityHandle,
    /** Container whose resource/factory/resolver state produced the scope. */
    readonly container: ContainerReference,
    /** Custom elements, custom attributes, template controllers, value converters, binding behaviors, and commands. */
    readonly resources: readonly TemplateVisibleResource[],
    /** Attribute patterns and other parser syntax resources available to the compiler. */
    readonly syntaxResources: readonly TemplateVisibleResource[],
    /** Source address for the scope owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateResourceScopeField>[] = [],
  ) {}

  toReference(): TemplateResourceScopeReference {
    return new TemplateResourceScopeReference(
      this.productHandle,
      this.identityHandle,
      this.container,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime ResourceResolver/IResourceResolver service as a product model. */
@auLink('runtime-html:ResourceResolver')
export class TemplateResourceResolverService {
  private readonly _elementCache = new Map<string, TemplateResolvedResource | null>();
  private readonly _attributeCache = new Map<string, TemplateResolvedResource | null>();
  private readonly _bindableCache = new WeakMap<TemplateCompilableResourceDefinition, TemplateBindablesInfo>();

  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used by resolver lookups. */
    readonly container: ContainerReference,
    /** Resource rows visible to this resolver through the current compiler world. */
    readonly resources: readonly TemplateVisibleResource[],
    /** Source address for the resolver registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  /** Runtime `IResourceResolver.el(container, name)` shape with the container already fixed by this world. */
  el(name: string): TemplateResolvedResource | null {
    const key = name.toLowerCase();
    if (this._elementCache.has(key)) {
      return this._elementCache.get(key) ?? null;
    }
    const resource = this.resources.find((candidate) =>
      candidate.resourceKind === ResourceDefinitionKind.CustomElement
      && matchesVisibleResourceName(candidate, key)
    ) ?? null;
    const result = resource == null ? null : resolvedResource(resource);
    this._elementCache.set(key, result);
    return result;
  }

  /** Runtime `IResourceResolver.attr(container, name)` shape with the container already fixed by this world. */
  attr(name: string): TemplateResolvedResource | null {
    const key = name.toLowerCase();
    if (this._attributeCache.has(key)) {
      return this._attributeCache.get(key) ?? null;
    }
    const resource = this.resources.find((candidate) =>
      (candidate.resourceKind === ResourceDefinitionKind.CustomAttribute
        || candidate.resourceKind === ResourceDefinitionKind.TemplateController)
      && matchesVisibleResourceName(candidate, key)
    ) ?? null;
    const result = resource == null ? null : resolvedResource(resource);
    this._attributeCache.set(key, result);
    return result;
  }

  bindables(definition: CustomElementDefinition): TemplateElementBindablesInfo;
  bindables(definition: CustomAttributeDefinition): TemplateAttributeBindablesInfo;
  bindables(definition: TemplateCompilableResourceDefinition): TemplateBindablesInfo {
    const cached = this._bindableCache.get(definition);
    if (cached != null) {
      return cached;
    }
    const info = definition.type === ResourceDefinitionKind.CustomElement
      ? new TemplateElementBindablesInfo(
        bindableReferences(definition.productHandle, definition.sourceAddressHandle, definition.bindables, false),
        bindableReferences(definition.productHandle, definition.sourceAddressHandle, definition.bindables, false),
      )
      : attributeBindablesInfo(definition);
    this._bindableCache.set(definition, info);
    return info;
  }

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.ResourceResolver,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime IExpressionParser service model used through the compiler-world parser contract. */
@auLink('expression-parser:IExpressionParser')
export class TemplateExpressionParserService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve the parser service. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.ExpressionParser,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime AttrMapper service model used through the compiler-world mapper contract. */
@auLink('runtime-html:AttrMapper')
export class TemplateAttributeMapperService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve the mapper service. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.AttributeMapper,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime Rendering service model used to select instruction renderers. */
@auLink('runtime-html:Rendering')
export class TemplateRenderingService {
  private readonly _rendererByInstructionKind = new Map<TemplateInstructionKind, RuntimeRenderer>();

  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve the rendering service. */
    readonly container: ContainerReference,
    /** Runtime renderers visible through the current compiler-world container/configuration. */
    readonly renderers: readonly RuntimeRenderer[],
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {
    for (const renderer of renderers) {
      if (!this._rendererByInstructionKind.has(renderer.targetInstructionKind)) {
        this._rendererByInstructionKind.set(renderer.targetInstructionKind, renderer);
      }
    }
  }

  rendererForInstructionKind(kind: TemplateInstructionKind): RuntimeRenderer | null {
    return this._rendererByInstructionKind.get(kind) ?? null;
  }

  rendererReferenceForInstructionKind(kind: TemplateInstructionKind): RuntimeRendererReference | null {
    return this.rendererForInstructionKind(kind)?.toReference() ?? null;
  }

  /** Runtime `Rendering.render(...)` dispatch loop over already-lowered instruction products. */
  render(input: TemplateRenderingRunInput): TemplateRenderingRunResult {
    return new TemplateRenderingRun(this, input).render();
  }

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.Rendering,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }

}

class TemplateRenderingRun implements RuntimeRenderingRun {
  readonly provenanceHandle: ProvenanceHandle;

  private readonly renderedInstructions: TemplateRenderedInstruction[] = [];
  private readonly openInstructions: TemplateRenderingOpenInstruction[] = [];
  private readonly instructionsByProduct: ReadonlyMap<ProductHandle, TemplateInstruction>;
  private readonly consumed = new Set<ProductHandle>();

  constructor(
    private readonly rendering: TemplateRenderingService,
    private readonly input: TemplateRenderingRunInput,
  ) {
    this.provenanceHandle = input.provenanceHandle;
    this.instructionsByProduct = new Map(input.instructions
      .map((instruction) => [instruction.productHandle, instruction]));
  }

  render(): TemplateRenderingRunResult {
    this.input.targets.forEach((target, targetIndex) => {
      target.instructions.forEach((instruction, instructionIndex) => {
        if (this.consumed.has(instruction.productHandle)) {
          return;
        }
        this.consumeInstruction(instruction.productHandle);
        this.renderInstruction(
          `${this.input.localKey}:target:${targetIndex}:instruction:${instructionIndex}`,
          instruction,
          null,
          this.input.rootController,
          this.input.rootController,
          target.target,
        );
      });
    });

    return new TemplateRenderingRunResult(
      this.input.rootController,
      this.renderedInstructions,
      this.openInstructions,
    );
  }

  allocate(local: string): RuntimeRendererAllocation {
    return this.input.host.allocate(local);
  }

  createChildController(input: RuntimeControllerCreationInput): RuntimeControllerFrame | null {
    return this.input.host.createChildController(input);
  }

  readInstruction(productHandle: ProductHandle): TemplateInstruction | null {
    return this.instructionsByProduct.get(productHandle) ?? null;
  }

  consumeInstruction(productHandle: ProductHandle): void {
    this.consumed.add(productHandle);
  }

  renderInstruction(
    local: string,
    instruction: TemplateInstruction,
    owner: RuntimeRendererInstructionOwner | null,
    renderingController: RuntimeControllerFrame,
    targetController: RuntimeControllerFrame,
    target = this.defaultTarget(),
  ): void {
    if (instruction instanceof SpreadElementPropBindingInstruction) {
      const wrappedInstruction = this.readInstruction(instruction.instructionProductHandle);
      if (wrappedInstruction == null || wrappedInstruction === instruction) {
        this.openInstructions.push(new TemplateRenderingOpenInstruction(
          `${local}:missing-spread-element-prop-instruction`,
          `Spread element prop instruction '${instruction.productHandle}' references an inner instruction that is not present in the lowering emission.`,
          instruction.sourceAddressHandle,
        ));
        return;
      }
      this.consumeInstruction(wrappedInstruction.productHandle);
      this.renderInstruction(
        `${local}:spread-element-prop`,
        wrappedInstruction,
        owner,
        renderingController,
        targetController,
        target,
      );
      return;
    }

    const renderer = owner?.rendererOverride ?? this.rendering.rendererForInstructionKind(instruction.instructionKind);
    if (renderer == null || renderer.productHandle == null) {
      this.openInstructions.push(new TemplateRenderingOpenInstruction(
        `${local}:missing-renderer`,
        `No configured runtime renderer was available for instruction kind '${instruction.instructionKind}'.`,
        instruction.sourceAddressHandle,
      ));
      return;
    }

    const result = renderer.render(new RuntimeRendererInvocation(
      local,
      instruction,
      renderer,
      owner,
      renderingController,
      targetController,
      target,
      this,
    ));
    for (const binding of result.bindings) {
      renderingController.addBinding(binding);
    }
    this.renderedInstructions.push(new TemplateRenderedInstruction(
      local,
      target,
      instruction,
      renderer,
      renderingController,
      targetController,
      result.bindings,
      result.scopeEffects,
      result.createdControllers,
    ));
  }

  private defaultTarget(): TemplateRenderTarget {
    return this.input.targets[0]?.target
      ?? this.input.compiledTemplate.targets[0]!;
  }
}

/** Runtime TemplateCompiler service as a product model. */
@auLink('template-compiler:TemplateCompiler')
export class TemplateCompilerService {
  constructor(
    /** Product handle for the materialized-product envelope that represents this service. */
    readonly productHandle: ProductHandle,
    /** Identity for this service model. */
    readonly identityHandle: IdentityHandle,
    /** Container used to resolve compiler collaborators. */
    readonly container: ContainerReference,
    /** Source address for the service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerServiceField>[] = [],
  ) {}

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.TemplateCompiler,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Compiler-facing world used by HTML parsing, attribute classification, and lowering. */
export class TemplateCompilerWorld {
  constructor(
    /** Product handle for the materialized-product envelope that represents this compiler world. */
    readonly productHandle: ProductHandle,
    /** Identity for this compiler world. */
    readonly identityHandle: IdentityHandle,
    /** Compiler world owner lane. */
    readonly worldKind: TemplateCompilerWorldKind,
    /** AppRoot boundary that owns this world, if known. */
    readonly appRoot: AppRootReference | null,
    /** Container whose DI/resource state feeds compilation. */
    readonly container: ContainerReference,
    /** Resource/syntax scope visible to this compiler world. */
    readonly resourceScopeProductHandle: ProductHandle | null,
    /** Compiler services visible to this compiler world. */
    readonly services: readonly TemplateCompilerServiceReference[],
    /** Source address for the world owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerWorldField>[] = [],
  ) {}

  toReference(): TemplateCompilerWorldReference {
    return new TemplateCompilerWorldReference(
      this.productHandle,
      this.identityHandle,
      this.worldKind,
      this.container,
      this.sourceAddressHandle,
    );
  }
}

function matchesVisibleResourceName(
  resource: TemplateVisibleResource,
  lookupName: string,
): boolean {
  return resource.name.toLowerCase() === lookupName
    || resource.aliases.some((alias) => alias.toLowerCase() === lookupName);
}

function resolvedResource(resource: TemplateVisibleResource): TemplateResolvedResource {
  const definition = isTemplateCompilableDefinition(resource.definition)
    ? resource.definition
    : null;
  return new TemplateResolvedResource(
    definition == null
      ? TemplateResourceResolutionKind.HeaderOnly
      : TemplateResourceResolutionKind.Definition,
    resource,
    definition,
  );
}

function isTemplateCompilableDefinition(
  definition: FullResourceDefinition | null,
): definition is TemplateCompilableResourceDefinition {
  return definition != null
    && (definition.type === ResourceDefinitionKind.CustomElement
      || definition.type === ResourceDefinitionKind.CustomAttribute);
}

function bindableReferences(
  ownerDefinitionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  bindables: readonly BindableDefinition[],
  isImplicitDefault: boolean,
): readonly TemplateBindableReference[] {
  return bindables.map((bindable) => new TemplateBindableReference(
    bindable,
    new BindableDefinitionReference(
      ownerDefinitionProductHandle,
      bindable.name,
      bindable.attribute,
      bindable.sourceAddressHandle ?? sourceAddressHandle,
      isImplicitDefault,
    ),
  ));
}

function attributeBindablesInfo(definition: CustomAttributeDefinition): TemplateAttributeBindablesInfo {
  const attrs = [
    ...bindableReferences(definition.productHandle, definition.sourceAddressHandle, definition.bindables, false),
  ];
  const bindables = bindableReferences(definition.productHandle, definition.sourceAddressHandle, definition.bindables, false);
  let primary = bindables.find((entry) => entry.definition.name === definition.defaultProperty) ?? null;
  if (primary == null) {
    const implicit = new BindableDefinition(
      definition.defaultProperty,
      `${definition.defaultProperty}Changed`,
      BindableBindingMode.ToView,
      definition.defaultProperty,
      new BindableSetterDefinition(BindableSetterKind.Default),
    );
    primary = new TemplateBindableReference(
      implicit,
      new BindableDefinitionReference(
        definition.productHandle,
        implicit.name,
        implicit.attribute,
        definition.sourceAddressHandle,
        true,
      ),
    );
    attrs.push(primary);
  }
  return new TemplateAttributeBindablesInfo(attrs, bindables, primary);
}
