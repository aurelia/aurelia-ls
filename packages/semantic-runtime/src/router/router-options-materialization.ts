import type { ProjectBootFrame } from '../boot/frames.js';
import type { AppRoot, AppRootReference } from '../configuration/app-root.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationOptionContribution } from '../configuration/configuration-option.js';
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import {
  configurationOptionContributionsForAdmission,
  configurationValueSourceAddressHandleForAdmission,
} from '../configuration/configuration-option-ownership.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import type { ContainerRegistrationOperation } from '../di/container-registration.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  readFieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type {
  KernelStoreReadView,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { frameworkRegistrationKindForOperation } from '../di/container-registration.js';
import {
  FrameworkRegistrationKind,
} from '../registration/registration-reference.js';
import {
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  RouterIssueRelatedInformation,
  RouterOptionsFieldState,
  RouterOptionsFieldStateKind,
  RouterOptionsModel,
  type RouterOptionsField,
  type RouterOptionsReference,
  type RouterOptionsValueField,
} from './model.js';
import { RouterFrameworkErrorCode } from './framework-error-code.js';
import { routerIssueProductRecords } from './router-issue-publication.js';
import { RouterProductDetails } from './product-details.js';
import { routerProductRecords } from './router-product-records.js';

interface RouterOptionsEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly options: RouterOptionsModel;
}

interface RouterOptionsSeed {
  readonly appRoot: AppRoot;
  readonly operation: ContainerRegistrationOperation;
  readonly contributions: readonly ConfigurationOptionContribution[];
  readonly configurationValueSourceAddressHandle: AddressHandle | null;
}

interface RouterRegistrationUse {
  readonly appRoot: AppRoot;
  readonly operation: ContainerRegistrationOperation;
}

interface RouterOptionsSeedSet {
  readonly seeds: readonly RouterOptionsSeed[];
  readonly duplicateGroups: readonly (readonly RouterRegistrationUse[])[];
}

interface RouterIssueEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly issue: RouterIssueModel;
}

class RouterOptionsDraft {
  readonly winningContributions = new Map<RouterOptionsValueField, ConfigurationOptionContribution>();
  basePath: string | null = null;
  useUrlFragmentHash = false;
  useHref = true;
  historyStrategy: string | null = 'push';
  useNavigationModel = true;
  activeClass: string | null = null;
  restorePreviousRouteTreeOnError = true;
  treatQueryAsParameters = false;
  useEagerLoading = false;
}

const ROUTER_OPTIONS_VALUE_FIELDS = [
  'basePath',
  'useUrlFragmentHash',
  'useHref',
  'historyStrategy',
  'useNavigationModel',
  'activeClass',
  'restorePreviousRouteTreeOnError',
  'treatQueryAsParameters',
  'useEagerLoading',
] as const satisfies readonly RouterOptionsValueField[];

/** Root-owned RouterOptions products materialized from concrete RouterConfiguration registration uses. */
export class RouterOptionsMaterializationProjectResult {
  private readonly optionsByAppRoot = new Map<ProductHandle, RouterOptionsModel>();
  private readonly optionsByProduct = new Map<ProductHandle, RouterOptionsModel>();

  constructor(
    readonly project: ProjectBootFrame,
    readonly routerOptions: readonly RouterOptionsModel[],
    readonly issues: readonly RouterIssueModel[],
  ) {
    for (const options of routerOptions) {
      if (options.appRoot.productHandle != null) {
        this.optionsByAppRoot.set(options.appRoot.productHandle, options);
      }
      this.optionsByProduct.set(options.productHandle, options);
    }
  }

  readRouterOptions(): readonly RouterOptionsModel[] {
    return this.routerOptions;
  }

  readRouterOptionsForAppRoot(
    appRoot: AppRoot | AppRootReference,
  ): RouterOptionsModel | null {
    return appRoot.productHandle == null
      ? null
      : this.optionsByAppRoot.get(appRoot.productHandle) ?? null;
  }

  readRouterOptionsForReference(
    reference: RouterOptionsReference | null,
  ): RouterOptionsModel | null {
    return reference?.productHandle == null
      ? null
      : this.optionsByProduct.get(reference.productHandle) ?? null;
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.issues;
  }
}

/** Fold source-backed RouterConfiguration option contributions through RouterOptions.create(...) defaults. */
export class RouterOptionsMaterializationProjectPass {
  materializeAndEmit(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    configuration: ConfigurationRecognitionProjectResult,
    diWorld: DiWorldConstructionEmission,
  ): RouterOptionsMaterializationProjectResult {
    const kernel = configuration.readConfiguration();
    const seedSet = routerOptionsSeeds(publication, kernel, diWorld);
    const emissions = seedSet.seeds.map((seed, index) =>
      this.materializeRouterOptions(publication, project, seed, index)
    );
    const issueEmissions = seedSet.duplicateGroups.flatMap((group) =>
      this.materializeDuplicateRegistrationIssues(publication, project, group)
    );
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...issueEmissions.flatMap((emission) => emission.records),
    ];
    publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `router-options:${project.projectKey}`),
      publishProductDetails(
        RouterProductDetails.RouterOptions,
        emissions.map((emission) => emission.options),
      ),
    ));
    return new RouterOptionsMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.options),
      issueEmissions.map((emission) => emission.issue),
    );
  }

  private materializeRouterOptions(
    store: KernelStoreReadView,
    project: ProjectBootFrame,
    seed: RouterOptionsSeed,
    index: number,
  ): RouterOptionsEmission {
    const draft = foldRouterOptions(seed.contributions);
    const local = `router-options:${project.projectKey}:${seed.appRoot.identityHandle}:${seed.operation.identityHandle}:${index}`;
    // Preserve the legacy row-navigation representative. Exact field causality is owned by winningContributions.
    const sourceAddressHandle = seed.contributions.at(-1)?.sourceAddressHandle
      ?? seed.operation.admission.sourceAddressHandle
      ?? seed.operation.sourceAddressHandle;
    const options = routerOptionsModel(
      store,
      local,
      seed,
      draft,
      sourceAddressHandle,
    );
    return {
      records: routerOptionsRecords(
        store,
        local,
        seed,
        draft,
        options,
      ),
      options,
    };
  }

  private materializeDuplicateRegistrationIssues(
    store: KernelStoreReadView,
    project: ProjectBootFrame,
    uses: readonly RouterRegistrationUse[],
  ): readonly RouterIssueEmission[] {
    const first = uses[0] ?? null;
    if (first == null) {
      return [];
    }
    return uses.slice(1).map((duplicate, index) => {
      const local = [
        'router-issue',
        project.projectKey,
        RouterIssueKind.DuplicateRouterConfiguration,
        duplicate.appRoot.identityHandle,
        duplicate.operation.identityHandle,
        index,
      ].join(':');
      const sourceAddressHandle = duplicate.operation.admission.sourceAddressHandle
        ?? duplicate.operation.sourceAddressHandle;
      const message = 'RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.';
      const issue = new RouterIssueModel(
        store.handles.product(local),
        store.handles.identity(local),
        RouterIssuePhase.RouterConfigurationRegistration,
        RouterIssueKind.DuplicateRouterConfiguration,
        message,
        'error',
        RouterFrameworkErrorCode.RootRouteContextAlreadyRegistered,
        null,
        null,
        null,
        'one RouterConfiguration registration per application container tree',
        `${uses.length} registrations`,
        duplicate.appRoot.component?.localName ?? null,
        null,
        null,
        null,
        sourceAddressHandle,
        [new RouterIssueRelatedInformation(
          'The first RouterConfiguration registration in this application container tree is here.',
          first.operation.admission.sourceAddressHandle ?? first.operation.sourceAddressHandle,
        )],
      );
      return {
        issue,
        records: routerIssueProductRecords(store, {
          local,
          issue,
          ownerHandle: duplicate.appRoot.identityHandle,
          sourceAddressHandle,
          localName: duplicate.appRoot.component?.localName ?? 'RouterConfiguration',
          evidenceSummary: message,
        }),
      };
    });
  }
}

function routerOptionsModel(
  store: KernelStoreReadView,
  local: string,
  seed: RouterOptionsSeed,
  draft: RouterOptionsDraft,
  sourceAddressHandle: AddressHandle | null,
): RouterOptionsModel {
  return new RouterOptionsModel(
    store.handles.product(local),
    store.handles.identity(local),
    seed.appRoot.toReference(),
    seed.operation.container,
    seed.operation.productHandle,
    seed.operation.identityHandle,
    seed.operation.admission.sourceAddressHandle ?? seed.operation.sourceAddressHandle,
    seed.operation.registrationValue?.productHandle ?? null,
    seed.operation.registrationValue?.identityHandle ?? null,
    seed.configurationValueSourceAddressHandle,
    draft.basePath,
    draft.useUrlFragmentHash,
    draft.useHref,
    draft.historyStrategy,
    draft.useNavigationModel,
    draft.activeClass,
    draft.restorePreviousRouteTreeOnError,
    draft.treatQueryAsParameters,
    draft.useEagerLoading,
    routerOptionsFieldStates(draft),
    sourceAddressHandle,
    routerOptionsFieldProvenance(store, seed, draft),
  );
}

function routerOptionsRecords(
  store: KernelStoreReadView,
  local: string,
  seed: RouterOptionsSeed,
  draft: RouterOptionsDraft,
  options: RouterOptionsModel,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: options.productHandle,
    identityHandle: options.identityHandle,
    productKindKey: KernelVocabulary.Router.Options.key,
    ownerHandle: seed.appRoot.identityHandle,
    materializationOwnerHandle: seed.operation.identityHandle,
    sourceAddressHandle: options.sourceAddressHandle,
    localName: 'RouterOptions',
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'RouterOptions materialized from RouterConfiguration defaults and recognized customize option contributions.',
    additionalProvenanceEvidenceHandles: routerOptionsInputEvidenceHandles(store, seed, draft),
  });
}

function routerOptionsSeeds(
  store: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
  diWorld: DiWorldConstructionEmission,
): RouterOptionsSeedSet {
  const appRootsByContainer = new Map(
    configuration.appRoots.flatMap((appRoot) =>
      appRoot.container.productHandle == null
        ? []
        : [[appRoot.container.productHandle, appRoot] as const]
    ),
  );
  const usesByAppRoot = new Map<ProductHandle, RouterRegistrationUse[]>();
  for (const operation of diWorld.registrationOperations) {
    if (
      frameworkRegistrationKindForOperation(operation) !== FrameworkRegistrationKind.RouterConfiguration
      || operation.container.productHandle == null
    ) {
      continue;
    }
    const appRoot = appRootsByContainer.get(operation.container.productHandle) ?? null;
    if (appRoot == null) {
      continue;
    }
    const uses = usesByAppRoot.get(appRoot.productHandle);
    const use = { appRoot, operation };
    if (uses == null) {
      usesByAppRoot.set(appRoot.productHandle, [use]);
    } else {
      uses.push(use);
    }
  }

  const seeds: RouterOptionsSeed[] = [];
  const duplicateGroups: RouterRegistrationUse[][] = [];
  for (const uses of usesByAppRoot.values()) {
    if (uses.length !== 1) {
      duplicateGroups.push(uses);
      continue;
    }
    const use = uses[0]!;
    const configurationValueSourceAddressHandle = configurationValueSourceAddressHandleForAdmission(
      use.operation.admission,
    );
    seeds.push({
      ...use,
      contributions: configurationOptionContributionsForAdmission(configuration, use.operation.admission)
        .filter((contribution) =>
          contribution.configurationKind === FrameworkRegistrationKind.RouterConfiguration
        ),
      configurationValueSourceAddressHandle,
    });
  }
  return { seeds, duplicateGroups };
}

function foldRouterOptions(
  contributions: readonly ConfigurationOptionContribution[],
): RouterOptionsDraft {
  const draft = new RouterOptionsDraft();
  for (const contribution of contributions) {
    foldRouterOption(draft, contribution);
  }
  return draft;
}

function foldRouterOption(
  draft: RouterOptionsDraft,
  contribution: ConfigurationOptionContribution,
): void {
  if (contribution.optionPath.length !== 1) {
    return;
  }
  const name = contribution.optionPath[0];
  switch (name) {
    case 'basePath':
      draft.basePath = stringOrNullOption(contribution, draft.basePath, draft, name);
      return;
    case 'useUrlFragmentHash':
      draft.useUrlFragmentHash = booleanOption(contribution, draft.useUrlFragmentHash, draft, name);
      return;
    case 'useHref':
      draft.useHref = booleanOption(contribution, draft.useHref, draft, name);
      return;
    case 'historyStrategy':
      draft.historyStrategy = stringOption(contribution, draft.historyStrategy, draft, name);
      return;
    case 'useNavigationModel':
      draft.useNavigationModel = booleanOption(contribution, draft.useNavigationModel, draft, name);
      return;
    case 'activeClass':
      draft.activeClass = stringOrNullOption(contribution, draft.activeClass, draft, name);
      return;
    case 'restorePreviousRouteTreeOnError':
      draft.restorePreviousRouteTreeOnError = booleanOption(contribution, draft.restorePreviousRouteTreeOnError, draft, name);
      return;
    case 'treatQueryAsParameters':
      draft.treatQueryAsParameters = booleanOption(contribution, draft.treatQueryAsParameters, draft, name);
      return;
    case 'useEagerLoading':
      draft.useEagerLoading = booleanOption(contribution, draft.useEagerLoading, draft, name);
      return;
    default:
      return;
  }
}

function booleanOption(
  contribution: ConfigurationOptionContribution,
  current: boolean,
  draft: RouterOptionsDraft,
  field: RouterOptionsValueField,
): boolean {
  if (contribution.value.valueKind !== ConfigurationOptionValueKind.Boolean) {
    return current;
  }
  draft.winningContributions.set(field, contribution);
  return contribution.value.value;
}

function stringOption(
  contribution: ConfigurationOptionContribution,
  current: string | null,
  draft: RouterOptionsDraft,
  field: RouterOptionsValueField,
): string | null {
  if (contribution.value.valueKind !== ConfigurationOptionValueKind.String) {
    return current;
  }
  draft.winningContributions.set(field, contribution);
  return contribution.value.value;
}

function stringOrNullOption(
  contribution: ConfigurationOptionContribution,
  current: string | null,
  draft: RouterOptionsDraft,
  field: RouterOptionsValueField,
): string | null {
  switch (contribution.value.valueKind) {
    case ConfigurationOptionValueKind.String:
      draft.winningContributions.set(field, contribution);
      return contribution.value.value;
    case ConfigurationOptionValueKind.Null:
      draft.winningContributions.set(field, contribution);
      return null;
    default:
      return current;
  }
}

function routerOptionsFieldStates(
  draft: RouterOptionsDraft,
): readonly RouterOptionsFieldState[] {
  return ROUTER_OPTIONS_VALUE_FIELDS.map((field) => {
    const contribution = draft.winningContributions.get(field) ?? null;
    return new RouterOptionsFieldState(
      field,
      contribution == null
        ? RouterOptionsFieldStateKind.Defaulted
        : RouterOptionsFieldStateKind.Configured,
      contribution?.productHandle ?? null,
      contribution?.identityHandle ?? null,
      contribution?.value.addressHandle ?? contribution?.sourceAddressHandle ?? null,
    );
  });
}

function routerOptionsFieldProvenance(
  store: KernelStoreReadView,
  seed: RouterOptionsSeed,
  draft: RouterOptionsDraft,
): readonly FieldProvenance<RouterOptionsField>[] {
  const configurationValueProvenance = readFieldProvenance(
    seed.operation.admission.fieldProvenance,
    'registeredValue',
  ) ?? productProvenanceHandle(store, seed.operation.registrationValue?.productHandle ?? null)
    ?? productProvenanceHandle(store, seed.operation.admission.productHandle);
  return compactFieldProvenance<RouterOptionsField>([
    fieldProvenance('appRoot', productProvenanceHandle(store, seed.appRoot.productHandle)),
    fieldProvenance('container', productProvenanceHandle(store, seed.operation.container.productHandle)),
    fieldProvenance('registration', productProvenanceHandle(store, seed.operation.productHandle)),
    fieldProvenance('configurationValue', configurationValueProvenance),
    ...ROUTER_OPTIONS_VALUE_FIELDS.map((field) => {
      const contribution = draft.winningContributions.get(field) ?? null;
      return contribution == null
        ? null
        : fieldProvenance(
            field,
            readFieldProvenance(contribution.fieldProvenance, 'value')
              ?? productProvenanceHandle(store, contribution.productHandle),
          );
    }),
  ]);
}

function routerOptionsInputEvidenceHandles(
  store: KernelStoreReadView,
  seed: RouterOptionsSeed,
  draft: RouterOptionsDraft,
): readonly EvidenceHandle[] {
  const winningContributions = [...new Set(draft.winningContributions.values())];
  return [...new Set([
    ...provenanceEvidenceHandlesForProduct(store, seed.operation.productHandle),
    ...provenanceEvidenceHandlesForProduct(store, seed.operation.admission.productHandle),
    ...provenanceEvidenceHandlesForProduct(store, seed.operation.registrationValue?.productHandle ?? null),
    ...winningContributions.flatMap((contribution) =>
      provenanceEvidenceHandlesForProduct(store, contribution.productHandle)
    ),
  ])].sort();
}

function productProvenanceHandle(
  store: KernelStoreReadView,
  productHandle: ProductHandle | null,
): ProvenanceHandle | null {
  if (productHandle == null) {
    return null;
  }
  const product = store.read(productHandle);
  return product?.kind === 'materialized-product' ? product.provenanceHandle : null;
}

function provenanceEvidenceHandlesForProduct(
  store: KernelStoreReadView,
  productHandle: ProductHandle | null,
): readonly EvidenceHandle[] {
  const provenanceHandle = productProvenanceHandle(store, productHandle);
  if (provenanceHandle == null) {
    return [];
  }
  const provenance = store.read(provenanceHandle);
  return provenance?.kind === 'provenance-record' ? provenance.evidenceHandles : [];
}

function fieldProvenance(
  field: RouterOptionsField,
  provenanceHandle: ProvenanceHandle | null,
): FieldProvenance<RouterOptionsField> | null {
  return provenanceHandle == null ? null : new FieldProvenance(field, provenanceHandle);
}
