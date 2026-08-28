import type { ProductDetailReadView } from '../kernel/product-details.js';
import type {
  KernelMaterializationReadView,
  KernelReadProjectionRevisionView,
} from '../kernel/store.js';
import {
  BindableSetterKind,
  type BindableDefinition,
} from '../resources/bindable-definition.js';
import {
  CustomElementCaptureKind,
  type CustomElementCaptureDefinition,
  type CustomElementDefinition,
  type ShadowOptionsDefinition,
} from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type {
  ResourceDependencyReference,
  ResourceTargetReference,
} from '../resources/resource-reference.js';
import type { CompiledTemplate } from './compiled-template.js';
import {
  orderTemplateCompilerContextFamilyDefinitions,
  type TemplateCompilerContextFamilyValue,
  type TemplateCompilerContextFamilyValueContext,
} from './template-compiler-context-family-value.js';
import type { CompilerTransformedTemplateTree } from './template-structure.js';
import {
  TemplateCompilerRuntimeInstructionFamilyState,
  type TemplateCompilerRuntimeInstructionContextValue,
  type TemplateCompilerRuntimeInstructionFamilyResult,
  type TemplateCompilerRuntimeInstructionFamilyValue,
} from './template-instruction-runtime-value.js';

const compiledDefinitionFamilyAuthority = {};

export const enum TemplateCompilerCompiledDefinitionHeaderKind {
  RootResourceOverlay = 'root-resource-overlay',
  GeneratedChild = 'generated-child',
}

export const enum TemplateCompilerCompiledDefinitionNameKind {
  Declared = 'declared',
  CompilerGenerated = 'compiler-generated',
}

export class TemplateCompilerCompiledDefinitionName {
  constructor(
    readonly nameKind: TemplateCompilerCompiledDefinitionNameKind,
    readonly value: string | null,
  ) {
    if ((nameKind === TemplateCompilerCompiledDefinitionNameKind.Declared) !== (value != null && value.length > 0)) {
      throw new Error('Compiled-definition name lost declared or compiler-generated intent.');
    }
  }
}

/**
 * One normalized compiler view: the root preserves its complete resource base, while generated children use the
 * framework's sparse synthetic header profile. Artifact realization chooses concrete child names and JS encodings.
 */
export class TemplateCompilerCompiledDefinitionOverlay {
  readonly needsCompile = false as const;
  readonly type = ResourceDefinitionKind.CustomElement;
  readonly compilerAddedDependencies: readonly [] = [];

  constructor(
    readonly headerKind: TemplateCompilerCompiledDefinitionHeaderKind,
    readonly name: TemplateCompilerCompiledDefinitionName,
    readonly context: TemplateCompilerContextFamilyValueContext,
    readonly baseDefinition: CustomElementDefinition | null,
    readonly instructions: TemplateCompilerRuntimeInstructionContextValue,
  ) {
    const root = headerKind === TemplateCompilerCompiledDefinitionHeaderKind.RootResourceOverlay;
    if (
      root !== (baseDefinition != null)
      || (!root && name.nameKind !== TemplateCompilerCompiledDefinitionNameKind.CompilerGenerated)
      || instructions.context !== context
      || context.compiledTemplate.needsCompile !== false
    ) {
      throw new Error('Compiled-definition overlay lost root base, name, context, or final instruction ownership.');
    }
  }

  get compiledTemplate(): CompiledTemplate {
    return this.context.compiledTemplate;
  }

  get surrogateValues(): TemplateCompilerRuntimeInstructionContextValue['surrogates'] {
    return this.instructions.surrogates;
  }

  get template(): CompilerTransformedTemplateTree {
    return this.context.tree;
  }

  get containerless(): boolean {
    return this.baseDefinition?.containerless ?? false;
  }

  /** Framework `hasSlots` belongs to the root compiler context; generated child headers keep their default false. */
  get hasSlots(): boolean {
    return this.baseDefinition == null ? false : this.context.compiledTemplate.hasSlots;
  }

  get shadowOptions(): ShadowOptionsDefinition | null {
    return this.baseDefinition?.shadowOptions ?? null;
  }

  get enhance(): boolean {
    return this.baseDefinition?.enhance ?? false;
  }

  /** Null is the generated-child runtime default `false`; root capture retains its semantic callable authority. */
  get capture(): CustomElementCaptureDefinition | null {
    return this.baseDefinition?.capture ?? null;
  }

  get bindables(): readonly BindableDefinition[] {
    return this.baseDefinition?.bindables ?? [];
  }

  /** Exact while local-template child lanes remain an upstream family-compiler gate. */
  get dependencies(): readonly ResourceDependencyReference[] {
    return this.baseDefinition?.dependencies ?? [];
  }

  get executableType(): ResourceTargetReference | null {
    return this.baseDefinition?.target ?? null;
  }

  get processContent(): ResourceTargetReference | null {
    return this.baseDefinition?.processContent ?? null;
  }
}

export const enum TemplateCompilerCompiledDefinitionFamilyState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerCompiledDefinitionReasonKind {
  RuntimeInstructionFamilyUnavailable = 'runtime-instruction-family-unavailable',
  RuntimeInstructionFamilyMismatch = 'runtime-instruction-family-mismatch',
  StaleFamily = 'stale-family',
  ForeignProductDetailAuthority = 'foreign-product-detail-authority',
  RootDefinitionMaterializationUnavailable = 'root-definition-materialization-unavailable',
  RootDefinitionDetailUnavailable = 'root-definition-detail-unavailable',
  RootDefinitionDetailChanged = 'root-definition-detail-changed',
  RootDefinitionMetadataOpen = 'root-definition-metadata-open',
  CaptureOpen = 'capture-open',
  BindableSetterOpen = 'bindable-setter-open',
  CompilerAddedDependenciesUnavailable = 'compiler-added-dependencies-unavailable',
  ProductDetailProjectionChanged = 'product-detail-projection-changed',
}

export class TemplateCompilerCompiledDefinitionReason {
  constructor(
    readonly reasonKind: TemplateCompilerCompiledDefinitionReasonKind,
    readonly summary: string,
    readonly stableKeys: readonly string[] = [],
    readonly pending: boolean,
  ) {}
}

export class TemplateCompilerCompiledDefinitionFamilyValue {
  readonly #authority: object;
  readonly #definitionByContext: ReadonlyMap<
    TemplateCompilerContextFamilyValueContext,
    TemplateCompilerCompiledDefinitionOverlay
  >;

  constructor(
    authority: object,
    readonly family: TemplateCompilerContextFamilyValue,
    readonly instructionValues: TemplateCompilerRuntimeInstructionFamilyValue,
    readonly definitions: readonly TemplateCompilerCompiledDefinitionOverlay[],
    private readonly readView: TemplateCompilerCompiledDefinitionFamilyReadView,
    private readonly rootMaterializationOpenSeamHandles: readonly string[],
  ) {
    const orderedLocations = orderTemplateCompilerContextFamilyDefinitions(family);
    const instructionContextByFamilyContext = new Map(instructionValues.contexts.map((context) => [
      context.context,
      context,
    ]));
    this.#definitionByContext = new Map(definitions.map((definition) => [definition.context, definition]));
    if (
      authority !== compiledDefinitionFamilyAuthority
      || instructionValues.family !== family
      || !family.hasProductDetailAuthority(readView)
      || definitions.length !== family.contexts.length
      || definitions[0]?.headerKind !== TemplateCompilerCompiledDefinitionHeaderKind.RootResourceOverlay
      || definitions[0]?.baseDefinition !== family.rootDefinition
      || definitions.slice(1).some((definition) =>
        definition.headerKind !== TemplateCompilerCompiledDefinitionHeaderKind.GeneratedChild
      )
      || this.#definitionByContext.size !== definitions.length
      || rootMaterializationOpenSeamHandles.length !== 0
      || definitions.some((definition, index) =>
        definition.context !== orderedLocations[index]?.context
        || definition.instructions !== instructionContextByFamilyContext.get(definition.context)
      )
    ) {
      throw new Error('Compiled-definition family value lost family, instruction, root, or definition coverage.');
    }
    this.#authority = authority;
  }

  get root(): TemplateCompilerCompiledDefinitionOverlay {
    return this.definitions[0]!;
  }

  definitionForContext(
    context: TemplateCompilerContextFamilyValueContext,
  ): TemplateCompilerCompiledDefinitionOverlay | null {
    return this.#definitionByContext.get(context) ?? null;
  }

  isModuleConstructed(): boolean {
    return this.#authority === compiledDefinitionFamilyAuthority;
  }

  isCurrent(): boolean {
    if (!this.isModuleConstructed() || !this.family.isCurrent() || !this.instructionValues.isCurrent()) return false;
    const root = this.family.rootDefinition;
    if (root.productHandle == null) return false;
    const revision = this.readView.readProjectionRevision();
    const detail = this.readView.readProductDetail(ResourceProductDetails.Definition, root.productHandle);
    const closure = rootDefinitionMaterializationClosure(this.readView, root);
    return detail === root
      && closure != null
      && sameStrings(closure.openSeamHandles, this.rootMaterializationOpenSeamHandles)
      && revision.equals(this.readView.readProjectionRevision());
  }
}

export class TemplateCompilerCompiledDefinitionFamilyResult {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly state: TemplateCompilerCompiledDefinitionFamilyState,
    readonly value: TemplateCompilerCompiledDefinitionFamilyValue | null,
    readonly reasons: readonly TemplateCompilerCompiledDefinitionReason[],
  ) {
    const exact = state === TemplateCompilerCompiledDefinitionFamilyState.Exact;
    const unavailable = !exact;
    if (
      authority !== compiledDefinitionFamilyAuthority
      || exact !== (value != null && value.isModuleConstructed() && reasons.length === 0)
      || unavailable !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Compiled-definition family result lost exact or unavailable ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === compiledDefinitionFamilyAuthority;
  }
}

type TemplateCompilerCompiledDefinitionFamilyReadView = ProductDetailReadView
  & Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>
  & KernelReadProjectionRevisionView;

export interface TemplateCompilerCompiledDefinitionFamilyRequest {
  readonly family: TemplateCompilerContextFamilyValue;
  readonly instructions: TemplateCompilerRuntimeInstructionFamilyResult;
  readonly readView: TemplateCompilerCompiledDefinitionFamilyReadView;
}

/** Project one exact final family into the layered compiler-view contract consumed before runtime rehydration. */
export function projectTemplateCompilerCompiledDefinitionFamily(
  request: TemplateCompilerCompiledDefinitionFamilyRequest,
): TemplateCompilerCompiledDefinitionFamilyResult {
  if (
    !request.instructions.isModuleConstructed()
    || request.instructions.state !== TemplateCompilerRuntimeInstructionFamilyState.Exact
    || request.instructions.value == null
  ) {
    return unavailable(
      request.instructions.state === TemplateCompilerRuntimeInstructionFamilyState.Pending
        ? TemplateCompilerCompiledDefinitionFamilyState.Pending
        : TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
      TemplateCompilerCompiledDefinitionReasonKind.RuntimeInstructionFamilyUnavailable,
      'Compiled-definition projection requires one exact runtime instruction family.',
      request.instructions.reasons.map((reason) => reason.reasonKind),
    );
  }
  const instructionValues = request.instructions.value;
  if (instructionValues.family !== request.family) {
    return unavailable(
      TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
      TemplateCompilerCompiledDefinitionReasonKind.RuntimeInstructionFamilyMismatch,
      'Runtime instruction values belong to a different compiled context family.',
    );
  }
  if (!request.family.isCurrent() || !instructionValues.isCurrent()) {
    return unavailable(
      TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
      TemplateCompilerCompiledDefinitionReasonKind.StaleFamily,
      'Compiled-definition projection requires one current family and instruction value.',
    );
  }
  if (!request.family.hasProductDetailAuthority(request.readView)) {
    return unavailable(
      TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
      TemplateCompilerCompiledDefinitionReasonKind.ForeignProductDetailAuthority,
      'Compiled-definition projection requires the product-detail authority that constructed the family.',
    );
  }
  const revision = request.readView.readProjectionRevision();
  const root = request.family.rootDefinition;
  const reasons: TemplateCompilerCompiledDefinitionReason[] = [];
  if (root.productHandle == null) {
    reasons.push(new TemplateCompilerCompiledDefinitionReason(
      TemplateCompilerCompiledDefinitionReasonKind.RootDefinitionDetailUnavailable,
      'Root definition has no product identity for current detail validation.',
      [],
      true,
    ));
  } else {
    const currentRoot = request.readView.readProductDetail(ResourceProductDetails.Definition, root.productHandle);
    if (currentRoot == null) {
      reasons.push(new TemplateCompilerCompiledDefinitionReason(
        TemplateCompilerCompiledDefinitionReasonKind.RootDefinitionDetailUnavailable,
        'Root definition detail is unavailable from the current product-detail authority.',
        [],
        true,
      ));
    } else if (currentRoot !== root) {
      return unavailable(
        TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
        TemplateCompilerCompiledDefinitionReasonKind.RootDefinitionDetailChanged,
        'Root definition detail changed after context-family compilation.',
      );
    }
  }
  const rootMaterialization = rootDefinitionMaterializationClosure(request.readView, root);
  if (rootMaterialization == null) {
    reasons.push(new TemplateCompilerCompiledDefinitionReason(
      TemplateCompilerCompiledDefinitionReasonKind.RootDefinitionMaterializationUnavailable,
      'Root definition has no current materialization closure for compiled-header projection.',
      [],
      true,
    ));
  } else {
    const openSeamHandles = rootMaterialization.openSeamHandles;
    if (openSeamHandles.length > 0) {
      reasons.push(new TemplateCompilerCompiledDefinitionReason(
        TemplateCompilerCompiledDefinitionReasonKind.RootDefinitionMetadataOpen,
        'Root definition materialization retains unresolved metadata pressure.',
        openSeamHandles,
        true,
      ));
    }
  }
  if (root.capture.kind === CustomElementCaptureKind.Open) {
    reasons.push(new TemplateCompilerCompiledDefinitionReason(
      TemplateCompilerCompiledDefinitionReasonKind.CaptureOpen,
      'Root custom-element capture metadata is Open.',
      [],
      true,
    ));
  }
  for (const bindable of root.bindables) {
    if (bindable.set.kind !== BindableSetterKind.Open) continue;
    reasons.push(new TemplateCompilerCompiledDefinitionReason(
      TemplateCompilerCompiledDefinitionReasonKind.BindableSetterOpen,
      `Root bindable '${bindable.name}' has an Open runtime setter.`,
      [bindable.name],
      true,
    ));
  }
  if (request.family.compilerAddedDependencyIdentityHandles.length > 0) {
    reasons.push(new TemplateCompilerCompiledDefinitionReason(
      TemplateCompilerCompiledDefinitionReasonKind.CompilerAddedDependenciesUnavailable,
      'Compiler-created local dependency identities do not yet have generated constructable runtime values.',
      request.family.compilerAddedDependencyIdentityHandles,
      true,
    ));
  }
  if (!revision.equals(request.readView.readProjectionRevision())) {
    return unavailable(
      TemplateCompilerCompiledDefinitionFamilyState.Ineligible,
      TemplateCompilerCompiledDefinitionReasonKind.ProductDetailProjectionChanged,
      'Product-detail projection changed while compiled-definition metadata was being read.',
    );
  }
  if (reasons.length > 0) {
    return new TemplateCompilerCompiledDefinitionFamilyResult(
      compiledDefinitionFamilyAuthority,
      TemplateCompilerCompiledDefinitionFamilyState.Pending,
      null,
      reasons,
    );
  }
  const instructionContextByFamilyContext = new Map(instructionValues.contexts.map((context) => [
    context.context,
    context,
  ]));
  const definitions = orderTemplateCompilerContextFamilyDefinitions(request.family).map((location, index) => {
    const context = location.context;
    const instructionContext = instructionContextByFamilyContext.get(context) ?? null;
    if (instructionContext == null) {
      throw new Error(`Compiled definition '${context.compiledTemplate.productHandle}' has no instruction context.`);
    }
    const rootOverlay = index === 0;
    return new TemplateCompilerCompiledDefinitionOverlay(
      rootOverlay
        ? TemplateCompilerCompiledDefinitionHeaderKind.RootResourceOverlay
        : TemplateCompilerCompiledDefinitionHeaderKind.GeneratedChild,
      new TemplateCompilerCompiledDefinitionName(
        rootOverlay && root.name.length > 0
          ? TemplateCompilerCompiledDefinitionNameKind.Declared
          : TemplateCompilerCompiledDefinitionNameKind.CompilerGenerated,
        rootOverlay && root.name.length > 0 ? root.name : null,
      ),
      context,
      rootOverlay ? root : null,
      instructionContext,
    );
  });
  return new TemplateCompilerCompiledDefinitionFamilyResult(
    compiledDefinitionFamilyAuthority,
    TemplateCompilerCompiledDefinitionFamilyState.Exact,
    new TemplateCompilerCompiledDefinitionFamilyValue(
      compiledDefinitionFamilyAuthority,
      request.family,
      instructionValues,
      definitions,
      request.readView,
      rootMaterialization?.openSeamHandles ?? [],
    ),
    [],
  );
}

class RootDefinitionMaterializationClosure {
  constructor(readonly openSeamHandles: readonly string[]) {}
}

function rootDefinitionMaterializationClosure(
  readView: Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>,
  root: CustomElementDefinition,
): RootDefinitionMaterializationClosure | null {
  const ownerHandle = root.identityHandle ?? root.sourceAddressHandle;
  if (ownerHandle == null || root.productHandle == null) return null;
  const materializations = readView.readMaterializationsByOwner(ownerHandle)
    .filter((materialization) => materialization.productHandles.includes(root.productHandle!));
  if (materializations.length === 0) return null;
  return new RootDefinitionMaterializationClosure(
    [...new Set(materializations.flatMap((entry) => entry.openSeamHandles))].sort(),
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function unavailable(
  state: Exclude<
    TemplateCompilerCompiledDefinitionFamilyState,
    TemplateCompilerCompiledDefinitionFamilyState.Exact
  >,
  reasonKind: TemplateCompilerCompiledDefinitionReasonKind,
  summary: string,
  stableKeys: readonly string[] = [],
): TemplateCompilerCompiledDefinitionFamilyResult {
  return new TemplateCompilerCompiledDefinitionFamilyResult(
    compiledDefinitionFamilyAuthority,
    state,
    null,
    [new TemplateCompilerCompiledDefinitionReason(
      reasonKind,
      summary,
      stableKeys,
      state === TemplateCompilerCompiledDefinitionFamilyState.Pending,
    )],
  );
}
