import { Container } from '../di/container.js';
import { ContainerIdentity, ContainerIdentityKind } from '../kernel/identity.js';
import { EvidenceKind, EvidenceRecord, EvidenceRole } from '../kernel/evidence.js';
import type { AddressHandle, EvidenceHandle, ProvenanceHandle } from '../kernel/handles.js';
import { MaterializationRecord, MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import { KernelStoreBatch, type KernelStore, type KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  BuiltInResourceCatalogMaterializer,
  type BuiltInResourceEmission,
} from '../resources/built-in-resource-catalog-materializer.js';
import { RuntimeHtmlBuiltInResourceCatalogs } from '../resources/built-in-resources.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { BuiltInSyntaxCatalogMaterializer } from './built-in-syntax-catalog-materializer.js';
import { RuntimeHtmlBuiltInSyntaxCatalogs } from './built-in-syntax.js';
import { TemplateCompilerWorldKind } from './compiler-world.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import {
  TemplateCompilerWorldConstructionRequest,
  TemplateCompilerWorldMaterializer,
  type TemplateCompilerWorldEmission,
} from './compiler-world-materializer.js';
import { visibleResourceForDefinition } from './resource-scope-builder.js';
import { BuiltInRuntimeRendererCatalogMaterializer } from './runtime-renderer-catalog-materializer.js';
import { RuntimeHtmlDefaultRenderers, RuntimeRendererGroup, RuntimeRendererPackage } from './runtime-renderer.js';

class AuthoringContainerSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export interface TemplateAuthoringCompilerWorldRequest {
  /** Project key used only for stable local handles. */
  readonly projectKey: string;
  /** Resource definitions recognized in the project. */
  readonly resourceDefinitions: readonly FullResourceDefinition[];
}

/**
 * Constructs a standalone RuntimeHtml compiler world for authoring-time component analysis.
 *
 * App-root compiler worlds should remain the hydrated runtime lane. This authoring world is for LSP-like questions over
 * resource-library templates that have no modeled `Aurelia.app(...)` root yet, so it supplies RuntimeHtml's default
 * compiler syntax/renderers and the project-local resource definitions as compiler-visible inputs.
 */
export class TemplateAuthoringCompilerWorldMaterializer {
  private readonly compilerWorldMaterializer: TemplateCompilerWorldMaterializer;

  constructor(
    readonly store: KernelStore,
  ) {
    this.compilerWorldMaterializer = new TemplateCompilerWorldMaterializer(store);
  }

  construct(request: TemplateAuthoringCompilerWorldRequest): TemplateCompilerWorldEmission | null {
    const resources = visibleAuthoringResources(request.resourceDefinitions);
    if (resources.length === 0) {
      return null;
    }
    const sourceAddressHandle = null;
    const container = this.authoringContainer(request.projectKey, sourceAddressHandle);
    const containerRecords = this.recordsForAuthoringContainer(request.projectKey, container, sourceAddressHandle);
    if (containerRecords.length > 0) {
      this.store.commit(new KernelStoreBatch(containerRecords, `template-authoring-container:${request.projectKey}`));
    }
    const syntax = new BuiltInSyntaxCatalogMaterializer(this.store).materialize(Object.values(RuntimeHtmlBuiltInSyntaxCatalogs));
    const builtInResources = new BuiltInResourceCatalogMaterializer(this.store).materialize(Object.values(RuntimeHtmlBuiltInResourceCatalogs));
    const renderers = new BuiltInRuntimeRendererCatalogMaterializer(this.store).materialize([{
      packageId: RuntimeRendererPackage.RuntimeHtml,
      group: RuntimeRendererGroup.RuntimeHtmlDefaultRenderers,
      renderers: RuntimeHtmlDefaultRenderers,
    }]);
    return this.compilerWorldMaterializer.construct(new TemplateCompilerWorldConstructionRequest(
      `authoring:${request.projectKey}`,
      TemplateCompilerWorldKind.Component,
      container,
      null,
      [
        ...visibleBuiltInResources(builtInResources.resources),
        ...resources,
      ],
      syntax.attributePatterns,
      syntax.bindingCommands,
      renderers.renderers,
      TemplateResourceVisibilityKind.Configured,
      sourceAddressHandle,
    ));
  }

  private authoringContainer(
    projectKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): Container {
    return new Container(
      this.store.handles.product(`di-container:template-authoring:${projectKey}`),
      this.store.handles.identity(`di-container:template-authoring:${projectKey}`),
      ContainerIdentityKind.Root,
      null,
      null,
      sourceAddressHandle,
    );
  }

  private recordsForAuthoringContainer(
    projectKey: string,
    container: Container,
    sourceAddressHandle: AddressHandle | null,
  ): readonly KernelStoreRecord[] {
    if (this.store.readProduct(container.productHandle) != null) {
      return [];
    }
    const local = `di-container:template-authoring:${projectKey}`;
    const source = this.authoringContainerSource(local, sourceAddressHandle);
    return [
      ...source.records,
      ...this.authoringContainerProductRecords(local, container, source),
    ];
  }

  private authoringContainerSource(
    local: string,
    sourceAddressHandle: AddressHandle | null,
  ): AuthoringContainerSourceSet {
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const records = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope, EvidenceRole.TransformInput],
        'Template authoring compiler world uses a standalone root container for resource-library component analysis.',
        sourceAddressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new AuthoringContainerSourceSet(records, evidenceHandle, provenanceHandle, sourceAddressHandle);
  }

  private authoringContainerProductRecords(
    local: string,
    container: Container,
    source: AuthoringContainerSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new ContainerIdentity(
        container.identityHandle,
        ContainerIdentityKind.Root,
        null,
        null,
        source.sourceAddressHandle,
        'template-authoring',
      ),
      new MaterializedProduct(
        container.productHandle,
        KernelVocabulary.Di.Container.key,
        container.identityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        container.identityHandle,
        [container.productHandle],
        [],
      ),
    ];
  }
}

function visibleAuthoringResources(
  definitions: readonly FullResourceDefinition[],
): readonly TemplateVisibleResource[] {
  return definitions
    .map((definition) =>
      visibleResourceForDefinition(
        definition,
        TemplateResourceVisibilityKind.Local,
        definition.sourceAddressHandle,
      )
    )
    .filter((resource): resource is TemplateVisibleResource => resource != null);
}

function visibleBuiltInResources(
  resources: readonly BuiltInResourceEmission[],
): readonly TemplateVisibleResource[] {
  return resources.flatMap((emission) => {
    const resource = emission.resource;
    return [new TemplateVisibleResource(
      resource.resourceKind,
      resource.name,
      resource.aliases,
      resource.productHandle,
      resource.identityHandle,
      emission.definition?.productHandle ?? null,
      emission.definition,
      TemplateResourceVisibilityKind.Configured,
      resource.sourceAddressHandle,
    )];
  });
}
