import { createHash } from 'node:crypto';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import type { KernelStore } from '../kernel/store.js';
import type { BuiltInResource, BuiltInResourceCatalog } from '../resources/built-in-resources.js';
import {
  builtInResourcePackageModuleSpecifier,
} from '../resources/built-in-resources.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import {
  taxonomyResourceKindForDefinition,
} from '../resources/resource-definition.js';
import { ResourceDefinitionHeaderEmission } from '../resources/resource-definition-header-emission.js';
import {
  registrationResourceKindFor,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { TemplateVisibleResource } from '../template/compiler-world-reference.js';
import { TemplateResourceVisibilityKind } from '../template/compiler-world-reference.js';
import {
  readVisibleTemplateResourceDefinition,
  readVisibleTemplateResourceHeader,
} from '../template/compiler-resource-lookup.js';
import {
  templateResourceCursorSelections,
  type TemplateResourceCursorSelection,
} from './template-completion.js';
import {
  SEMANTIC_RESOURCE_INVENTORY_KINDS,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryMetadataState,
  SemanticResourceInventoryOriginKind,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticTemplateResourceAvailabilityState,
  type SemanticResourceDefinitionRow,
  type SemanticResourceInventoryCompleteness,
  type SemanticResourceInventoryKind,
  type SemanticResourceInventoryOrigin,
  type SemanticResourceInventoryResult,
  type SemanticResourceInventoryRow,
  type SemanticResourceInventorySources,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimeSourceCursorInput,
  type SemanticTemplateResourceAvailabilityResult,
  type SemanticTemplateResourceScopeCandidate,
} from './contracts.js';
import {
  answer,
  pageRows,
} from './answer-helpers.js';
import {
  readResourceDefinitionRow,
} from './resource-projections.js';
import {
  describeAddress,
  semanticExactSourceReference,
  semanticSourceReferenceKey,
  type SemanticSourceReference,
} from './source-reference.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';

interface BuiltInResourceFacts {
  readonly resource: BuiltInResource;
  readonly catalog: BuiltInResourceCatalog;
}

class ResourceInventoryCandidate {
  readonly visibilityRows: TemplateVisibleResource[] = [];
  builtIn: BuiltInResourceFacts | null = null;
  definition: FullResourceDefinition | null = null;
  definitionRow: SemanticResourceDefinitionRow | null = null;
  header: ResourceDefinitionHeaderEmission | BuiltInResource | null = null;
  localOwnerHandle: IdentityHandle | ProductHandle | null = null;
  identityKey: string | null = null;

  constructor(
    readonly internalKey: string,
    readonly resourceKind: SemanticResourceInventoryKind,
    readonly name: string,
    readonly resourceIdentityHandle: IdentityHandle | null,
    readonly resourceProductHandle: ProductHandle | null,
    readonly definitionProductHandle: ProductHandle | null,
  ) {}
}

interface ResourceInventoryProjection {
  readonly rows: readonly SemanticResourceInventoryRow[];
  readonly completeness: SemanticResourceInventoryCompleteness;
  readonly rowByCandidate: ReadonlyMap<ResourceInventoryCandidate, SemanticResourceInventoryRow>;
  readonly candidateByVisibleResource: ReadonlyMap<TemplateVisibleResource, ResourceInventoryCandidate>;
}

/** Project the selected app's resource definitions and effective compiler catalogs without leaking kernel handles. */
export function readSemanticResourceInventory(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  page?: SemanticRuntimePageInput,
): SemanticRuntimeAnswer<SemanticResourceInventoryResult> {
  const projection = new ResourceInventoryBuilder(emission, store).read();
  const paged = pageRows(projection.rows, page);
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Returned ${paged.rows.length} of ${projection.rows.length} runtime resource row(s) for ${emission.project.projectKey}.`,
    {
      displayText: resourceInventoryDisplayText(paged.rows, projection.rows.length, projection.completeness),
      projectKey: emission.project.projectKey,
      projectRoot: emission.project.rootDir,
      rows: paged.rows,
      completeness: projection.completeness,
    },
    {
      selection: SemanticRuntimeAnswerSelection.NotApplicable,
      coverage: resourceInventoryCoverage(projection.completeness),
      page: paged.page,
    },
  );
}

/** Project the effective resource scope for every equally specific compiled-template candidate at one cursor. */
export function readSemanticTemplateResourceAvailability(
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  requestedScopeIdentityKey: string | null | undefined,
): SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult> {
  const projection = new ResourceInventoryBuilder(emission, store).read();
  const emptyValue = (
    displayText: string,
    candidates: readonly SemanticTemplateResourceScopeCandidate[] = [],
  ): SemanticTemplateResourceAvailabilityResult => ({
    displayText,
    projectKey: emission.project.projectKey,
    projectRoot: emission.project.rootDir,
    selectedTemplate: null,
    candidates,
    rows: [],
    completeness: projection.completeness,
  });
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Template resource availability requires a source cursor.',
      emptyValue('No template cursor was supplied.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    );
  }
  const resolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    emission.project.rootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (resolution.cursor?.offset == null) {
    const summary = resolution.summary ?? 'The supplied template cursor could not be resolved.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    );
  }

  const selections = templateResourceCursorSelections(
    store,
    emission,
    resolution.cursor.filePath,
    resolution.cursor.offset,
  );
  const selectedScopes = distinctTemplateScopeSelections(
    selections.map((selection) => templateScopeSelection(emission, store, projection, selection)),
  );
  if (selectedScopes.length === 0) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'No compiled template resource was available for the supplied source cursor.',
      emptyValue('No compiled template owns this cursor.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    );
  }
  const requestedScope = requestedScopeIdentityKey == null
    ? null
    : selectedScopes.find((selection) => selection.candidate.scopeIdentityKey === requestedScopeIdentityKey) ?? null;
  if (requestedScopeIdentityKey != null && requestedScope == null) {
    const candidates = selectedScopes.map((selection) => selection.candidate);
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'The requested template compiler scope is not available at the current source cursor.',
      emptyValue('Choose a current template compiler scope before inspecting available resources.', candidates),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    );
  }
  if (requestedScope == null && selectedScopes.length > 1) {
    const candidates = selectedScopes.map((selection) => selection.candidate);
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      `The source cursor belongs to ${candidates.length} equally specific template compiler scopes.`,
      emptyValue('Choose a template compiler scope before inspecting available resources.', candidates),
      {
        selection: SemanticRuntimeAnswerSelection.Ambiguous,
        coverage: SemanticRuntimeAnswerCoverage.Complete,
      },
    );
  }

  const selected = requestedScope ?? selectedScopes[0]!;
  const rows = selected.selection.resource.compilation.compilerWorld.resourceScope.resources
    .map((visibleResource) => {
      const candidate = projection.candidateByVisibleResource.get(visibleResource);
      const resource = candidate == null ? null : projection.rowByCandidate.get(candidate) ?? null;
      return resource == null
        ? null
        : {
            resource,
            state: visibleResource.visibilityKind === TemplateResourceVisibilityKind.Open
              ? SemanticTemplateResourceAvailabilityState.Open
              : SemanticTemplateResourceAvailabilityState.Available,
            visibilityKind: visibleResource.visibilityKind,
            availabilitySource: describeAddress(store, visibleResource.sourceAddressHandle),
          };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
  const coverage = rows.some((row) => row.state === SemanticTemplateResourceAvailabilityState.Open)
    ? SemanticRuntimeAnswerCoverage.Open
    : resourceInventoryCoverage(projection.completeness);
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Returned ${rows.length} resource(s) available to ${selected.candidate.definitionName}.`,
    {
      displayText: `${selected.candidate.definitionName}: ${rows.length} available runtime resource(s).`,
      projectKey: emission.project.projectKey,
      projectRoot: emission.project.rootDir,
      selectedTemplate: selected.candidate,
      candidates: [selected.candidate],
      rows,
      completeness: projection.completeness,
    },
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage,
    },
  );
}

class ResourceInventoryBuilder {
  private readonly candidates: ResourceInventoryCandidate[] = [];
  private readonly candidatesByHandle = new Map<string, ResourceInventoryCandidate>();
  private readonly candidatesByFallback = new Map<string, ResourceInventoryCandidate>();
  private readonly candidateByVisibleResource = new Map<TemplateVisibleResource, ResourceInventoryCandidate>();
  private readonly excludedCompilerSyntax = new Set<string>();
  private unnamedDefinitions = 0;

  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
  ) {}

  read(): ResourceInventoryProjection {
    this.readProjectDefinitions();
    this.readConfiguredBuiltIns();
    this.readCompiledDefinitions();
    this.readProjectHeaders();
    this.readCompilerVisibility();

    const rowByCandidate = new Map<ResourceInventoryCandidate, SemanticResourceInventoryRow>();
    const rows = this.candidates.map((candidate) => {
      const row = this.rowForCandidate(candidate);
      rowByCandidate.set(candidate, row);
      return row;
    }).sort(compareInventoryRows);
    const completeness = this.completeness(rows);
    return {
      rows,
      completeness,
      rowByCandidate,
      candidateByVisibleResource: this.candidateByVisibleResource,
    };
  }

  private readProjectDefinitions(): void {
    for (const definition of this.emission.resources.readDefinitions()) {
      if (!isInventoryKind(taxonomyResourceKindForDefinition(definition))) {
        this.rememberExcludedDefinition(definition);
        continue;
      }
      this.applyDefinition(definition, null);
    }
  }

  private readConfiguredBuiltIns(): void {
    const configured = this.emission.appWorld.configuredResources.catalogEmission;
    const catalogsByProduct = new Map(configured.catalogs.map((catalog) => [catalog.productHandle, catalog]));
    for (const builtIn of configured.resources) {
      const catalog = catalogsByProduct.get(builtIn.catalogProductHandle);
      if (catalog == null || !isInventoryKind(builtIn.resource.resourceKind)) {
        continue;
      }
      const candidate = builtIn.definition == null
        ? this.applyHeader(builtIn.resource)
        : this.applyDefinition(builtIn.definition, null);
      candidate.builtIn = { resource: builtIn.resource, catalog };
      this.registerCandidateHandles(candidate, {
        resourceIdentityHandle: builtIn.resource.identityHandle,
        resourceProductHandle: builtIn.resource.productHandle,
        definitionProductHandle: builtIn.definition?.productHandle ?? null,
      });
    }
  }

  private readCompiledDefinitions(): void {
    for (const resource of [...this.emission.templates.resources, ...this.emission.templates.authoringResources]) {
      const definition = resource.compilation.definition;
      if (!isInventoryKind(taxonomyResourceKindForDefinition(definition))) {
        continue;
      }
      const definitionOwner = definition.identityHandle ?? definition.productHandle;
      const localOwnerHandle = definitionOwner !== resource.compilation.familyOwnerHandle
        ? resource.compilation.familyOwnerHandle
        : null;
      this.applyDefinition(definition, localOwnerHandle);
    }
  }

  private readProjectHeaders(): void {
    for (const header of this.emission.resources.readDefinitionHeaders()) {
      if (!isInventoryKind(header.resourceKind)) {
        this.rememberExcludedHeader(header);
        continue;
      }
      if (header.primaryName == null) {
        this.unnamedDefinitions += 1;
        continue;
      }
      this.applyHeader(header);
    }
  }

  private readCompilerVisibility(): void {
    for (const compilerWorld of this.emission.templates.compilerWorlds) {
      for (const syntaxResource of compilerWorld.resourceScope.syntaxResources) {
        this.excludedCompilerSyntax.add(internalResourceKey(syntaxResource));
      }
      for (const visibleResource of compilerWorld.resourceScope.resources) {
        if (!isInventoryKind(visibleResource.resourceKind)) {
          this.excludedCompilerSyntax.add(internalResourceKey(visibleResource));
          continue;
        }
        const candidate = this.candidateForVisibleResource(visibleResource);
        candidate.visibilityRows.push(visibleResource);
        this.candidateByVisibleResource.set(visibleResource, candidate);
      }
    }
  }

  private applyDefinition(
    definition: FullResourceDefinition,
    localOwnerHandle: IdentityHandle | ProductHandle | null,
  ): ResourceInventoryCandidate {
    const resourceKind = taxonomyResourceKindForDefinition(definition);
    if (!isInventoryKind(resourceKind)) {
      throw new Error(`Resource inventory cannot project compiler-syntax definition '${resourceKind}'.`);
    }
    const name = namedDefinitionName(definition);
    const candidate = this.candidateFor({
      resourceKind,
      name,
      resourceIdentityHandle: definition.identityHandle,
      resourceProductHandle: definition.productHandle,
      definitionProductHandle: definition.productHandle,
      sourceAddressHandle: definition.sourceAddressHandle,
    });
    candidate.definition = definition;
    candidate.definitionRow = readResourceDefinitionRow(this.emission, this.store, definition, false);
    candidate.localOwnerHandle ??= localOwnerHandle;
    return candidate;
  }

  private applyHeader(header: ResourceDefinitionHeaderEmission | BuiltInResource): ResourceInventoryCandidate {
    const resourceKind = header instanceof ResourceDefinitionHeaderEmission
      ? header.resourceKind
      : header.resourceKind;
    if (!isInventoryKind(resourceKind)) {
      throw new Error(`Resource inventory cannot project compiler-syntax header '${resourceKind}'.`);
    }
    const name = header instanceof ResourceDefinitionHeaderEmission
      ? header.primaryName
      : header.name;
    if (name == null) {
      this.unnamedDefinitions += 1;
      throw new Error(`Named resource header '${resourceKind}' has no lookup name.`);
    }
    const candidate = this.candidateFor({
      resourceKind,
      name,
      resourceIdentityHandle: header instanceof ResourceDefinitionHeaderEmission
        ? header.primaryIdentityHandle
        : header.identityHandle,
      resourceProductHandle: header.productHandle,
      definitionProductHandle: null,
      sourceAddressHandle: header.sourceAddressHandle,
    });
    candidate.header ??= header;
    return candidate;
  }

  private candidateForVisibleResource(visibleResource: TemplateVisibleResource): ResourceInventoryCandidate {
    const fullDefinition = readVisibleTemplateResourceDefinition(this.store, visibleResource);
    if (fullDefinition != null) {
      const candidate = this.applyDefinition(fullDefinition, null);
      this.registerCandidateHandles(candidate, visibleResource);
      return candidate;
    }
    const detail = readVisibleTemplateResourceHeader(this.store, visibleResource);
    if (
      detail != null
      && (!(detail instanceof ResourceDefinitionHeaderEmission) || detail.primaryName != null)
    ) {
      const candidate = this.applyHeader(detail);
      this.registerCandidateHandles(candidate, visibleResource);
      return candidate;
    }
    const candidate = this.candidateFor({
      resourceKind: visibleResource.resourceKind as SemanticResourceInventoryKind,
      name: visibleResource.name,
      resourceIdentityHandle: visibleResource.resourceIdentityHandle,
      resourceProductHandle: visibleResource.resourceProductHandle,
      definitionProductHandle: visibleResource.definitionProductHandle,
      sourceAddressHandle: visibleResource.sourceAddressHandle,
    });
    candidate.header ??= detail;
    return candidate;
  }

  private candidateFor(input: {
    readonly resourceKind: SemanticResourceInventoryKind;
    readonly name: string;
    readonly resourceIdentityHandle: IdentityHandle | null;
    readonly resourceProductHandle: ProductHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  }): ResourceInventoryCandidate {
    const handleKeys = candidateHandleKeys(input);
    const fallbackKey = JSON.stringify([
      input.resourceKind,
      input.name,
      semanticSourceReferenceKey(describeAddress(this.store, input.sourceAddressHandle)),
    ]);
    const candidate = handleKeys
      .map((key) => this.candidatesByHandle.get(key) ?? null)
      .find((value): value is ResourceInventoryCandidate => value != null)
      ?? this.candidatesByFallback.get(fallbackKey)
      ?? new ResourceInventoryCandidate(
        `candidate:${this.candidates.length}`,
        input.resourceKind,
        input.name,
        input.resourceIdentityHandle,
        input.resourceProductHandle,
        input.definitionProductHandle,
      );
    if (!this.candidates.includes(candidate)) {
      this.candidates.push(candidate);
    }
    assertCandidateIdentity(candidate, input.resourceKind, input.name);
    this.candidatesByFallback.set(fallbackKey, candidate);
    this.registerCandidateHandles(candidate, input);
    return candidate;
  }

  private registerCandidateHandles(
    candidate: ResourceInventoryCandidate,
    input: {
      readonly resourceIdentityHandle: IdentityHandle | null;
      readonly resourceProductHandle: ProductHandle | null;
      readonly definitionProductHandle: ProductHandle | null;
    },
  ): void {
    for (const key of candidateHandleKeys(input)) {
      const existing = this.candidatesByHandle.get(key);
      if (existing != null && existing !== candidate) {
        throw new Error(`Resource inventory handle '${key}' resolves to conflicting semantic resources.`);
      }
      this.candidatesByHandle.set(key, candidate);
    }
  }

  private rowForCandidate(candidate: ResourceInventoryCandidate): SemanticResourceInventoryRow {
    const metadata = candidate.definitionRow == null
      ? this.headerMetadata(candidate)
      : {
          aliases: candidate.definitionRow.aliases,
          bindables: candidate.definitionRow.bindables,
          declarationModes: candidate.definitionRow.declarationModes,
          sources: inventorySources(
            candidate.definitionRow.nameSource,
            candidate.definitionRow.targetDeclarationSource ?? candidate.definitionRow.source,
            candidate.definitionRow.targetSource,
            candidate.builtIn != null,
          ),
          targetIdentityHandle: candidate.definition?.target.identityHandle ?? null,
        };
    const identityKey = this.identityKeyFor(candidate, metadata.sources, metadata.targetIdentityHandle);
    const owner = candidate.localOwnerHandle == null
      ? null
      : this.candidatesByHandle.get(handleKey(candidate.localOwnerHandle)) ?? null;
    const ownerRowSource = owner == null ? null : this.primaryCandidateSource(owner);
    return {
      identityKey,
      projectKey: this.emission.project.projectKey,
      resourceKind: candidate.resourceKind,
      name: candidate.name,
      registrationKey: runtimeResourceKeyForKind(candidate.resourceKind, candidate.name),
      aliases: metadata.aliases.map((alias) => ({
        ...alias,
        identityKey: semanticKey('resource-alias', [identityKey, alias.name, semanticSourceReferenceKey(alias.source)]),
        registrationKey: runtimeResourceKeyForKind(candidate.resourceKind, alias.name),
      })),
      bindables: metadata.bindables.map((bindable) => ({
        ...bindable,
        identityKey: semanticKey('resource-bindable', [identityKey, bindable.name, bindable.attribute]),
        primary: candidate.definitionRow?.defaultProperty === bindable.name,
      })),
      declarationModes: metadata.declarationModes,
      metadataState: candidate.definitionRow != null
        ? SemanticResourceInventoryMetadataState.FullDefinition
        : candidate.header != null
          ? SemanticResourceInventoryMetadataState.HeaderOnly
          : SemanticResourceInventoryMetadataState.VisibilityOnly,
      origin: this.originFor(candidate, metadata.sources, metadata.targetIdentityHandle),
      locality: {
        kind: candidate.localOwnerHandle == null
          ? SemanticResourceInventoryLocalityKind.Project
          : SemanticResourceInventoryLocalityKind.LocalTemplate,
        ownerIdentityKey: owner == null ? null : this.identityKeyFor(owner, this.primaryCandidateSources(owner), this.targetIdentityHandle(owner)),
        ownerName: owner?.name ?? null,
        ownerSource: ownerRowSource,
      },
      sources: metadata.sources,
    };
  }

  private headerMetadata(candidate: ResourceInventoryCandidate): {
    readonly aliases: SemanticResourceDefinitionRow['aliases'];
    readonly bindables: SemanticResourceDefinitionRow['bindables'];
    readonly declarationModes: SemanticResourceDefinitionRow['declarationModes'];
    readonly sources: SemanticResourceInventorySources;
    readonly targetIdentityHandle: IdentityHandle | null;
  } {
    if (candidate.header instanceof ResourceDefinitionHeaderEmission) {
      const header = candidate.header;
      const target = header.targetReference;
      return {
        aliases: header.aliasNames.map((name, index) => ({
          name,
          source: describeAddress(this.store, header.lookupNameSourceAddressHandles[index + 1] ?? null),
        })),
        bindables: [],
        declarationModes: ['header'],
        sources: inventorySources(
          describeAddress(this.store, header.lookupNameSourceAddressHandles[0] ?? null),
          describeAddress(this.store, target?.declarationSourceAddressHandle ?? header.sourceAddressHandle),
          describeAddress(this.store, target?.addressHandle ?? null),
          candidate.builtIn != null,
        ),
        targetIdentityHandle: target?.identityHandle ?? null,
      };
    }
    if (candidate.header != null) {
      return {
        aliases: candidate.header.aliases.map((name) => ({ name, source: null })),
        bindables: [],
        declarationModes: ['header'],
        sources: inventorySources(
          null,
          describeAddress(this.store, candidate.header.sourceAddressHandle),
          null,
          candidate.builtIn != null,
        ),
        targetIdentityHandle: null,
      };
    }
    const availabilitySource = candidate.visibilityRows
      .map((row) => describeAddress(this.store, row.sourceAddressHandle))
      .find((source) => source != null) ?? null;
    return {
      aliases: candidate.visibilityRows[0]?.aliases.map((name) => ({ name, source: null })) ?? [],
      bindables: [],
      declarationModes: [],
      sources: inventorySources(null, availabilitySource, null, candidate.builtIn != null),
      targetIdentityHandle: null,
    };
  }

  private identityKeyFor(
    candidate: ResourceInventoryCandidate,
    sources: SemanticResourceInventorySources,
    targetIdentityHandle: IdentityHandle | null,
  ): string {
    if (candidate.identityKey != null) {
      return candidate.identityKey;
    }
    if (candidate.builtIn != null) {
      candidate.identityKey = semanticKey('framework-resource', [
        candidate.builtIn.catalog.packageId,
        registrationResourceKindFor(candidate.resourceKind),
        candidate.name,
      ]);
      return candidate.identityKey;
    }
    if (candidate.localOwnerHandle != null) {
      const owner = this.candidatesByHandle.get(handleKey(candidate.localOwnerHandle)) ?? null;
      const ownerKey = owner == null
        ? semanticKey('unresolved-template-family', [this.emission.project.projectKey, candidate.localOwnerHandle])
        : this.identityKeyFor(owner, this.primaryCandidateSources(owner), this.targetIdentityHandle(owner));
      candidate.identityKey = semanticKey('local-template-resource', [
        ownerKey,
        candidate.resourceKind,
        semanticSourceReferenceKey(sources.publicName ?? sources.declaration),
      ]);
      return candidate.identityKey;
    }
    const declarationIdentity = this.declarationIdentityFor(candidate, targetIdentityHandle);
    if (declarationIdentity != null) {
      candidate.identityKey = semanticKey('typescript-resource', [
        declarationIdentity.moduleKey,
        declarationIdentity.exportedName,
        declarationIdentity.localName,
        registrationResourceKindFor(candidate.resourceKind),
        semanticSourceReferenceKey(describeAddress(this.store, declarationIdentity.declarationAddressHandle)),
        semanticSourceIdentityLocus(sources.declaration),
      ]);
      return candidate.identityKey;
    }
    candidate.identityKey = semanticKey('source-resource', [
      this.emission.project.projectKey,
      candidate.resourceKind,
      candidate.name,
      semanticSourceReferenceKey(sources.publicName ?? sources.implementation ?? sources.declaration),
    ]);
    return candidate.identityKey;
  }

  private originFor(
    candidate: ResourceInventoryCandidate,
    sources: SemanticResourceInventorySources,
    targetIdentityHandle: IdentityHandle | null,
  ): SemanticResourceInventoryOrigin {
    if (candidate.builtIn != null) {
      return {
        kind: SemanticResourceInventoryOriginKind.Framework,
        projectKey: null,
        packageName: builtInResourcePackageModuleSpecifier(candidate.builtIn.catalog.packageId),
        moduleKey: null,
        catalogGroup: candidate.builtIn.catalog.group,
      };
    }
    const declarationIdentity = this.declarationIdentityFor(candidate, targetIdentityHandle);
    const source = sources.implementation ?? sources.declaration ?? sources.publicName;
    if (source?.path != null && this.emission.project.authoredSources.contains(source.path)) {
      return {
        kind: SemanticResourceInventoryOriginKind.Project,
        projectKey: this.emission.project.projectKey,
        packageName: null,
        moduleKey: declarationIdentity?.moduleKey ?? null,
        catalogGroup: null,
      };
    }
    if (source != null) {
      return {
        kind: SemanticResourceInventoryOriginKind.External,
        projectKey: null,
        packageName: null,
        moduleKey: declarationIdentity?.moduleKey ?? null,
        catalogGroup: null,
      };
    }
    return {
      kind: SemanticResourceInventoryOriginKind.Unknown,
      projectKey: null,
      packageName: null,
      moduleKey: declarationIdentity?.moduleKey ?? null,
      catalogGroup: null,
    };
  }

  private declarationIdentityFor(
    candidate: ResourceInventoryCandidate,
    targetIdentityHandle: IdentityHandle | null,
  ): TypeScriptDeclarationIdentity | null {
    const resourceIdentity = candidate.resourceIdentityHandle == null
      ? null
      : this.store.readIdentity(candidate.resourceIdentityHandle);
    const declarationHandle = resourceIdentity instanceof AureliaResourceIdentity
      ? resourceIdentity.declarationHandle ?? targetIdentityHandle
      : targetIdentityHandle;
    const declarationIdentity = declarationHandle == null ? null : this.store.readIdentity(declarationHandle);
    return declarationIdentity instanceof TypeScriptDeclarationIdentity ? declarationIdentity : null;
  }

  private primaryCandidateSources(candidate: ResourceInventoryCandidate): SemanticResourceInventorySources {
    if (candidate.definitionRow != null) {
      return inventorySources(
        candidate.definitionRow.nameSource,
        candidate.definitionRow.targetDeclarationSource ?? candidate.definitionRow.source,
        candidate.definitionRow.targetSource,
        candidate.builtIn != null,
      );
    }
    return this.headerMetadata(candidate).sources;
  }

  private primaryCandidateSource(candidate: ResourceInventoryCandidate): SemanticSourceReference | null {
    const sources = this.primaryCandidateSources(candidate);
    return sources.publicName ?? sources.implementation ?? sources.declaration;
  }

  private targetIdentityHandle(candidate: ResourceInventoryCandidate): IdentityHandle | null {
    return candidate.definition?.target.identityHandle
      ?? (candidate.header instanceof ResourceDefinitionHeaderEmission
        ? candidate.header.targetReference?.identityHandle ?? null
        : null);
  }

  private completeness(rows: readonly SemanticResourceInventoryRow[]): SemanticResourceInventoryCompleteness {
    return {
      fullDefinitions: rows.filter((row) => row.metadataState === SemanticResourceInventoryMetadataState.FullDefinition).length,
      headerOnly: rows.filter((row) => row.metadataState === SemanticResourceInventoryMetadataState.HeaderOnly).length,
      visibilityOnly: rows.filter((row) => row.metadataState === SemanticResourceInventoryMetadataState.VisibilityOnly).length,
      localTemplates: rows.filter((row) => row.locality.kind === SemanticResourceInventoryLocalityKind.LocalTemplate).length,
      excludedCompilerSyntax: this.excludedCompilerSyntax.size,
      unnamedDefinitions: this.unnamedDefinitions,
      unresolvedModules: this.emission.resources.readUnresolvedModules().length,
      openVisibility: this.candidates.filter((candidate) =>
        candidate.visibilityRows.some((row) => row.visibilityKind === TemplateResourceVisibilityKind.Open)
      ).length,
    };
  }

  private rememberExcludedDefinition(definition: FullResourceDefinition): void {
    this.excludedCompilerSyntax.add(JSON.stringify([
      definition.type,
      definition.productHandle,
      definition.identityHandle,
      'name' in definition ? definition.name : null,
    ]));
  }

  private rememberExcludedHeader(header: ResourceDefinitionHeaderEmission): void {
    this.excludedCompilerSyntax.add(JSON.stringify([
      header.resourceKind,
      header.productHandle,
      header.primaryIdentityHandle,
      header.lookupNames,
    ]));
  }
}

interface TemplateScopeSelection {
  readonly selection: TemplateResourceCursorSelection;
  readonly candidate: SemanticTemplateResourceScopeCandidate;
}

function templateScopeSelection(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  projection: ResourceInventoryProjection,
  selection: TemplateResourceCursorSelection,
): TemplateScopeSelection {
  const compilation = selection.resource.compilation;
  const definitionCandidate = candidateForCompilationDefinition(projection, compilation.definition);
  const definitionIdentityKey = definitionCandidate == null
    ? semanticKey('template-owner', [
        emission.project.projectKey,
        compilation.definition.name,
        semanticSourceReferenceKey(describeAddress(store, compilation.definition.sourceAddressHandle)),
      ])
    : projection.rowByCandidate.get(definitionCandidate)?.identityKey
      ?? semanticKey('template-owner', [emission.project.projectKey, compilation.definition.name]);
  const source = describeAddress(store, compilation.unit.templateSource.sourceAddressHandle);
  const templateIdentityKey = semanticKey('template-source', [
    definitionIdentityKey,
    compilation.unit.templateSource.sourceKind,
    semanticSourceReferenceKey(source),
  ]);
  const compilerWorld = compilation.compilerWorld;
  const scopeIdentityKey = semanticKey('template-resource-scope', [
    templateIdentityKey,
    compilerWorld.world.worldKind,
    semanticSourceReferenceKey(describeAddress(store, compilerWorld.world.sourceAddressHandle)),
    semanticSourceReferenceKey(describeAddress(store, compilerWorld.resourceScope.sourceAddressHandle)),
  ]);
  return {
    selection,
    candidate: {
      templateIdentityKey,
      scopeIdentityKey,
      definitionName: compilation.definition.name,
      compilationLane: selection.lane,
      source,
    },
  };
}

function candidateForCompilationDefinition(
  projection: ResourceInventoryProjection,
  definition: FullResourceDefinition,
): ResourceInventoryCandidate | null {
  const name = namedDefinitionName(definition);
  for (const [candidate, row] of projection.rowByCandidate) {
    if (
      row.resourceKind === taxonomyResourceKindForDefinition(definition)
      && row.name === name
      && candidate.definition === definition
    ) {
      return candidate;
    }
  }
  return null;
}

function namedDefinitionName(definition: FullResourceDefinition): string {
  if ('name' in definition) {
    return definition.name;
  }
  throw new Error(`Compiler-syntax definition '${definition.type}' has no runtime resource name.`);
}

function distinctTemplateScopeSelections(
  selections: readonly TemplateScopeSelection[],
): readonly TemplateScopeSelection[] {
  const byScope = new Map<string, TemplateScopeSelection>();
  for (const selection of selections) {
    byScope.set(selection.candidate.scopeIdentityKey, selection);
  }
  return [...byScope.values()].sort((left, right) =>
    left.candidate.scopeIdentityKey.localeCompare(right.candidate.scopeIdentityKey)
  );
}

function inventorySources(
  publicName: SemanticSourceReference | null,
  declaration: SemanticSourceReference | null,
  implementation: SemanticSourceReference | null,
  frameworkCatalog: boolean,
): SemanticResourceInventorySources {
  const navigable = [publicName, implementation].some((source) => {
    const exact = semanticExactSourceReference(source);
    return exact?.path != null;
  });
  return {
    publicName,
    declaration,
    implementation,
    navigationUnavailableReason: navigable
      ? null
      : frameworkCatalog
        ? SemanticResourceNavigationUnavailableReason.ExternalCatalog
        : SemanticResourceNavigationUnavailableReason.NoAuthoredSource,
  };
}

function candidateHandleKeys(input: {
  readonly resourceIdentityHandle: IdentityHandle | null;
  readonly resourceProductHandle: ProductHandle | null;
  readonly definitionProductHandle: ProductHandle | null;
}): readonly string[] {
  return [
    input.resourceIdentityHandle == null ? null : handleKey(input.resourceIdentityHandle),
    input.definitionProductHandle == null ? null : handleKey(input.definitionProductHandle),
    input.resourceProductHandle == null ? null : handleKey(input.resourceProductHandle),
  ].filter((key): key is string => key != null);
}

function handleKey(handle: IdentityHandle | ProductHandle): string {
  return String(handle);
}

function internalResourceKey(resource: TemplateVisibleResource): string {
  return JSON.stringify([
    resource.resourceKind,
    resource.name,
    resource.resourceIdentityHandle,
    resource.definitionProductHandle,
    resource.resourceProductHandle,
  ]);
}

function isInventoryKind(kind: ResourceDefinitionKind): kind is SemanticResourceInventoryKind {
  return SEMANTIC_RESOURCE_INVENTORY_KINDS.some((candidate) => candidate === kind);
}

function assertCandidateIdentity(
  candidate: ResourceInventoryCandidate,
  resourceKind: SemanticResourceInventoryKind,
  name: string,
): void {
  if (candidate.resourceKind !== resourceKind || candidate.name !== name) {
    throw new Error(
      `Resource inventory identity '${candidate.internalKey}' changed from ${candidate.resourceKind}:${candidate.name} to ${resourceKind}:${name}.`,
    );
  }
}

function semanticKey(namespace: string, values: readonly unknown[]): string {
  const digest = createHash('sha256').update(JSON.stringify(values)).digest('base64url').slice(0, 22);
  return `${namespace}:v1:${digest}`;
}

function semanticSourceIdentityLocus(source: SemanticSourceReference | null): readonly unknown[] | null {
  if (source == null) {
    return null;
  }
  return [
    source.kind,
    source.path ?? null,
    source.start ?? null,
    source.scheme ?? null,
    source.value ?? null,
    source.role ?? null,
    source.sourceWorkspaceKey ?? null,
    semanticSourceIdentityLocus(source.anchor ?? null),
  ];
}

function compareInventoryRows(left: SemanticResourceInventoryRow, right: SemanticResourceInventoryRow): number {
  return `${left.resourceKind}:${left.name}:${left.origin.kind}:${left.identityKey}`
    .localeCompare(`${right.resourceKind}:${right.name}:${right.origin.kind}:${right.identityKey}`);
}

function resourceInventoryCoverage(
  completeness: SemanticResourceInventoryCompleteness,
): SemanticRuntimeAnswerCoverage {
  return completeness.unnamedDefinitions > 0
      || completeness.unresolvedModules > 0
      || completeness.openVisibility > 0
    ? SemanticRuntimeAnswerCoverage.Open
    : SemanticRuntimeAnswerCoverage.Complete;
}

function resourceInventoryDisplayText(
  rows: readonly SemanticResourceInventoryRow[],
  total: number,
  completeness: SemanticResourceInventoryCompleteness,
): string {
  const counts = new Map<SemanticResourceInventoryKind, number>();
  for (const row of rows) {
    counts.set(row.resourceKind, (counts.get(row.resourceKind) ?? 0) + 1);
  }
  const groups = SEMANTIC_RESOURCE_INVENTORY_KINDS
    .map((kind) => `${kind}: ${counts.get(kind) ?? 0}`)
    .join(', ');
  const open = resourceInventoryCoverage(completeness) === SemanticRuntimeAnswerCoverage.Open
    ? ' Coverage remains open.'
    : '';
  return `Runtime resources (${rows.length} of ${total}): ${groups}.${open}`;
}
