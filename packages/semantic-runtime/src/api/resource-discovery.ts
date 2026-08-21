import { createHash } from 'node:crypto';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  semanticSourceReferenceHostPath,
} from '../boot/source-ownership.js';
import { ResolvedEvaluationModuleSourceScope } from '../evaluation/package-origin.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import {
  AureliaResourceIdentity,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import type { KernelStore } from '../kernel/store.js';
import type { BuiltInResource, BuiltInResourceCatalog } from '../resources/built-in-resources.js';
import {
  BuiltInResourcePackage,
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
import {
  sameTemplateVisibleResource,
  TemplateResourceVisibilityKind,
  type TemplateVisibleResource,
} from '../template/compiler-world-reference.js';
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
  SemanticResourceInventoryCatalogOwnerKind,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryMetadataState,
  SemanticResourceInventoryNavigationRole,
  SemanticResourceInventoryOriginKind,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticTemplateResourceAvailabilityState,
  type SemanticResourceInventoryCompleteness,
  type SemanticResourceInventoryKind,
  type SemanticResourceInventoryOrigin,
  type SemanticResourceInventoryResult,
  type SemanticResourceInventoryRow,
  type SemanticResourceInventorySources,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
  type SemanticRuntimeSourceCursorInput,
  type SemanticTemplateResourceAvailabilityResult,
  type SemanticTemplateResourceScopeCandidate,
} from './contracts.js';
import {
  answer,
  pageProjectedRows,
} from './answer-helpers.js';
import {
  readResourceDefinitionCoreProjection,
  readResourceDefinitionSourceProjection,
  type ResourceDefinitionCoreProjection,
  type ResourceDefinitionSourceProjection,
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

type ResourceInventoryLocalityEvidence =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'non-local' }
  | {
    readonly kind: 'local';
    readonly ownerHandle: IdentityHandle | ProductHandle;
  };

const unknownLocalityEvidence: ResourceInventoryLocalityEvidence = { kind: 'unknown' };
const nonLocalityEvidence: ResourceInventoryLocalityEvidence = { kind: 'non-local' };

function localTemplateLocalityEvidence(
  ownerHandle: IdentityHandle | ProductHandle,
): ResourceInventoryLocalityEvidence {
  return { kind: 'local', ownerHandle };
}

/** @internal Exact convergence rule for the independent resource-inventory evidence lanes. */
export function mergeResourceInventoryLocalityEvidence(
  current: ResourceInventoryLocalityEvidence,
  incoming: ResourceInventoryLocalityEvidence,
  candidateLabel = 'resource inventory candidate',
): ResourceInventoryLocalityEvidence {
  if (current.kind === 'unknown') return incoming;
  if (incoming.kind === 'unknown') return current;
  if (current.kind === 'non-local' && incoming.kind === 'non-local') return current;
  if (
    current.kind === 'local'
    && incoming.kind === 'local'
    && current.ownerHandle === incoming.ownerHandle
  ) {
    return current;
  }
  throw new Error(
    `${candidateLabel} merged conflicting locality evidence '${localityEvidenceText(current)}' and '${localityEvidenceText(incoming)}'.`,
  );
}

function localityEvidenceText(evidence: ResourceInventoryLocalityEvidence): string {
  return evidence.kind === 'local' ? `local:${evidence.ownerHandle}` : evidence.kind;
}

class ResourceInventoryCandidate {
  readonly visibilityRows: TemplateVisibleResource[] = [];
  builtIn: BuiltInResourceFacts | null = null;
  definition: FullResourceDefinition | null = null;
  header: ResourceDefinitionHeaderEmission | BuiltInResource | null = null;
  private localityEvidence: ResourceInventoryLocalityEvidence = unknownLocalityEvidence;
  identityKey: string | null = null;

  constructor(
    readonly internalKey: string,
    readonly resourceKind: SemanticResourceInventoryKind,
    readonly name: string,
    readonly resourceIdentityHandle: IdentityHandle | null,
    readonly resourceProductHandle: ProductHandle | null,
    readonly definitionProductHandle: ProductHandle | null,
  ) {}

  get localOwnerHandle(): IdentityHandle | ProductHandle | null {
    return this.localityEvidence.kind === 'local' ? this.localityEvidence.ownerHandle : null;
  }

  mergeLocalityEvidence(incoming: ResourceInventoryLocalityEvidence): void {
    this.localityEvidence = mergeResourceInventoryLocalityEvidence(
      this.localityEvidence,
      incoming,
      `Resource inventory candidate '${this.resourceKind}:${this.name}'`,
    );
  }
}

interface ResourceInventoryProjection {
  readonly rows: readonly SemanticResourceInventoryRow[];
  readonly completeness: SemanticResourceInventoryCompleteness;
  readonly page: SemanticRuntimePageResult;
}

interface ResourceInventoryCandidateProjectionBasis {
  readonly sources: SemanticResourceInventorySources;
  readonly targetIdentityHandle: IdentityHandle | null;
  readonly identityKey: string;
  readonly origin: SemanticResourceInventoryOrigin;
  readonly orderingKey: string;
}

interface TypeScriptResourceIdentityBasis {
  readonly values: readonly unknown[];
  readonly groupingKey: string;
}

/** Project the selected app's resource definitions and effective compiler catalogs without leaking kernel handles. */
export function readSemanticResourceInventory(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  page?: SemanticRuntimePageInput,
  includeTypeSurfaces = false,
): SemanticRuntimeAnswer<SemanticResourceInventoryResult> {
  const projection = new ResourceInventoryBuilder(emission, store, includeTypeSurfaces).read(page);
  const coverage = resourceInventoryCoverage(
    projection.completeness,
    emission.project.sourceDiscovery?.truncated === true,
  );
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Returned ${projection.rows.length} of ${projection.page.totalRows} runtime resource row(s) for ${emission.project.projectKey}.`
      + (coverage === SemanticRuntimeAnswerCoverage.Truncated
        ? ' Source discovery stopped at its configured file guardrail, so resource coverage is truncated.'
        : ''),
    {
      displayText: resourceInventoryDisplayText(
        projection.rows,
        projection.page.totalRows,
        projection.completeness,
        coverage,
      ),
      projectKey: emission.project.projectKey,
      projectRoot: emission.project.rootDir,
      typeSurfacesIncluded: includeTypeSurfaces,
      rows: projection.rows,
      completeness: projection.completeness,
    },
    {
      selection: SemanticRuntimeAnswerSelection.NotApplicable,
      coverage,
      page: projection.page,
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
  includeTypeSurfaces = false,
): SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult> {
  const inventory = new ResourceInventoryBuilder(emission, store, includeTypeSurfaces);
  inventory.collect();
  const completeness = inventory.completeness();
  const sourceDiscoveryTruncated = emission.project.sourceDiscovery?.truncated === true;
  const sourceDiscoveryCoverage = sourceDiscoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : SemanticRuntimeAnswerCoverage.Complete;
  const emptyValue = (
    displayText: string,
    candidates: readonly SemanticTemplateResourceScopeCandidate[] = [],
  ): SemanticTemplateResourceAvailabilityResult => ({
    displayText,
    projectKey: emission.project.projectKey,
    projectRoot: emission.project.rootDir,
    typeSurfacesIncluded: includeTypeSurfaces,
    selectedTemplate: null,
    candidates,
    rows: [],
    completeness,
  });
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Template resource availability requires a source cursor.',
      emptyValue('No template cursor was supplied.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: sourceDiscoveryCoverage,
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
        coverage: sourceDiscoveryCoverage,
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
    selections.map((selection) => templateScopeSelection(emission, store, inventory, selection)),
  );
  if (selectedScopes.length === 0) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'No compiled template resource was available for the supplied source cursor.',
      emptyValue('No compiled template owns this cursor.'),
      {
        selection: SemanticRuntimeAnswerSelection.Absent,
        coverage: sourceDiscoveryCoverage,
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
        coverage: sourceDiscoveryCoverage,
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
        coverage: sourceDiscoveryCoverage,
      },
    );
  }

  const selected = requestedScope ?? selectedScopes[0]!;
  const selectedScope = selected.selection.resource.compilation.compilerWorld.resourceScope;
  const exactLookupWinners = distinctVisibleLookupWinners(selectedScope.lookups.map((lookup) => lookup.winner));
  // Preserve the established broad-scope presentation order while excluding owner-only and other non-winning rows.
  const exactWinners = selectedScope.resources.filter((resource) =>
    exactLookupWinners.some((winner) => sameTemplateVisibleResource(winner, resource))
  );
  const rows = exactWinners
    .map((visibleResource) => {
      const resource = inventory.rowForVisibleResource(visibleResource);
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
  const coverage = sourceDiscoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : rows.some((row) => row.state === SemanticTemplateResourceAvailabilityState.Open)
      ? SemanticRuntimeAnswerCoverage.Open
      : resourceInventoryCoverage(completeness);
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Returned ${rows.length} resource(s) available to ${selected.candidate.definitionName}.`,
    {
      displayText: `${selected.candidate.definitionName}: ${rows.length} available runtime resource(s).`,
      projectKey: emission.project.projectKey,
      projectRoot: emission.project.rootDir,
      typeSurfacesIncluded: includeTypeSurfaces,
      selectedTemplate: selected.candidate,
      candidates: [selected.candidate],
      rows,
      completeness,
    },
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage,
    },
  );
}

function distinctVisibleLookupWinners(
  resources: readonly TemplateVisibleResource[],
): readonly TemplateVisibleResource[] {
  const rows: TemplateVisibleResource[] = [];
  for (const resource of resources) {
    if (!rows.some((candidate) => sameTemplateVisibleResource(candidate, resource))) {
      rows.push(resource);
    }
  }
  return rows;
}

/** @internal Shared exact-identity projection used by bounded resource inquiry families. */
export class ResourceInventoryBuilder {
  private readonly candidates: ResourceInventoryCandidate[] = [];
  private readonly candidatesByHandle = new Map<string, ResourceInventoryCandidate>();
  private readonly candidatesByFallback = new Map<string, ResourceInventoryCandidate>();
  private readonly candidateByVisibleResource = new Map<TemplateVisibleResource, ResourceInventoryCandidate>();
  private readonly projectionBases = new Map<ResourceInventoryCandidate, ResourceInventoryCandidateProjectionBasis>();
  private readonly typescriptIdentityBases = new Map<
    ResourceInventoryCandidate,
    TypeScriptResourceIdentityBasis | null
  >();
  private typescriptIdentityContendersByGroup:
    ReadonlyMap<string, readonly ResourceInventoryCandidate[]> | null = null;
  private readonly definitionProjections = new Map<ResourceInventoryCandidate, ResourceDefinitionCoreProjection>();
  private readonly definitionSourceProjections = new Map<ResourceInventoryCandidate, ResourceDefinitionSourceProjection>();
  private readonly rowsByCandidate = new Map<ResourceInventoryCandidate, SemanticResourceInventoryRow>();
  private readonly excludedCompilerSyntax = new Set<string>();
  private unnamedDefinitions = 0;
  private collected = false;

  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
    private readonly includeTypeSurfaces: boolean,
  ) {}

  read(page?: SemanticRuntimePageInput): ResourceInventoryProjection {
    this.collect();
    const orderedCandidates = this.candidates
      .map((candidate, ordinal) => ({
        candidate,
        ordinal,
        orderingKey: this.projectionBasisFor(candidate).orderingKey,
      }))
      .sort((left, right) => left.orderingKey.localeCompare(right.orderingKey) || left.ordinal - right.ordinal)
      .map((entry) => entry.candidate);
    const paged = pageProjectedRows(
      orderedCandidates,
      page,
      (candidate) => this.rowForCandidate(candidate),
      {
        unboundCursorBasis: () => [
          'resource-inventory',
          this.emission.project.projectKey,
          this.emission.project.inputGeneration.revision,
          this.emission.analysisDepth,
          this.includeTypeSurfaces,
          orderedCandidates.map((candidate) => this.projectionBasisFor(candidate).orderingKey),
        ],
      },
    );
    return {
      rows: paged.rows,
      completeness: this.completeness(),
      page: paged.page,
    };
  }

  collect(): void {
    if (this.collected) {
      return;
    }
    this.collected = true;
    this.readProjectDefinitions();
    this.readConfiguredBuiltIns();
    this.readCompiledDefinitions();
    this.readProjectHeaders();
    this.readCompilerVisibility();
    this.assertUniqueFinalRowIdentities();
  }

  private readProjectDefinitions(): void {
    for (const definition of this.emission.resources.readDefinitions()) {
      if (!isInventoryKind(taxonomyResourceKindForDefinition(definition))) {
        this.rememberExcludedDefinition(definition);
        continue;
      }
      this.applyDefinition(definition, nonLocalityEvidence);
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
        ? this.applyHeader(builtIn.resource, nonLocalityEvidence)
        : this.applyDefinition(builtIn.definition, nonLocalityEvidence);
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
      const localityEvidence = definitionOwner !== resource.compilation.familyOwnerHandle
        ? localTemplateLocalityEvidence(resource.compilation.familyOwnerHandle)
        : nonLocalityEvidence;
      this.applyDefinition(definition, localityEvidence);
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
      this.applyHeader(header, nonLocalityEvidence);
    }
  }

  private readCompilerVisibility(): void {
    for (const compilerWorld of this.emission.templates.compilerWorlds) {
      for (const syntaxResource of compilerWorld.resourceScope.syntaxResources) {
        this.excludedCompilerSyntax.add(internalResourceKey(syntaxResource));
      }
      for (const visibleResource of compilerWorld.resourceScope.resources) {
        this.registerCompilerVisibleResource(visibleResource);
      }
      for (const exclusion of compilerWorld.resourceScope.exclusions) {
        this.registerCompilerVisibleResource(exclusion.winner);
        this.registerCompilerVisibleResource(exclusion.loser);
      }
    }
  }

  private registerCompilerVisibleResource(visibleResource: TemplateVisibleResource): void {
    if (!isInventoryKind(visibleResource.resourceKind)) {
      this.excludedCompilerSyntax.add(internalResourceKey(visibleResource));
      return;
    }
    const candidate = this.candidateForVisibleResource(visibleResource);
    if (!candidate.visibilityRows.includes(visibleResource)) {
      candidate.visibilityRows.push(visibleResource);
    }
    this.candidateByVisibleResource.set(visibleResource, candidate);
  }

  private applyDefinition(
    definition: FullResourceDefinition,
    localityEvidence: ResourceInventoryLocalityEvidence,
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
    if (candidate.definition == null) {
      candidate.definition = definition;
    } else if (!sameDefinitionProduct(candidate.definition, definition)) {
      throw new Error(
        `Resource inventory candidate '${candidate.resourceKind}:${candidate.name}' merged conflicting definition products '${String(candidate.definition.productHandle)}' and '${String(definition.productHandle)}'.`,
      );
    }
    candidate.mergeLocalityEvidence(localityEvidence);
    return candidate;
  }

  private applyHeader(
    header: ResourceDefinitionHeaderEmission | BuiltInResource,
    localityEvidence: ResourceInventoryLocalityEvidence,
  ): ResourceInventoryCandidate {
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
    candidate.mergeLocalityEvidence(localityEvidence);
    return candidate;
  }

  private candidateForVisibleResource(visibleResource: TemplateVisibleResource): ResourceInventoryCandidate {
    const fullDefinition = readVisibleTemplateResourceDefinition(this.store, visibleResource);
    if (fullDefinition != null) {
      const candidate = this.applyDefinition(fullDefinition, unknownLocalityEvidence);
      this.registerCandidateHandles(candidate, visibleResource);
      return candidate;
    }
    const detail = readVisibleTemplateResourceHeader(this.store, visibleResource);
    if (
      detail != null
      && (!(detail instanceof ResourceDefinitionHeaderEmission) || detail.primaryName != null)
    ) {
      const candidate = this.applyHeader(detail, unknownLocalityEvidence);
      this.registerCandidateHandles(candidate, visibleResource);
      return candidate;
    }
    // Alias-specific scope/exclusion carriers can retain the underlying resource handles while projecting the
    // surviving or losing alias as `name`. Reuse the already canonicalized inventory candidate by exact handle;
    // alias lookup metadata must never manufacture a second top-level resource identity.
    const handleCandidate = candidateHandleKeys(visibleResource)
      .map((key) => this.candidatesByHandle.get(key) ?? null)
      .find((candidate): candidate is ResourceInventoryCandidate => candidate != null);
    if (handleCandidate != null) {
      if (handleCandidate.resourceKind !== visibleResource.resourceKind) {
        throw new Error(
          `Resource inventory handle for '${handleCandidate.resourceKind}:${handleCandidate.name}' was reused by '${visibleResource.resourceKind}:${visibleResource.name}'.`,
        );
      }
      this.registerCandidateHandles(handleCandidate, visibleResource);
      return handleCandidate;
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

  rowForVisibleResource(visibleResource: TemplateVisibleResource): SemanticResourceInventoryRow | null {
    this.collect();
    const candidate = this.candidateByVisibleResource.get(visibleResource) ?? null;
    return candidate == null ? null : this.rowForCandidate(candidate);
  }

  /** Public-safe identity for scope discrimination without materializing optional TypeChecker-backed surfaces. */
  identityKeyForVisibleResource(visibleResource: TemplateVisibleResource): string | null {
    this.collect();
    const candidate = this.candidateByVisibleResource.get(visibleResource) ?? null;
    return candidate == null ? null : this.identityKeyForCandidate(candidate);
  }

  rowForIdentityKey(identityKey: string): SemanticResourceInventoryRow | null {
    this.collect();
    const candidate = this.candidates.find((current) =>
      this.identityKeyForCandidate(current) === identityKey
    ) ?? null;
    return candidate == null ? null : this.rowForCandidate(candidate);
  }

  candidateForDefinition(definition: FullResourceDefinition): ResourceInventoryCandidate | null {
    this.collect();
    const resourceKind = taxonomyResourceKindForDefinition(definition);
    const name = namedDefinitionName(definition);
    return this.candidates.find((candidate) =>
      candidate.resourceKind === resourceKind
      && candidate.name === name
      && candidate.definition != null
      && sameDefinitionProduct(candidate.definition, definition)
    ) ?? null;
  }

  identityKeyForCandidate(candidate: ResourceInventoryCandidate): string {
    this.collect();
    return this.projectionBasisFor(candidate).identityKey;
  }

  completeness(): SemanticResourceInventoryCompleteness {
    this.collect();
    return {
      fullDefinitions: this.candidates.filter((candidate) => candidate.definition != null).length,
      headerOnly: this.candidates.filter((candidate) => candidate.definition == null && candidate.header != null).length,
      visibilityOnly: this.candidates.filter((candidate) => candidate.definition == null && candidate.header == null).length,
      localTemplates: this.candidates.filter((candidate) => candidate.localOwnerHandle != null).length,
      excludedCompilerSyntax: this.excludedCompilerSyntax.size,
      unnamedDefinitions: this.unnamedDefinitions,
      unresolvedModules: this.emission.resources.readUnresolvedModules().length,
      openVisibility: this.candidates.filter((candidate) =>
        candidate.visibilityRows.some((row) => row.visibilityKind === TemplateResourceVisibilityKind.Open)
      ).length,
    };
  }

  private rowForCandidate(candidate: ResourceInventoryCandidate): SemanticResourceInventoryRow {
    const existing = this.rowsByCandidate.get(candidate);
    if (existing != null) {
      return existing;
    }
    const basis = this.projectionBasisFor(candidate);
    const definitionProjection = this.definitionProjectionFor(candidate);
    const metadata = definitionProjection == null
      ? this.headerMetadata(candidate)
      : {
          aliases: definitionProjection.aliases,
          bindables: definitionProjection.bindables,
          declarationModes: definitionProjection.declarationModes,
        };
    const identityKey = basis.identityKey;
    const owner = candidate.localOwnerHandle == null
      ? null
      : this.candidatesByHandle.get(handleKey(candidate.localOwnerHandle)) ?? null;
    const ownerBasis = owner == null ? null : this.projectionBasisFor(owner);
    const ownerRowSource = ownerBasis == null
      ? null
      : ownerBasis.sources.publicName ?? ownerBasis.sources.implementation ?? ownerBasis.sources.declaration;
    const row: SemanticResourceInventoryRow = {
      identityKey,
      projectKey: this.emission.project.projectKey,
      resourceKind: candidate.resourceKind,
      name: candidate.name,
      registrationKey: runtimeResourceKeyForKind(candidate.resourceKind, candidate.name),
      aliases: metadata.aliases.map((alias, index) => ({
        ...alias,
        identityKey: semanticKey('resource-alias', [
          identityKey,
          alias.name,
          sameNameOrdinal(metadata.aliases, index, (row) => row.name),
        ]),
        registrationKey: runtimeResourceKeyForKind(candidate.resourceKind, alias.name),
      })),
      bindables: metadata.bindables.map((bindable, index) => {
        const navigation = inventoryNavigationSource([
          [bindable.nameSource, SemanticResourceInventoryNavigationRole.BindableName],
          [bindable.attributeSource, SemanticResourceInventoryNavigationRole.BindableAttribute],
          [bindable.propertySource, SemanticResourceInventoryNavigationRole.BindableProperty],
          [bindable.source, SemanticResourceInventoryNavigationRole.BindableDeclaration],
        ]);
        return {
          ...bindable,
          identityKey: semanticKey('resource-bindable', [
            identityKey,
            bindable.name,
            bindable.attribute,
            sameNameOrdinal(metadata.bindables, index, (row) => `${row.name}\u0000${row.attribute}`),
          ]),
          primary: definitionProjection?.defaultProperty === bindable.name,
          navigationSource: navigation?.source ?? null,
          navigationRole: navigation?.role ?? null,
        };
      }),
      declarationModes: metadata.declarationModes,
      metadataState: definitionProjection != null
        ? SemanticResourceInventoryMetadataState.FullDefinition
        : candidate.header != null
          ? SemanticResourceInventoryMetadataState.HeaderOnly
          : SemanticResourceInventoryMetadataState.VisibilityOnly,
      origin: basis.origin,
      locality: {
        kind: candidate.localOwnerHandle == null
          ? SemanticResourceInventoryLocalityKind.Project
          : SemanticResourceInventoryLocalityKind.LocalTemplate,
        ownerIdentityKey: ownerBasis?.identityKey ?? null,
        ownerName: owner?.name ?? null,
        ownerSource: ownerRowSource,
      },
      sources: basis.sources,
    };
    this.rowsByCandidate.set(candidate, row);
    return row;
  }

  private headerMetadata(candidate: ResourceInventoryCandidate): {
    readonly aliases: ResourceDefinitionCoreProjection['aliases'];
    readonly bindables: ResourceDefinitionCoreProjection['bindables'];
    readonly declarationModes: ResourceDefinitionCoreProjection['declarationModes'];
  } {
    if (candidate.header instanceof ResourceDefinitionHeaderEmission) {
      const header = candidate.header;
      return {
        aliases: header.aliasNames.map((name, index) => ({
          name,
          source: describeAddress(this.store, header.lookupNameSourceAddressHandles[index + 1] ?? null),
        })),
        bindables: [],
        declarationModes: ['header'],
      };
    }
    if (candidate.header != null) {
      return {
        aliases: candidate.header.aliases.map((name) => ({ name, source: null })),
        bindables: [],
        declarationModes: ['header'],
      };
    }
    return {
      aliases: candidate.visibilityRows[0]?.aliases.map((name) => ({ name, source: null })) ?? [],
      bindables: [],
      declarationModes: [],
    };
  }

  private identityKeyFor(
    candidate: ResourceInventoryCandidate,
    sources: SemanticResourceInventorySources,
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
        : this.identityKeyFor(owner, this.primaryCandidateSources(owner));
      candidate.identityKey = semanticKey('local-template-resource', [
        ownerKey,
        candidate.resourceKind,
        candidate.name,
        this.sameOwnerResourceOrdinal(candidate),
      ]);
      return candidate.identityKey;
    }
    const typescriptBasis = this.typescriptResourceIdentityBasisFor(candidate);
    if (typescriptBasis != null) {
      const contenders = this.typescriptResourceIdentityContenders(typescriptBasis.groupingKey);
      const contenderIndex = contenders.indexOf(candidate);
      if (contenderIndex < 0) {
        throw new Error(
          `TypeScript resource candidate '${candidate.internalKey}' is absent from its declaration-owner identity group.`,
        );
      }
      candidate.identityKey = contenderIndex === 0
        ? semanticKey('typescript-resource', typescriptBasis.values)
        : semanticKey('typescript-resource', [
            ...typescriptBasis.values,
            'variant',
            contenderIndex - 1,
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

  private typescriptResourceIdentityBasisFor(
    candidate: ResourceInventoryCandidate,
  ): TypeScriptResourceIdentityBasis | null {
    if (this.typescriptIdentityBases.has(candidate)) {
      return this.typescriptIdentityBases.get(candidate) ?? null;
    }
    const declarationIdentity = this.declarationIdentityFor(candidate, this.targetIdentityHandle(candidate));
    if (
      declarationIdentity?.moduleKey == null
      || (declarationIdentity.exportedName == null && declarationIdentity.localName == null)
    ) {
      this.typescriptIdentityBases.set(candidate, null);
      return null;
    }
    const values = [
      declarationIdentity.moduleKey,
      declarationIdentity.exportedName,
      declarationIdentity.localName,
      registrationResourceKindFor(candidate.resourceKind),
    ] as const;
    const basis = {
      values,
      groupingKey: JSON.stringify(values),
    };
    this.typescriptIdentityBases.set(candidate, basis);
    return basis;
  }

  private typescriptResourceIdentityContenders(
    groupingKey: string,
  ): readonly ResourceInventoryCandidate[] {
    if (this.typescriptIdentityContendersByGroup == null) {
      const groups = new Map<string, {
        candidate: ResourceInventoryCandidate;
        ordinal: number;
        authority: number;
      }[]>();
      for (const [ordinal, candidate] of this.candidates.entries()) {
        const basis = this.typescriptResourceIdentityBasisFor(candidate);
        if (basis == null) continue;
        const group = groups.get(basis.groupingKey) ?? [];
        group.push({
          candidate,
          ordinal,
          authority: resourceInventoryCandidateAuthority(candidate),
        });
        groups.set(basis.groupingKey, group);
      }
      this.typescriptIdentityContendersByGroup = new Map([...groups].map(([key, group]) => {
        const fullDefinitions = group.filter((entry) => entry.authority === 0);
        if (fullDefinitions.length > 1) {
          throw new Error(
            `TypeScript resource declaration-owner group '${key}' retained ${fullDefinitions.length} full definitions; `
              + 'effective resource convergence must select one authoritative definition.',
          );
        }
        return [
          key,
          group
            .sort((left, right) => left.authority - right.authority || left.ordinal - right.ordinal)
            .map((entry) => entry.candidate),
        ];
      }));
    }
    return this.typescriptIdentityContendersByGroup.get(groupingKey) ?? [];
  }

  private assertUniqueFinalRowIdentities(): void {
    const owners = new Map<string, ResourceInventoryCandidate>();
    for (const candidate of this.candidates) {
      const identityKey = this.projectionBasisFor(candidate).identityKey;
      const existing = owners.get(identityKey);
      if (existing != null) {
        throw new Error(
          `Resource inventory projected duplicate final row identity '${identityKey}' for `
            + `'${existing.resourceKind}:${existing.name}' and '${candidate.resourceKind}:${candidate.name}'.`,
        );
      }
      owners.set(identityKey, candidate);
    }
  }

  private sameOwnerResourceOrdinal(candidate: ResourceInventoryCandidate): number {
    let ordinal = 0;
    for (const current of this.candidates) {
      if (current === candidate) return ordinal;
      if (
        current.localOwnerHandle === candidate.localOwnerHandle
        && current.resourceKind === candidate.resourceKind
        && current.name === candidate.name
      ) {
        ordinal += 1;
      }
    }
    throw new Error(`Local resource candidate '${candidate.internalKey}' is not registered in its inventory.`);
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
        catalogOwnerKind: builtInResourceCatalogOwnerKind(candidate.builtIn.catalog.packageId),
      };
    }
    const declarationIdentity = this.declarationIdentityFor(candidate, targetIdentityHandle);
    const source = sources.implementation ?? sources.declaration ?? sources.publicName;
    const packageOrigin = declarationIdentity?.moduleKey == null
      ? null
      : this.emission.evaluation.packageOriginForModuleKey(declarationIdentity.moduleKey);
    const sourceHostPath = semanticSourceReferenceHostPath(this.emission.project.workspaceRootDir, source);
    const authoritativePackageOrigin = packageOrigin
      ?? (sourceHostPath == null
        ? null
        : this.emission.evaluation.packageOriginForModuleKey(sourceHostPath));
    const belongsToAuthoredProject = authoritativePackageOrigin == null
      ? sourceHostPath != null && this.emission.project.authoredSources.contains(sourceHostPath)
      : authoritativePackageOrigin.sourceScope === ResolvedEvaluationModuleSourceScope.AuthoredProject;
    if (belongsToAuthoredProject) {
      return {
        kind: SemanticResourceInventoryOriginKind.Project,
        projectKey: this.emission.project.projectKey,
        packageName: null,
        moduleKey: declarationIdentity?.moduleKey ?? null,
        catalogGroup: null,
        catalogOwnerKind: null,
      };
    }
    if (authoritativePackageOrigin != null) {
      return {
        kind: SemanticResourceInventoryOriginKind.Package,
        projectKey: null,
        packageName: authoritativePackageOrigin.packageInstance.name,
        moduleKey: declarationIdentity?.moduleKey ?? null,
        catalogGroup: null,
        catalogOwnerKind: null,
      };
    }
    if (source != null) {
      return {
        kind: SemanticResourceInventoryOriginKind.External,
        projectKey: null,
        packageName: null,
        moduleKey: declarationIdentity?.moduleKey ?? null,
        catalogGroup: null,
        catalogOwnerKind: null,
      };
    }
    return {
      kind: SemanticResourceInventoryOriginKind.Unknown,
      projectKey: null,
      packageName: null,
      moduleKey: declarationIdentity?.moduleKey ?? null,
      catalogGroup: null,
      catalogOwnerKind: null,
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
    const sourceProjection = this.definitionSourceProjectionFor(candidate);
    if (sourceProjection != null) {
      return inventorySources(
        sourceProjection.nameSource,
        sourceProjection.targetDeclarationSource ?? sourceProjection.source,
        sourceProjection.targetSource,
        candidate.builtIn != null,
      );
    }
    if (candidate.header instanceof ResourceDefinitionHeaderEmission) {
      const header = candidate.header;
      const target = header.targetReference;
      return inventorySources(
        describeAddress(this.store, header.lookupNameSourceAddressHandles[0] ?? null),
        describeAddress(this.store, target?.declarationSourceAddressHandle ?? header.sourceAddressHandle),
        describeAddress(this.store, target?.addressHandle ?? null),
        candidate.builtIn != null,
      );
    }
    if (candidate.header != null) {
      return inventorySources(
        null,
        describeAddress(this.store, candidate.header.sourceAddressHandle),
        null,
        candidate.builtIn != null,
      );
    }
    const availabilitySource = candidate.visibilityRows
      .map((row) => describeAddress(this.store, row.sourceAddressHandle))
      .find((source) => source != null) ?? null;
    return inventorySources(null, availabilitySource, null, candidate.builtIn != null);
  }

  private targetIdentityHandle(candidate: ResourceInventoryCandidate): IdentityHandle | null {
    return candidate.definition?.target.identityHandle
      ?? (candidate.header instanceof ResourceDefinitionHeaderEmission
        ? candidate.header.targetReference?.identityHandle ?? null
        : null);
  }

  private projectionBasisFor(
    candidate: ResourceInventoryCandidate,
  ): ResourceInventoryCandidateProjectionBasis {
    const existing = this.projectionBases.get(candidate);
    if (existing != null) {
      return existing;
    }
    const sources = this.primaryCandidateSources(candidate);
    const targetIdentityHandle = this.targetIdentityHandle(candidate);
    const identityKey = this.identityKeyFor(candidate, sources);
    const origin = this.originFor(candidate, sources, targetIdentityHandle);
    const basis: ResourceInventoryCandidateProjectionBasis = {
      sources,
      targetIdentityHandle,
      identityKey,
      origin,
      orderingKey: `${candidate.resourceKind}:${candidate.name}:${origin.kind}:${identityKey}`,
    };
    this.projectionBases.set(candidate, basis);
    return basis;
  }

  private definitionProjectionFor(
    candidate: ResourceInventoryCandidate,
  ): ResourceDefinitionCoreProjection | null {
    const definition = candidate.definition;
    if (definition == null) {
      return null;
    }
    const existing = this.definitionProjections.get(candidate);
    if (existing != null) {
      return existing;
    }
    const sources = this.definitionSourceProjectionFor(candidate);
    if (sources == null) {
      throw new Error(`Resource inventory definition candidate '${candidate.internalKey}' has no source projection.`);
    }
    const projection = readResourceDefinitionCoreProjection(
      this.emission,
      this.store,
      definition,
      this.includeTypeSurfaces,
      sources,
    );
    this.definitionProjections.set(candidate, projection);
    return projection;
  }

  private definitionSourceProjectionFor(
    candidate: ResourceInventoryCandidate,
  ): ResourceDefinitionSourceProjection | null {
    const definition = candidate.definition;
    if (definition == null) {
      return null;
    }
    const existing = this.definitionSourceProjections.get(candidate);
    if (existing != null) {
      return existing;
    }
    const projection = readResourceDefinitionSourceProjection(this.store, definition);
    this.definitionSourceProjections.set(candidate, projection);
    return projection;
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

/** @internal One exact compiler scope selected from a template cursor. */
export interface TemplateScopeSelection {
  readonly selection: TemplateResourceCursorSelection;
  readonly candidate: SemanticTemplateResourceScopeCandidate;
  /** Public-safe semantic discriminator used only when multiple worlds otherwise share one scope key. */
  readonly scopeFingerprint: string;
}

/** @internal Project a compiler scope without leaking its kernel identities. */
export function templateScopeSelection(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  inventory: ResourceInventoryBuilder,
  selection: TemplateResourceCursorSelection,
): TemplateScopeSelection {
  const compilation = selection.resource.compilation;
  const definitionCandidate = inventory.candidateForDefinition(compilation.definition);
  const definitionIdentityKey = definitionCandidate == null
    ? semanticKey('template-owner', [
        emission.project.projectKey,
        compilation.definition.name,
        semanticSourceReferenceKey(describeAddress(store, compilation.definition.sourceAddressHandle)),
      ])
    : inventory.identityKeyForCandidate(definitionCandidate);
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
  const scopeFingerprint = templateScopeFingerprint(store, inventory, compilerWorld.resourceScope);
  return {
    selection,
    scopeFingerprint,
    candidate: {
      templateIdentityKey,
      scopeIdentityKey,
      definitionName: compilation.definition.name,
      compilationLane: selection.lane,
      source,
    },
  };
}

function namedDefinitionName(definition: FullResourceDefinition): string {
  if ('name' in definition) {
    return definition.name;
  }
  throw new Error(`Compiler-syntax definition '${definition.type}' has no runtime resource name.`);
}

function sameDefinitionProduct(
  left: FullResourceDefinition,
  right: FullResourceDefinition,
): boolean {
  return left === right
    || (left.productHandle != null && left.productHandle === right.productHandle);
}

/** @internal Keep one stable selection per exact compiler scope. */
export function distinctTemplateScopeSelections(
  selections: readonly TemplateScopeSelection[],
): readonly TemplateScopeSelection[] {
  const grouped = new Map<string, TemplateScopeSelection[]>();
  for (const selection of selections) {
    const rows = grouped.get(selection.candidate.scopeIdentityKey) ?? [];
    rows.push(selection);
    grouped.set(selection.candidate.scopeIdentityKey, rows);
  }
  const byScope = new Map<string, TemplateScopeSelection>();
  for (const [baseKey, rows] of grouped) {
    const byFingerprint = new Map(rows.map((row) => [row.scopeFingerprint, row]));
    if (byFingerprint.size === 1) {
      byScope.set(baseKey, rows.at(-1)!);
      continue;
    }
    for (const row of byFingerprint.values()) {
      const scopeIdentityKey = semanticKey('template-resource-scope-variant', [baseKey, row.scopeFingerprint]);
      byScope.set(scopeIdentityKey, {
        ...row,
        candidate: { ...row.candidate, scopeIdentityKey },
      });
    }
  }
  return [...byScope.values()].sort((left, right) =>
    left.candidate.scopeIdentityKey.localeCompare(right.candidate.scopeIdentityKey)
  );
}

function templateScopeFingerprint(
  store: KernelStore,
  inventory: ResourceInventoryBuilder,
  scope: TemplateResourceCursorSelection['resource']['compilation']['compilerWorld']['resourceScope'],
): string {
  const resourceIdentity = (resource: TemplateVisibleResource): string =>
    inventory.identityKeyForVisibleResource(resource)
    ?? semanticKey('unprojected-visible-resource', [
      resource.resourceKind,
      resource.name,
      resource.aliases,
      semanticSourceReferenceKey(describeAddress(store, resource.sourceAddressHandle)),
    ]);
  const lookups = scope.lookups.map((lookup) => [
    lookup.lookupKey,
    resourceIdentity(lookup.winner),
    lookup.lane,
  ]).sort(compareSemanticRows);
  const exclusions = scope.exclusions.map((exclusion) => [
    exclusion.reason,
    [...exclusion.lookupKeys].sort(),
    resourceIdentity(exclusion.winner),
    resourceIdentity(exclusion.loser),
    exclusion.winnerLane,
    exclusion.loserLane,
  ]).sort(compareSemanticRows);
  const blockedLookups = scope.blockedLookups.map((lookup) => [
    lookup.lookupKey,
    lookup.lane,
    semanticSourceReferenceKey(describeAddress(store, lookup.sourceAddressHandle)),
  ]).sort(compareSemanticRows);
  return semanticKey('template-resource-scope-content', [lookups, blockedLookups, exclusions]);
}

function compareSemanticRows(left: readonly unknown[], right: readonly unknown[]): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function inventorySources(
  publicName: SemanticSourceReference | null,
  declaration: SemanticSourceReference | null,
  implementation: SemanticSourceReference | null,
  frameworkCatalog: boolean,
): SemanticResourceInventorySources {
  const navigation = inventoryNavigationSource([
    [publicName, SemanticResourceInventoryNavigationRole.PublicName],
    [implementation, SemanticResourceInventoryNavigationRole.Implementation],
  ]);
  return {
    publicName,
    declaration,
    implementation,
    navigation: navigation?.source ?? null,
    navigationRole: navigation?.role ?? null,
    navigationUnavailableReason: navigation != null
      ? null
      : frameworkCatalog
        ? SemanticResourceNavigationUnavailableReason.ExternalCatalog
        : SemanticResourceNavigationUnavailableReason.NoAuthoredSource,
  };
}

function inventoryNavigationSource(
  candidates: readonly (readonly [
    SemanticSourceReference | null,
    SemanticResourceInventoryNavigationRole,
  ])[],
): {
  readonly source: SemanticSourceReference;
  readonly role: SemanticResourceInventoryNavigationRole;
} | null {
  for (const [source, role] of candidates) {
    if (source != null && semanticExactSourceReference(source)?.path != null) {
      return { source, role };
    }
  }
  return null;
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

function resourceInventoryCandidateAuthority(candidate: ResourceInventoryCandidate): number {
  if (candidate.definition != null) return 0;
  if (candidate.header != null) return 1;
  return 2;
}

function semanticKey(namespace: string, values: readonly unknown[]): string {
  const digest = createHash('sha256').update(JSON.stringify(values)).digest('base64url').slice(0, 22);
  return `${namespace}:v1:${digest}`;
}

function sameNameOrdinal<T>(
  rows: readonly T[],
  index: number,
  identity: (row: T) => string,
): number {
  const key = identity(rows[index]!);
  let ordinal = 0;
  for (let current = 0; current < index; current++) {
    if (identity(rows[current]!) === key) ordinal += 1;
  }
  return ordinal;
}

function builtInResourceCatalogOwnerKind(
  packageId: BuiltInResourcePackage,
): SemanticResourceInventoryCatalogOwnerKind {
  switch (packageId) {
    case BuiltInResourcePackage.RuntimeHtml:
      return SemanticResourceInventoryCatalogOwnerKind.CoreFramework;
    case BuiltInResourcePackage.I18n:
    case BuiltInResourcePackage.Router:
    case BuiltInResourcePackage.UiVirtualization:
    case BuiltInResourcePackage.State:
    case BuiltInResourcePackage.ValidationHtml:
      return SemanticResourceInventoryCatalogOwnerKind.OfficialPlugin;
  }
}

function resourceInventoryCoverage(
  completeness: SemanticResourceInventoryCompleteness,
  sourceDiscoveryTruncated = false,
): SemanticRuntimeAnswerCoverage {
  if (sourceDiscoveryTruncated) {
    return SemanticRuntimeAnswerCoverage.Truncated;
  }
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
  coverage = resourceInventoryCoverage(completeness),
): string {
  const counts = new Map<SemanticResourceInventoryKind, number>();
  for (const row of rows) {
    counts.set(row.resourceKind, (counts.get(row.resourceKind) ?? 0) + 1);
  }
  const groups = SEMANTIC_RESOURCE_INVENTORY_KINDS
    .map((kind) => `${kind}: ${counts.get(kind) ?? 0}`)
    .join(', ');
  const open = coverage === SemanticRuntimeAnswerCoverage.Truncated
    ? ' Coverage was truncated by the source-discovery guardrail.'
    : coverage === SemanticRuntimeAnswerCoverage.Open
      ? ' Coverage remains open.'
      : '';
  return `Runtime resources (${rows.length} of ${total}): ${groups}.${open}`;
}
