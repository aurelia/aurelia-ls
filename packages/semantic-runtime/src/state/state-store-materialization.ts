import ts from 'typescript';
import {
  SourceSpanAddress,
} from '../kernel/address.js';
import {
  ConfigurationOptionContributionKind,
  ConfigurationOptionValueKind,
  type ConfigurationOptionContribution,
} from '../configuration/configuration-option.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import { ConfigurationStepKind } from '../configuration/configuration-sequence.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  KernelStoreBatch,
  type KernelStore,
} from '../kernel/store.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
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
import { StateStoreConfiguration } from './model.js';
import {
  StateIssueKind,
  StateIssuePhase,
  type StateIssue,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';

/** State products recovered from @aurelia/state configuration and source-level API usage. */
export class StateProjectResult {
  constructor(
    readonly configuration: ConfigurationRecognitionProjectResult,
    readonly stores: readonly StateStoreConfiguration[],
    readonly issues: readonly StateIssue[],
  ) {}

  readStores(): readonly StateStoreConfiguration[] {
    return this.stores;
  }

  readIssues(): readonly StateIssue[] {
    return this.issues;
  }
}

/** Materialize @aurelia/state store configuration before framework AppTasks create Store instances. */
export class StateStoreConfigurationMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    configuration: ConfigurationRecognitionProjectResult,
    typeSystem: TypeSystemProject | null = null,
  ): StateProjectResult {
    const seeds = readStateStoreConfigurationSeeds(store, configuration, typeSystem);
    const issuePublications = stateIssuePublications(store, seeds);
    const validSeeds = seeds.filter((seed) => !stateStoreSeedIsReservedDefaultWithStore(seed));
    const emissions = validSeeds.map((seed, index) =>
      stateStoreConfigurationProductEmission(store, seed, index)
    );
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...issuePublications.flatMap((publication) => publication.records),
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `state-store-configuration:${configuration.project.projectKey}`));
    }
    for (const emission of emissions) {
      store.productDetails.add(StateProductDetails.StoreConfiguration, emission.store.productHandle, emission.store);
    }
    for (const publication of issuePublications) {
      store.productDetails.add(StateProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new StateProjectResult(
      configuration,
      emissions.map((emission) => emission.store),
      issuePublications.map((publication) => publication.issue),
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
  const firstSeedByName = new Map<string, StateStoreConfigurationProductSeed>();
  for (const seed of seeds) {
    if (stateStoreSeedIsReservedDefaultWithStore(seed) || seed.name == null) {
      continue;
    }
    const existing = firstSeedByName.get(seed.name);
    if (existing == null) {
      firstSeedByName.set(seed.name, seed);
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
  return !seed.isDefault && seed.name === 'default';
}

function readStateStoreConfigurationSeeds(
  store: KernelStore,
  configuration: ConfigurationRecognitionProjectResult,
  typeSystem: TypeSystemProject | null,
): readonly StateStoreConfigurationProductSeed[] {
  const emission = configuration.readConfiguration();
  const contributionsByProductHandle = new Map(
    emission.optionContributions.map((contribution) => [contribution.productHandle, contribution]),
  );
  const seeds: StateStoreConfigurationProductSeed[] = [];
  for (const step of emission.steps) {
    if (step.stepKind !== ConfigurationStepKind.BuilderMutation) {
      continue;
    }
    const contributions = step.producedProductHandles
      .map((handle) => contributionsByProductHandle.get(handle) ?? null)
      .filter((contribution): contribution is ConfigurationOptionContribution =>
        contribution != null
        && contribution.contributionKind === ConfigurationOptionContributionKind.BuilderArgument
        && contribution.configurationKind === FrameworkRegistrationKind.StateDefaultConfiguration
      );
    const seed = stateStoreConfigurationSeedForBuilderStep(
      store,
      configuration.project.projectKey,
      step,
      contributions,
      seeds.length,
      typeSystem,
    );
    if (seed != null) {
      seeds.push(seed);
    }
  }
  return seeds;
}

function stateStoreConfigurationSeedForBuilderStep(
  store: KernelStore,
  projectKey: string,
  step: { readonly identityHandle: StateStoreConfigurationProductSeed['ownerIdentityHandle']; readonly sourceAddressHandle: AddressHandle | null },
  contributions: readonly ConfigurationOptionContribution[],
  storeIndex: number,
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed | null {
  const methodName = stateStoreBuilderMethodName(contributions);
  if (methodName === 'init') {
    return stateStoreConfigurationSeedForInit(store, projectKey, step, contributions, storeIndex, typeSystem);
  }
  if (methodName === 'withStore') {
    return stateStoreConfigurationSeedForWithStore(store, projectKey, step, contributions, storeIndex, typeSystem);
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
  projectKey: string,
  step: { readonly identityHandle: StateStoreConfigurationProductSeed['ownerIdentityHandle']; readonly sourceAddressHandle: AddressHandle | null },
  contributions: readonly ConfigurationOptionContribution[],
  storeIndex: number,
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed {
  const argument = argumentsByIndex(contributions);
  const initialState = argument.get(0) ?? null;
  const optionsOrHandler = optionsOrHandlerFor(argument.get(1) ?? null);
  return {
    projectKey,
    ownerIdentityHandle: step.identityHandle,
    name: 'default',
    isDefault: true,
    initialStateKind: initialState?.value.valueKind ?? null,
    optionsOrHandlerKind: optionsOrHandler.kind,
    actionHandlerCount: actionHandlerSourceAddressHandles(argument, optionsOrHandler).length,
    sourceAddressHandle: step.sourceAddressHandle,
    nameSourceAddressHandle: null,
    initialStateSourceAddressHandle: initialState?.value.addressHandle ?? null,
    initialStateType: stateStoreInitialStateType(
      store,
      typeSystem,
      initialState,
      `state-store-configuration:${projectKey}:${storeIndex}:default`,
    ),
    optionsOrHandlerSourceAddressHandle: optionsOrHandler.sourceAddressHandle,
    actionHandlerSourceAddressHandles: actionHandlerSourceAddressHandles(argument, optionsOrHandler),
  };
}

function stateStoreConfigurationSeedForWithStore(
  store: KernelStore,
  projectKey: string,
  step: { readonly identityHandle: StateStoreConfigurationProductSeed['ownerIdentityHandle']; readonly sourceAddressHandle: AddressHandle | null },
  contributions: readonly ConfigurationOptionContribution[],
  storeIndex: number,
  typeSystem: TypeSystemProject | null,
): StateStoreConfigurationProductSeed {
  const argument = argumentsByIndex(contributions);
  const name = argument.get(0) ?? null;
  const initialState = argument.get(1) ?? null;
  const optionsOrHandler = optionsOrHandlerFor(argument.get(2) ?? null);
  return {
    projectKey,
    ownerIdentityHandle: step.identityHandle,
    name: name?.value.valueKind === ConfigurationOptionValueKind.String ? name.value.value : null,
    isDefault: false,
    initialStateKind: initialState?.value.valueKind ?? null,
    optionsOrHandlerKind: optionsOrHandler.kind,
    actionHandlerCount: actionHandlerSourceAddressHandles(argument, optionsOrHandler).length,
    sourceAddressHandle: step.sourceAddressHandle,
    nameSourceAddressHandle: name?.value.addressHandle ?? null,
    initialStateSourceAddressHandle: initialState?.value.addressHandle ?? null,
    initialStateType: stateStoreInitialStateType(
      store,
      typeSystem,
      initialState,
      `state-store-configuration:${projectKey}:${storeIndex}:${
        name?.value.valueKind === ConfigurationOptionValueKind.String ? name.value.value : 'named'
      }`,
    ),
    optionsOrHandlerSourceAddressHandle: optionsOrHandler.sourceAddressHandle,
    actionHandlerSourceAddressHandles: actionHandlerSourceAddressHandles(argument, optionsOrHandler),
  };
}

function stateStoreInitialStateType(
  store: KernelStore,
  typeSystem: TypeSystemProject | null,
  contribution: ConfigurationOptionContribution | null,
  localKey: string,
): CheckerTypeReference | null {
  if (typeSystem == null || contribution?.value.addressHandle == null) {
    return null;
  }
  const node = programExpressionForSourceAddress(store, typeSystem, contribution.value.addressHandle);
  if (node == null) {
    return null;
  }
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeAtLocation(node);
  if (type == null) {
    return null;
  }
  return new CheckerTypeProjector(store).ensureProjection({
    localKey: `${localKey}:initial-state-type`,
    checker,
    type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: node,
    sourceAddressHandle: contribution.value.addressHandle,
    display: checker.typeToString(type, node),
  }).toReference();
}

function programExpressionForSourceAddress(
  store: KernelStore,
  typeSystem: TypeSystemProject,
  sourceAddressHandle: AddressHandle,
): ts.Expression | null {
  const address = store.readAddress(sourceAddressHandle);
  if (!(address instanceof SourceSpanAddress)) {
    return null;
  }
  const fileAddress = store.readAddress(address.fileHandle);
  if (fileAddress?.kind !== 'source-file-address') {
    return null;
  }
  const sourceFile = typeSystem.readProgramSourceFileByPath(fileAddress.path);
  return sourceFile == null ? null : smallestExpressionForSpan(sourceFile, address.start, address.end);
}

function smallestExpressionForSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Expression | null {
  let best: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (node.end < start || node.getStart(sourceFile) > end) {
      return;
    }
    if (ts.isExpression(node) && node.getStart(sourceFile) === start && node.end === end) {
      best = node;
    }
    if (node.getStart(sourceFile) <= start && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
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

function actionHandlerSourceAddressHandles(
  argument: ReadonlyMap<number, ConfigurationOptionContribution>,
  optionsOrHandler: ReturnType<typeof optionsOrHandlerFor>,
): readonly AddressHandle[] {
  const handlerStartIndex = optionsOrHandler.handlerStartIndex;
  if (handlerStartIndex == null) {
    return [];
  }
  return [...argument.entries()]
    .filter(([index, contribution]) =>
      index >= handlerStartIndex && contribution.value.valueKind === ConfigurationOptionValueKind.Callback
    )
    .sort(([left], [right]) => left - right)
    .map(([, contribution]) => contribution.value.addressHandle)
    .filter((handle): handle is AddressHandle => handle != null);
}

function argumentIndex(contribution: ConfigurationOptionContribution): number {
  const index = Number.parseInt(contribution.optionPath[1] ?? '', 10);
  return Number.isInteger(index) ? index : 0;
}
