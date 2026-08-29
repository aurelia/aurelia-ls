import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import { OpenSeam, OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { ComputationRun } from '../kernel/computation-lifecycle.js';
import type { KernelStore } from '../kernel/store.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { NamedResourceDefinitionContributionKind } from '../resources/resource-kind.js';
import {
  CssClassMappingOpenReason,
  CssClassMappingOpenReasonKind,
  deriveCssClassMappingForDependencies,
} from './css-class-mapping.js';
import {
  deriveTemplateCompilerHooksForDependencies,
  templateCompilerHooksInheritedByLocalDefinition,
  TemplateCompilerHookLane,
  TemplateCompilerHookOpenReason,
  TemplateCompilerHookOpenReasonKind,
} from './compiler-hook-world.js';
import {
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from './compiler-read-view.js';
import {
  TemplateCompilerWorldDerivationRequest,
  type TemplateCompilerWorldEmission,
  TemplateCompilerWorldMaterializer,
} from './compiler-world-materializer.js';
import { TemplateCompilerWorldKind } from './compiler-world.js';
import {
  TemplateResourceVisibilityKind,
  type TemplateVisibleResource,
} from './compiler-world-reference.js';
import { visibleResourceForDefinition } from './resource-scope-builder.js';

export type CompilerHookDependencyOpenReadView = Pick<
  KernelStore,
  'read' | 'readMaterializationsByOwner'
>;

export class TemplateCompilerWorldSelection {
  constructor(
    readonly world: TemplateCompilerWorldEmission,
    readonly authority: TemplateCompilerWorldAuthority,
  ) {}
}

/** Shared world transitions for one compiler invocation before/after direct local discovery. */
export class TemplateCompilerInvocationWorldMaterializer {
  private readonly materializer: TemplateCompilerWorldMaterializer;
  private readonly projector: TemplateCompilerWorldMaterializer | null;

  private constructor(
    readonly store: KernelStore | null,
    readonly publication: ComputationRun,
  ) {
    this.materializer = new TemplateCompilerWorldMaterializer(publication);
    this.projector = store == null ? null : new TemplateCompilerWorldMaterializer(store);
  }

  static committedReprojecting(
    store: KernelStore,
    publication: ComputationRun,
  ): TemplateCompilerInvocationWorldMaterializer {
    return new TemplateCompilerInvocationWorldMaterializer(store, publication);
  }

  static candidateStrict(publication: ComputationRun): TemplateCompilerInvocationWorldMaterializer {
    return new TemplateCompilerInvocationWorldMaterializer(null, publication);
  }

  constructPostLocalWorld(
    parentAuthority: TemplateCompilerWorldAuthority,
    definitions: readonly CustomElementDefinition[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateCompilerWorldSelection {
    this.requirePublishingLifetime();
    const localResources = this.localResources(definitions, sourceAddressHandle);
    const parent = parentAuthority.current();
    const world = this.materializer.constructDerived(this.postLocalRequest(
      parent,
      localResources,
      localKey,
      sourceAddressHandle,
    ));
    if (world === parent) return new TemplateCompilerWorldSelection(parent, parentAuthority);
    return new TemplateCompilerWorldSelection(
      world,
      new TemplateCompilerWorldAuthority(
        `template-compiler-world:${localKey}:local-template-world`,
        () => this.publication.isCurrent()
          ? world
          : this.projector?.projectDerived(this.postLocalRequest(
              parentAuthority.current(),
              localResources,
              localKey,
              sourceAddressHandle,
            )) ?? null,
      ),
    );
  }

  projectPostLocalWorld(
    parent: TemplateCompilerWorldEmission,
    definitions: readonly CustomElementDefinition[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateCompilerWorldEmission {
    return this.materializer.projectDerived(this.postLocalRequest(
      parent,
      this.localResources(definitions, sourceAddressHandle),
      localKey,
      sourceAddressHandle,
    ));
  }

  constructDefinitionHookWorld(
    parentAuthority: TemplateCompilerWorldAuthority,
    definition: CustomElementDefinition,
    appRootDefinitionProductHandle: ProductHandle | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateCompilerWorldSelection {
    this.requirePublishingLifetime();
    const parent = parentAuthority.current();
    const request = this.definitionHookRequest(
      parent,
      definition,
      appRootDefinitionProductHandle,
      localKey,
      sourceAddressHandle,
      this.publication,
    );
    const world = this.materializer.constructDerived(request);
    if (world === parent) return new TemplateCompilerWorldSelection(parent, parentAuthority);
    return new TemplateCompilerWorldSelection(
      world,
      new TemplateCompilerWorldAuthority(
        `template-compiler-world:${localKey}:hook-world`,
        () => this.publication.isCurrent()
          ? world
          : this.projector == null || this.store == null
            ? null
            : this.projector.projectDerived(this.definitionHookRequest(
              parentAuthority.current(),
              definition,
              appRootDefinitionProductHandle,
              localKey,
              sourceAddressHandle,
              this.store,
            )),
      ),
    );
  }

  projectDefinitionHookWorld(
    parent: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    appRootDefinitionProductHandle: ProductHandle | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    openReadView: CompilerHookDependencyOpenReadView = this.publication,
  ): TemplateCompilerWorldEmission {
    return this.materializer.projectDerived(this.definitionHookRequest(
      parent,
      definition,
      appRootDefinitionProductHandle,
      localKey,
      sourceAddressHandle,
      openReadView,
    ));
  }

  private localResources(
    definitions: readonly CustomElementDefinition[],
    sourceAddressHandle: AddressHandle | null,
  ): readonly TemplateVisibleResource[] {
    return definitions
      .map((definition) => visibleResourceForDefinition(
        definition,
        TemplateResourceVisibilityKind.Local,
        definition.sourceAddressHandle ?? sourceAddressHandle,
      ))
      .filter((resource): resource is TemplateVisibleResource => resource != null);
  }

  private postLocalRequest(
    parent: TemplateCompilerWorldEmission,
    localResources: readonly TemplateVisibleResource[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateCompilerWorldDerivationRequest {
    return new TemplateCompilerWorldDerivationRequest(
      `${localKey}:local-template-world`,
      TemplateCompilerWorldKind.Component,
      parent,
      localResources,
      TemplateResourceVisibilityKind.Configured,
      sourceAddressHandle,
    );
  }

  private definitionHookRequest(
    parent: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    appRootDefinitionProductHandle: ProductHandle | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    openReadView: CompilerHookDependencyOpenReadView,
  ): TemplateCompilerWorldDerivationRequest {
    const isLocalDefinition = definition.contributions.some((contribution) =>
      contribution.contributionKind === NamedResourceDefinitionContributionKind.LocalTemplate
    );
    const parentHooks = isLocalDefinition
      ? templateCompilerHooksInheritedByLocalDefinition(parent.compilerHooks.toCandidate())
      : parent.compilerHooks.toCandidate();
    const dependencyOpenSeams = this.resourceDependencyOpenSeams(definition, openReadView);
    const dependencyOpenReasons = dependencyOpenSeams.map((seam) => new TemplateCompilerHookOpenReason(
      TemplateCompilerHookOpenReasonKind.RegistryDependency,
      TemplateCompilerHookLane.Leaf,
      seam.summary,
      seam.addressHandle,
      [seam.handle],
    ));
    return new TemplateCompilerWorldDerivationRequest(
      `${localKey}:hook-world`,
      TemplateCompilerWorldKind.Component,
      parent,
      [],
      TemplateResourceVisibilityKind.Configured,
      sourceAddressHandle,
      null,
      deriveTemplateCompilerHooksForDependencies(
        parentHooks,
        definition.dependencies,
        isLocalDefinition
          || (definition.productHandle != null && definition.productHandle === appRootDefinitionProductHandle),
        dependencyOpenReasons,
      ),
      isLocalDefinition
        ? parent.cssClassMapping.toCandidate()
        : deriveCssClassMappingForDependencies(
            parent.cssClassMapping.toCandidate(),
            definition.dependencies,
            false,
            dependencyOpenSeams
              .filter((seam) => seam.reasonKinds.some((reasonKind) =>
                reasonKind === OpenSeamReasonKind.ResourceDefinitionDependenciesOpen
                || reasonKind === OpenSeamReasonKind.ResourceDefinitionDependencyEntryOpen
              ))
              .map((seam) => new CssClassMappingOpenReason(
                CssClassMappingOpenReasonKind.DependencySet,
                seam.summary,
                null,
                null,
                null,
                seam.addressHandle,
                [seam.handle],
              )),
          ),
    );
  }

  private resourceDependencyOpenSeams(
    definition: CustomElementDefinition,
    readView: CompilerHookDependencyOpenReadView,
  ): readonly OpenSeam[] {
    const ownerHandle = definition.identityHandle ?? definition.sourceAddressHandle;
    if (ownerHandle == null || definition.productHandle == null) return [];
    const openSeamHandles = readView.readMaterializationsByOwner(ownerHandle)
      .filter((materialization) => materialization.productHandles.includes(definition.productHandle!))
      .flatMap((materialization) => materialization.openSeamHandles);
    const seams: OpenSeam[] = [];
    const seen = new Set(openSeamHandles);
    for (const handle of seen) {
      const seam = readView.read(handle);
      if (
        !(seam instanceof OpenSeam)
        || !seam.reasonKinds.some((reasonKind) =>
          reasonKind === OpenSeamReasonKind.ResourceDefinitionDependenciesOpen
          || reasonKind === OpenSeamReasonKind.ResourceDefinitionDependencyEntryOpen
          || reasonKind === OpenSeamReasonKind.ResourceOpaqueRegistryEffectsOpen
        )
      ) continue;
      seams.push(seam);
    }
    return seams;
  }

  private requirePublishingLifetime(): void {
    if (this.store == null) {
      throw new Error('Candidate-only compiler invocation worlds may be projected but not published.');
    }
  }
}
