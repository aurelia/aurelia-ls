import type { ProjectBootFrame } from '../boot/frames.js';
import type { AppRoot, AppRootReference } from '../configuration/app-root.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationOptionContribution } from '../configuration/configuration-option.js';
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import type { ContainerRegistrationOperation } from '../di/container-registration.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  fieldProvenanceEntries,
  FieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  FrameworkRegistrationAdmission,
  RegistryRegistrationAdmission,
  frameworkRegistrationKindForAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
} from '../registration/registration-reference.js';
import {
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  RouterIssueRelatedInformation,
  RouterOptionsModel,
  type RouterOptionsField,
  type RouterOptionsReference,
} from './model.js';
import { RouterFrameworkErrorCode } from './framework-error-code.js';
import { routerIssueProductRecords } from './router-issue-publication.js';
import { routerProductRecords } from './router-product-records.js';

interface RouterOptionsEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly options: RouterOptionsModel;
}

interface RouterOptionsSeed {
  readonly appRoot: AppRoot;
  readonly operation: ContainerRegistrationOperation;
  readonly admission: RegistrationAdmissionProduct;
  readonly contributions: readonly ConfigurationOptionContribution[];
  readonly configurationValueSourceAddressHandle: AddressHandle | null;
}

interface RouterRegistrationUse {
  readonly appRoot: AppRoot;
  readonly operation: ContainerRegistrationOperation;
  readonly admission: RegistrationAdmissionProduct;
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
  readonly configuredFields = new Set<RouterOptionsField>();
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
    store: KernelStore,
    project: ProjectBootFrame,
    configuration: ConfigurationRecognitionProjectResult,
    diWorld: DiWorldConstructionEmission,
  ): RouterOptionsMaterializationProjectResult {
    const kernel = configuration.readConfiguration();
    const seedSet = routerOptionsSeeds(store, kernel, diWorld);
    const emissions = seedSet.seeds.map((seed, index) =>
      this.materializeRouterOptions(store, project, seed, index)
    );
    const issueEmissions = seedSet.duplicateGroups.flatMap((group) =>
      this.materializeDuplicateRegistrationIssues(store, project, group)
    );
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...issueEmissions.flatMap((emission) => emission.records),
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-options:${project.projectKey}`));
    }
    return new RouterOptionsMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.options),
      issueEmissions.map((emission) => emission.issue),
    );
  }

  private materializeRouterOptions(
    store: KernelStore,
    project: ProjectBootFrame,
    seed: RouterOptionsSeed,
    index: number,
  ): RouterOptionsEmission {
    const draft = foldRouterOptions(seed.contributions);
    const local = `router-options:${project.projectKey}:${seed.appRoot.identityHandle}:${seed.operation.identityHandle}:${index}`;
    const sourceAddressHandle = seed.contributions.at(-1)?.sourceAddressHandle
      ?? seed.admission.sourceAddressHandle;
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
        options,
      ),
      options,
    };
  }

  private materializeDuplicateRegistrationIssues(
    store: KernelStore,
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
      const sourceAddressHandle = duplicate.operation.admissionAddressHandle
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
          first.operation.admissionAddressHandle ?? first.operation.sourceAddressHandle,
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
  store: KernelStore,
  local: string,
  seed: RouterOptionsSeed,
  draft: RouterOptionsDraft,
  sourceAddressHandle: AddressHandle | null,
): RouterOptionsModel {
  const provenanceHandle = store.handles.provenance(local);
  return new RouterOptionsModel(
    store.handles.product(local),
    store.handles.identity(local),
    seed.appRoot.toReference(),
    seed.operation.container,
    seed.operation.productHandle,
    seed.operation.admissionAddressHandle ?? seed.operation.sourceAddressHandle,
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
    sourceAddressHandle,
    routerOptionsFieldProvenance(provenanceHandle, draft.configuredFields),
  );
}

function routerOptionsRecords(
  store: KernelStore,
  local: string,
  seed: RouterOptionsSeed,
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
  });
}

function routerOptionsSeeds(
  store: KernelStore,
  configuration: ConfigurationKernelEmission,
  diWorld: DiWorldConstructionEmission,
): RouterOptionsSeedSet {
  const admissionsByProduct = new Map(
    configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission] as const),
  );
  const appRootsByContainer = new Map(
    configuration.appRoots.flatMap((appRoot) =>
      appRoot.container.productHandle == null
        ? []
        : [[appRoot.container.productHandle, appRoot] as const]
    ),
  );
  const contributionsByConfigurationValue = new Map<string, ConfigurationOptionContribution[]>();
  for (const contribution of configuration.optionContributions) {
    if (contribution.configurationKind !== FrameworkRegistrationKind.RouterConfiguration) {
      continue;
    }
    const key = configurationValueSourceKey(store, contribution.configurationValueSourceAddressHandle);
    if (key == null) {
      continue;
    }
    const contributions = contributionsByConfigurationValue.get(key);
    if (contributions == null) {
      contributionsByConfigurationValue.set(key, [contribution]);
    } else {
      contributions.push(contribution);
    }
  }

  const usesByAppRoot = new Map<ProductHandle, RouterRegistrationUse[]>();
  for (const operation of diWorld.registrationOperations) {
    const admission = operation.admissionProductHandle == null
      ? null
      : admissionsByProduct.get(operation.admissionProductHandle) ?? null;
    if (
      admission == null
      || frameworkRegistrationKindForAdmission(admission) !== FrameworkRegistrationKind.RouterConfiguration
      || operation.container.productHandle == null
    ) {
      continue;
    }
    const appRoot = appRootsByContainer.get(operation.container.productHandle) ?? null;
    if (appRoot == null) {
      continue;
    }
    const uses = usesByAppRoot.get(appRoot.productHandle);
    const use = { appRoot, operation, admission };
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
    const configurationValueSourceAddressHandle = registrationValueSourceAddressHandle(use.admission);
    const contributionKey = configurationValueSourceKey(store, configurationValueSourceAddressHandle);
    seeds.push({
      ...use,
      contributions: contributionKey == null
        ? []
        : contributionsByConfigurationValue.get(contributionKey) ?? [],
      configurationValueSourceAddressHandle,
    });
  }
  return { seeds, duplicateGroups };
}

function registrationValueSourceAddressHandle(
  admission: RegistrationAdmissionProduct,
): AddressHandle | null {
  if (admission instanceof FrameworkRegistrationAdmission) {
    return admission.registeredValue?.addressHandle ?? null;
  }
  if (admission instanceof RegistryRegistrationAdmission) {
    return admission.registryValue?.addressHandle ?? null;
  }
  return null;
}

function configurationValueSourceKey(
  store: KernelStore,
  addressHandle: AddressHandle | null,
): string | null {
  if (addressHandle == null) {
    return null;
  }
  const address = store.readAddress(addressHandle);
  return address?.kind === 'source-span-address'
    ? `${address.fileHandle}\0${address.start}\0${address.end}`
    : null;
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
      draft.basePath = stringOrNullOption(contribution, draft.basePath, draft.configuredFields, name);
      return;
    case 'useUrlFragmentHash':
      draft.useUrlFragmentHash = booleanOption(contribution, draft.useUrlFragmentHash, draft.configuredFields, name);
      return;
    case 'useHref':
      draft.useHref = booleanOption(contribution, draft.useHref, draft.configuredFields, name);
      return;
    case 'historyStrategy':
      draft.historyStrategy = stringOption(contribution, draft.historyStrategy, draft.configuredFields, name);
      return;
    case 'useNavigationModel':
      draft.useNavigationModel = booleanOption(contribution, draft.useNavigationModel, draft.configuredFields, name);
      return;
    case 'activeClass':
      draft.activeClass = stringOrNullOption(contribution, draft.activeClass, draft.configuredFields, name);
      return;
    case 'restorePreviousRouteTreeOnError':
      draft.restorePreviousRouteTreeOnError = booleanOption(contribution, draft.restorePreviousRouteTreeOnError, draft.configuredFields, name);
      return;
    case 'treatQueryAsParameters':
      draft.treatQueryAsParameters = booleanOption(contribution, draft.treatQueryAsParameters, draft.configuredFields, name);
      return;
    case 'useEagerLoading':
      draft.useEagerLoading = booleanOption(contribution, draft.useEagerLoading, draft.configuredFields, name);
      return;
    default:
      return;
  }
}

function booleanOption(
  contribution: ConfigurationOptionContribution,
  current: boolean,
  configuredFields: Set<RouterOptionsField>,
  field: RouterOptionsField,
): boolean {
  if (contribution.value.valueKind !== ConfigurationOptionValueKind.Boolean) {
    return current;
  }
  configuredFields.add(field);
  return contribution.value.value;
}

function stringOption(
  contribution: ConfigurationOptionContribution,
  current: string | null,
  configuredFields: Set<RouterOptionsField>,
  field: RouterOptionsField,
): string | null {
  if (contribution.value.valueKind !== ConfigurationOptionValueKind.String) {
    return current;
  }
  configuredFields.add(field);
  return contribution.value.value;
}

function stringOrNullOption(
  contribution: ConfigurationOptionContribution,
  current: string | null,
  configuredFields: Set<RouterOptionsField>,
  field: RouterOptionsField,
): string | null {
  switch (contribution.value.valueKind) {
    case ConfigurationOptionValueKind.String:
      configuredFields.add(field);
      return contribution.value.value;
    case ConfigurationOptionValueKind.Null:
      configuredFields.add(field);
      return null;
    default:
      return current;
  }
}

function routerOptionsFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  configuredFields: ReadonlySet<RouterOptionsField>,
): readonly FieldProvenance<RouterOptionsField>[] {
  // These same-handle field rows encode configured-field presence; option-object source precision is the owner record.
  return fieldProvenanceEntries<RouterOptionsField>([
    'appRoot',
    'container',
    'registration',
    'configurationValue',
    ...configuredFields,
    'source',
  ], provenanceHandle);
}
