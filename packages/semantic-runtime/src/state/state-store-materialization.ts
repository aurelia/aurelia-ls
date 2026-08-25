import {
  ConfigurationOptionContributionKind,
  ConfigurationOptionValueKind,
  type ConfigurationOptionContribution,
} from '../configuration/configuration-option.js';
import {
  configurationOptionContributionsForAdmission,
  configurationValueSourceAddressHandleForAdmission,
} from '../configuration/configuration-option-ownership.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  ConfigurationStepKind,
  type ConfigurationStep,
} from '../configuration/configuration-sequence.js';
import type { ContainerRegistrationOperation } from '../di/container-registration.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import type {
  AddressHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { sourceSpanAddressForAddress } from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
} from '../kernel/store.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import {
  aggregateFieldProvenance,
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
  readFieldProvenance,
} from '../kernel/provenance.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { frameworkRegistrationKindForOperation } from '../di/container-registration.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import { smallestExpressionForSpan } from '../type-system/source-address-expression.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import { StateProductDetails } from './product-details.js';
import { StateRawErrorAuthority } from './framework-raw-error-authority.js';
import {
  stateStoreConfigurationProductEmission,
  type StateStoreConfigurationProductSeed,
} from './store-configuration-product-records.js';
import type { StateGetterBinding, StateStoreConfiguration } from './model.js';
import { DEFAULT_STATE_STORE_NAME } from './state-store-identity.js';
import {
  StateIssueKind,
  StateIssuePhase,
  type StateIssue,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';
import { StateStoreVisibility } from './state-store-visibility.js';

/** State products recovered from @aurelia/state configuration and source-level API usage. */
export class StateProjectResult {
  constructor(
    readonly stores: readonly StateStoreConfiguration[],
    readonly getterBindings: readonly StateGetterBinding[],
    readonly issues: readonly StateIssue[],
    readonly storeVisibility: StateStoreVisibility,
  ) {}

  readStores(): readonly StateStoreConfiguration[] {
    return this.stores;
  }

  readGetterBindings(): readonly StateGetterBinding[] {
    return this.getterBindings;
  }

  readIssues(): readonly StateIssue[] {
    return this.issues;
  }

  readStoreVisibility(): StateStoreVisibility {
    return this.storeVisibility;
  }
}

/** Materialize @aurelia/state store configuration before framework AppTasks create Store instances. */
export class StateStoreConfigurationMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    configuration: ConfigurationRecognitionProjectResult,
    diWorld: DiWorldConstructionEmission,
    typeSystem: TypeSystemProject | null,
    publication: KernelPublicationContext,
  ): StateProjectResult {
    const seeds = readStateStoreConfigurationSeeds(
      store,
      publication,
      configuration,
      diWorld,
      typeSystem,
    );
    const issuePublications = stateIssuePublications(store, seeds);
    const validSeeds = seeds.filter((seed) => !stateStoreSeedIsReservedDefaultWithStore(seed));
    const emissions = validSeeds.map((seed) =>
      stateStoreConfigurationProductEmission(store, seed)
    );
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...issuePublications.flatMap((publication) => publication.records),
    ];
    publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `state-store-configuration:${configuration.project.projectKey}`),
      [
        ...publishProductDetails(
          StateProductDetails.StoreConfiguration,
          emissions.map((emission) => emission.store),
        ),
        ...publishProductDetails(
          StateProductDetails.Issue,
          issuePublications.map((publication) => publication.issue),
        ),
      ],
    ));
    const stores = emissions.map((emission) => emission.store);
    return new StateProjectResult(
      stores,
      [],
      issuePublications.map((publication) => publication.issue),
      StateStoreVisibility.fromDiWorld(stores, diWorld),
    );
  }
}

function stateIssuePublications(
  store: KernelStore,
  seeds: readonly StateStoreConfigurationProductSeed[],
): readonly StateIssuePublication[] {
  const publisher = new StateIssuePublisher(store);
  return [
    ...reservedDefaultStoreNameIssuePublications(publisher, seeds),
    ...duplicateStoreNameIssuePublications(publisher, seeds),
  ];
}

function reservedDefaultStoreNameIssuePublications(
  publisher: StateIssuePublisher,
  seeds: readonly StateStoreConfigurationProductSeed[],
): readonly StateIssuePublication[] {
  return seeds
    .filter(stateStoreSeedIsReservedDefaultWithStore)
    .map((seed) =>
      publisher.publish(
        seed.projectKey,
        seed.ownerIdentityHandle,
        StateIssuePhase.StoreConfiguration,
        StateIssueKind.ReservedDefaultStoreName,
        'The store name "default" is reserved. Please choose a different name for this store.',
        StateRawErrorAuthority.ReservedDefaultStoreName,
        seed.nameSourceAddressHandle ?? seed.sourceAddressHandle,
        seed.name,
      )
    );
}

function duplicateStoreNameIssuePublications(
  publisher: StateIssuePublisher,
  seeds: readonly StateStoreConfigurationProductSeed[],
): readonly StateIssuePublication[] {
  const publications: StateIssuePublication[] = [];
  const firstSeedByRegistryAndName = new Map<string, StateStoreConfigurationProductSeed>();
  for (const seed of seeds) {
    if (stateStoreSeedIsReservedDefaultWithStore(seed) || seed.name == null) {
      continue;
    }
    const registryKey = [
      seed.container.identityHandle ?? seed.container.productHandle ?? 'open-container',
      seed.name,
    ].join(':');
    const existing = firstSeedByRegistryAndName.get(registryKey);
    if (existing == null) {
      firstSeedByRegistryAndName.set(registryKey, seed);
      continue;
    }
    publications.push(
      publisher.publish(
        seed.projectKey,
        seed.ownerIdentityHandle,
        StateIssuePhase.StoreRegistryRegistration,
        StateIssueKind.DuplicateStoreName,
        `A store with name "${seed.name}" has already been registered.`,
        StateRawErrorAuthority.DuplicateStoreName,
        seed.nameSourceAddressHandle ?? seed.sourceAddressHandle,
        seed.name,
      ),
    );
  }
  return publications;
}

function stateStoreSeedIsReservedDefaultWithStore(
  seed: StateStoreConfigurationProductSeed,
): boolean {
  return !seed.isDefault && seed.name === DEFAULT_STATE_STORE_NAME;
}

function readStateStoreConfigurationSeeds(
  store: KernelStore,
  publication: KernelPublicationContext,
  configuration: ConfigurationRecognitionProjectResult,
  diWorld: DiWorldConstructionEmission,
  typeSystem: TypeSystemProject | null,
): readonly StateStoreConfigurationProductSeed[] {
  const emission = configuration.readConfiguration();
  const seeds: StateStoreConfigurationProductSeed[] = [];
  for (const operation of diWorld.registrationOperations) {
    const admission = operation.admission;
    if (
      frameworkRegistrationKindForOperation(operation)
        !== FrameworkRegistrationKind.StateDefaultConfiguration
    ) {
      continue;
    }
    const contributions = configurationOptionContributionsForAdmission(
      emission,
      admission,
    );
    const contributionsByProductHandle = new Map(
      contributions.map((contribution) => [contribution.productHandle, contribution]),
    );
    for (const step of emission.steps) {
      if (step.stepKind !== ConfigurationStepKind.BuilderMutation) {
        continue;
      }
      const stepContributions = step.producedProductHandles
        .map((handle) => contributionsByProductHandle.get(handle) ?? null)
        .filter((contribution): contribution is ConfigurationOptionContribution =>
          contribution != null
          && contribution.contributionKind === ConfigurationOptionContributionKind.BuilderArgument
          && contribution.configurationKind === FrameworkRegistrationKind.StateDefaultConfiguration
        );
      const seed = stateStoreConfigurationSeedForBuilderStep(
        store,
        publication,
        configuration.project.projectKey,
        operation,
        step,
        stepContributions,
        typeSystem,
      );
      if (seed != null) {
        seeds.push(seed);
      }
    }
  }
  return seeds;
}

function stateStoreConfigurationSeedForBuilderStep(
  store: KernelStore,
  publication: KernelPublicationContext,
  projectKey: string,
  operation: ContainerRegistrationOperation,
  step: ConfigurationStep,
  contributions: readonly ConfigurationOptionContribution[],
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed | null {
  const methodName = stateStoreBuilderMethodName(contributions);
  if (methodName === 'init') {
    return stateStoreConfigurationSeedForInit(
      store,
      publication,
      projectKey,
      operation,
      step,
      contributions,
      typeSystem,
    );
  }
  if (methodName === 'withStore') {
    return stateStoreConfigurationSeedForWithStore(
      store,
      publication,
      projectKey,
      operation,
      step,
      contributions,
      typeSystem,
    );
  }
  return null;
}

function stateStoreBuilderMethodName(
  contributions: readonly ConfigurationOptionContribution[],
): string | null {
  const names = new Set(contributions.map((contribution) => contribution.optionPath[0] ?? null));
  if (names.size !== 1) {
    return null;
  }
  return [...names][0] ?? null;
}

function stateStoreConfigurationSeedForInit(
  store: KernelStore,
  publication: KernelPublicationContext,
  projectKey: string,
  operation: ContainerRegistrationOperation,
  step: ConfigurationStep,
  contributions: readonly ConfigurationOptionContribution[],
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed {
  const argument = argumentsByIndex(contributions);
  const initialState = argument.get(0) ?? null;
  const optionsOrHandlerContribution = argument.get(1) ?? null;
  const optionsOrHandler = optionsOrHandlerFor(optionsOrHandlerContribution);
  const actionHandlers = actionHandlerContributions(argument, optionsOrHandler);
  const local = `state-store-configuration:${projectKey}:${operation.identityHandle}:${step.identityHandle}:${DEFAULT_STATE_STORE_NAME}`;
  const provenance = stateStoreConfigurationFieldProvenance(
    publication,
    operation,
    step,
    null,
    initialState,
    optionsOrHandlerContribution,
    actionHandlers,
    local,
  );
  return {
    projectKey,
    ...stateStoreApplicationSeed(operation, step),
    name: DEFAULT_STATE_STORE_NAME,
    isDefault: true,
    initialStateKind: initialState?.value.valueKind ?? null,
    optionsOrHandlerKind: optionsOrHandler.kind,
    actionHandlerCount: actionHandlers.length,
    sourceAddressHandle: step.sourceAddressHandle,
    nameSourceAddressHandle: null,
    initialStateSourceAddressHandle: initialState?.value.addressHandle ?? null,
    initialStateType: stateStoreInitialStateType(
      store,
      publication,
      typeSystem,
      initialState,
      local,
    ),
    optionsOrHandlerSourceAddressHandle: optionsOrHandler.sourceAddressHandle,
    actionHandlerSourceAddressHandles: actionHandlers
      .map((contribution) => contribution.value.addressHandle)
      .filter((handle): handle is AddressHandle => handle != null),
    fieldProvenance: provenance.fieldProvenance,
    fieldProvenanceRecords: provenance.records,
  };
}

function stateStoreConfigurationSeedForWithStore(
  store: KernelStore,
  publication: KernelPublicationContext,
  projectKey: string,
  operation: ContainerRegistrationOperation,
  step: ConfigurationStep,
  contributions: readonly ConfigurationOptionContribution[],
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed {
  const argument = argumentsByIndex(contributions);
  const name = argument.get(0) ?? null;
  const initialState = argument.get(1) ?? null;
  const optionsOrHandlerContribution = argument.get(2) ?? null;
  const optionsOrHandler = optionsOrHandlerFor(optionsOrHandlerContribution);
  const actionHandlers = actionHandlerContributions(argument, optionsOrHandler);
  const storeName = name?.value.valueKind === ConfigurationOptionValueKind.String ? name.value.value : null;
  const local = `state-store-configuration:${projectKey}:${operation.identityHandle}:${step.identityHandle}:${storeName ?? 'named'}`;
  const provenance = stateStoreConfigurationFieldProvenance(
    publication,
    operation,
    step,
    name,
    initialState,
    optionsOrHandlerContribution,
    actionHandlers,
    local,
  );
  return {
    projectKey,
    ...stateStoreApplicationSeed(operation, step),
    name: storeName,
    isDefault: false,
    initialStateKind: initialState?.value.valueKind ?? null,
    optionsOrHandlerKind: optionsOrHandler.kind,
    actionHandlerCount: actionHandlers.length,
    sourceAddressHandle: step.sourceAddressHandle,
    nameSourceAddressHandle: name?.value.addressHandle ?? null,
    initialStateSourceAddressHandle: initialState?.value.addressHandle ?? null,
    initialStateType: stateStoreInitialStateType(
      store,
      publication,
      typeSystem,
      initialState,
      local,
    ),
    optionsOrHandlerSourceAddressHandle: optionsOrHandler.sourceAddressHandle,
    actionHandlerSourceAddressHandles: actionHandlers
      .map((contribution) => contribution.value.addressHandle)
      .filter((handle): handle is AddressHandle => handle != null),
    fieldProvenance: provenance.fieldProvenance,
    fieldProvenanceRecords: provenance.records,
  };
}

function stateStoreApplicationSeed(
  operation: ContainerRegistrationOperation,
  step: ConfigurationStep,
): Pick<
  StateStoreConfigurationProductSeed,
  | 'container'
  | 'registrationProductHandle'
  | 'registrationAdmissionProductHandle'
  | 'registrationIdentityHandle'
  | 'registrationSourceAddressHandle'
  | 'configurationStepProductHandle'
  | 'configurationStepIdentityHandle'
  | 'configurationValueSourceAddressHandle'
  | 'ownerIdentityHandle'
> {
  const admission = operation.admission;
  return {
    container: operation.container,
    registrationProductHandle: operation.productHandle,
    registrationAdmissionProductHandle: admission.productHandle,
    registrationIdentityHandle: operation.identityHandle,
    registrationSourceAddressHandle: admission.sourceAddressHandle ?? operation.sourceAddressHandle,
    configurationStepProductHandle: step.productHandle,
    configurationStepIdentityHandle: step.identityHandle,
    configurationValueSourceAddressHandle: configurationValueSourceAddressHandleForAdmission(admission),
    ownerIdentityHandle: operation.identityHandle,
  };
}

function stateStoreInitialStateType(
  store: KernelStore,
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject | null,
  contribution: ConfigurationOptionContribution | null,
  localKey: string,
): CheckerTypeReference | null {
  if (typeSystem == null || contribution?.value.addressHandle == null) {
    return null;
  }
  const sourceSpan = sourceSpanAddressForAddress(publication, contribution.value.addressHandle);
  const sourceFileAddress = sourceSpan == null ? null : publication.read(sourceSpan.fileHandle);
  const sourceFile = sourceFileAddress?.kind === 'source-file-address'
    ? typeSystem.readProgramSourceFileForAddress(sourceFileAddress)
    : null;
  const node = sourceFile == null || sourceSpan == null
    ? null
    : smallestExpressionForSpan(sourceFile, sourceSpan.start, sourceSpan.end);
  if (node == null) {
    return null;
  }
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeAtLocation(node);
  if (type == null) {
    return null;
  }
  return new CheckerTypeProjector(store, publication).ensureProjection({
    localKey: `${localKey}:initial-state-type`,
    checker,
    type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: node,
    sourceAddressHandle: contribution.value.addressHandle,
    display: checker.typeToString(type, node),
  }).toReference();
}

function argumentsByIndex(
  contributions: readonly ConfigurationOptionContribution[],
): ReadonlyMap<number, ConfigurationOptionContribution> {
  const values = new Map<number, ConfigurationOptionContribution>();
  for (const contribution of contributions) {
    const indexText = contribution.optionPath[1] ?? null;
    const index = indexText == null ? Number.NaN : Number.parseInt(indexText, 10);
    if (Number.isInteger(index) && index >= 0 && !values.has(index)) {
      values.set(index, contribution);
    }
  }
  return values;
}

function optionsOrHandlerFor(
  contribution: ConfigurationOptionContribution | null,
): { readonly kind: StateStoreConfigurationProductSeed['optionsOrHandlerKind']; readonly sourceAddressHandle: AddressHandle | null; readonly handlerStartIndex: number | null } {
  if (contribution == null) {
    return { kind: 'absent', sourceAddressHandle: null, handlerStartIndex: null };
  }
  switch (contribution.value.valueKind) {
    case ConfigurationOptionValueKind.Object:
      return { kind: 'options-object', sourceAddressHandle: contribution.value.addressHandle, handlerStartIndex: argumentIndex(contribution) + 1 };
    case ConfigurationOptionValueKind.Callback:
      return { kind: 'action-handler', sourceAddressHandle: contribution.value.addressHandle, handlerStartIndex: argumentIndex(contribution) };
    default:
      return { kind: 'ambiguous', sourceAddressHandle: contribution.value.addressHandle, handlerStartIndex: argumentIndex(contribution) + 1 };
  }
}

function actionHandlerContributions(
  argument: ReadonlyMap<number, ConfigurationOptionContribution>,
  optionsOrHandler: ReturnType<typeof optionsOrHandlerFor>,
): readonly ConfigurationOptionContribution[] {
  const handlerStartIndex = optionsOrHandler.handlerStartIndex;
  if (handlerStartIndex == null) {
    return [];
  }
  return [...argument.entries()]
    .filter(([index, contribution]) =>
      index >= handlerStartIndex && contribution.value.valueKind === ConfigurationOptionValueKind.Callback
    )
    .sort(([left], [right]) => left - right)
    .map(([, contribution]) => contribution);
}

function argumentIndex(contribution: ConfigurationOptionContribution): number {
  const index = Number.parseInt(contribution.optionPath[1] ?? '', 10);
  return Number.isInteger(index) ? index : 0;
}

interface StateStoreConfigurationFieldProvenanceEmission {
  readonly fieldProvenance: StateStoreConfigurationProductSeed['fieldProvenance'];
  readonly records: readonly ProvenanceRecord[];
}

function stateStoreConfigurationFieldProvenance(
  publication: KernelPublicationContext,
  operation: ContainerRegistrationOperation,
  step: ConfigurationStep,
  name: ConfigurationOptionContribution | null,
  initialState: ConfigurationOptionContribution | null,
  optionsOrHandler: ConfigurationOptionContribution | null,
  actionHandlers: readonly ConfigurationOptionContribution[],
  local: string,
): StateStoreConfigurationFieldProvenanceEmission {
  const admission = operation.admission;
  const containerProvenance = operation.container.productHandle == null
    ? null
    : productProvenanceHandle(publication, operation.container.productHandle);
  const registrationProvenance = productProvenanceHandle(publication, operation.productHandle);
  const registrationAdmissionProvenance = productProvenanceHandle(publication, admission.productHandle);
  const stepProvenance = productProvenanceHandle(publication, step.productHandle);
  const configurationValueProvenance = readFieldProvenance(admission.fieldProvenance, 'registeredValue')
    ?? productProvenanceHandle(publication, admission.productHandle);
  const actionHandlerProvenance = aggregateFieldProvenance(
    'actionHandlers',
    actionHandlers.flatMap((handler) => {
      const handle = contributionProvenanceHandle(publication, handler);
      return handle == null ? [] : [handle];
    }),
    publication.handles.provenance(`${local}:field:action-handlers`),
    (handle) => {
      const record = publication.read(handle);
      return record instanceof ProvenanceRecord ? record : null;
    },
  );
  return {
    fieldProvenance: compactFieldProvenance([
      fieldProvenance('container', containerProvenance),
      fieldProvenance('registration', registrationProvenance),
      fieldProvenance('registrationAdmission', registrationAdmissionProvenance),
      fieldProvenance('configurationStep', stepProvenance),
      fieldProvenance('configurationValue', configurationValueProvenance),
      fieldProvenance('name', contributionProvenanceHandle(publication, name)),
      fieldProvenance('initialState', contributionProvenanceHandle(publication, initialState)),
      fieldProvenance('optionsOrHandler', contributionProvenanceHandle(publication, optionsOrHandler)),
      actionHandlerProvenance.fieldProvenance,
      fieldProvenance('source', stepProvenance),
    ]),
    records: actionHandlerProvenance.records,
  };
}

function contributionProvenanceHandle(
  publication: KernelPublicationContext,
  contribution: ConfigurationOptionContribution | null,
): ProvenanceHandle | null {
  return contribution == null
    ? null
    : productProvenanceHandle(publication, contribution.productHandle);
}

function productProvenanceHandle(
  publication: KernelPublicationContext,
  productHandle: ProductHandle,
): ProvenanceHandle | null {
  const record = publication.read(productHandle);
  return record instanceof MaterializedProduct ? record.provenanceHandle : null;
}

function fieldProvenance(
  field: StateStoreConfigurationProductSeed['fieldProvenance'][number]['field'],
  provenanceHandle: StateStoreConfigurationProductSeed['fieldProvenance'][number]['provenanceHandle'] | null,
) {
  return provenanceHandle == null ? null : new FieldProvenance(field, provenanceHandle);
}
