import type { ProjectBootFrame } from '../boot/frames.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationOptionContribution } from '../configuration/configuration-option.js';
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { ConfigurationSequence } from '../configuration/configuration-sequence.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
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
  frameworkRegistrationKindForAdmission,
} from '../registration/registration-admission.js';
import {
  FrameworkRegistrationKind,
} from '../registration/registration-reference.js';
import {
  RouterOptionsModel,
  type RouterOptionsField,
} from './model.js';
import { routerProductRecords } from './router-product-records.js';

interface RouterOptionsEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly options: RouterOptionsModel;
}

interface RouterOptionsSeed {
  readonly sequence: ConfigurationSequence;
  readonly contributions: ConfigurationOptionContribution[];
  sourceAddressHandle: AddressHandle | null;
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

/** RouterOptions products materialized from RouterConfiguration admissions and customize(...) option contributions. */
export class RouterOptionsMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly routerOptions: readonly RouterOptionsModel[],
  ) {}

  readRouterOptions(): readonly RouterOptionsModel[] {
    return this.routerOptions;
  }

  readEffectiveRouterOptions(): RouterOptionsModel | null {
    return this.routerOptions[0] ?? null;
  }
}

/** Fold source-backed RouterConfiguration option contributions through RouterOptions.create(...) defaults. */
export class RouterOptionsMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouterOptionsMaterializationProjectResult {
    const kernel = configuration.readConfiguration();
    const emissions = routerOptionsSeeds(kernel).map((seed, index) =>
      this.materializeRouterOptions(store, project, seed, index)
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-options:${project.projectKey}`));
    }
    return new RouterOptionsMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.options),
    );
  }

  private materializeRouterOptions(
    store: KernelStore,
    project: ProjectBootFrame,
    seed: RouterOptionsSeed,
    index: number,
  ): RouterOptionsEmission {
    const draft = foldRouterOptions(seed.contributions);
    const local = `router-options:${project.projectKey}:${seed.sequence.identityHandle}:${index}`;
    const sourceAddressHandle = seed.sourceAddressHandle ?? seed.sequence.sourceAddressHandle;
    const options = routerOptionsModel(
      store,
      local,
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
}

function routerOptionsModel(
  store: KernelStore,
  local: string,
  draft: RouterOptionsDraft,
  sourceAddressHandle: AddressHandle | null,
): RouterOptionsModel {
  const provenanceHandle = store.handles.provenance(local);
  return new RouterOptionsModel(
    store.handles.product(local),
    store.handles.identity(local),
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
    ownerHandle: seed.sequence.identityHandle,
    sourceAddressHandle: options.sourceAddressHandle,
    localName: 'RouterOptions',
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'RouterOptions materialized from RouterConfiguration defaults and recognized customize option contributions.',
  });
}

function routerOptionsSeeds(
  configuration: ConfigurationKernelEmission,
): readonly RouterOptionsSeed[] {
  const sequencesByProduct = new Map(
    configuration.sequences.map((sequence) => [sequence.productHandle, sequence] as const),
  );
  const admissionsByProduct = new Map(
    configuration.registrationAdmissions.map((admission) => [admission.productHandle, admission] as const),
  );
  const contributionsByProduct = new Map(
    configuration.optionContributions.map((contribution) => [contribution.productHandle, contribution] as const),
  );
  const seedsBySequence = new Map<ConfigurationSequence['productHandle'], RouterOptionsSeed>();

  for (const step of configuration.steps) {
    const sequenceHandle = step.sequence?.productHandle ?? null;
    if (sequenceHandle == null) {
      continue;
    }
    const sequence = sequencesByProduct.get(sequenceHandle);
    if (sequence == null) {
      continue;
    }
    for (const admissionHandle of step.registrationAdmissionProductHandles) {
      const admission = admissionsByProduct.get(admissionHandle);
      if (admission != null && frameworkRegistrationKindForAdmission(admission) === FrameworkRegistrationKind.RouterConfiguration) {
        const seed = ensureRouterOptionsSeed(seedsBySequence, sequence);
        seed.sourceAddressHandle ??= admission.sourceAddressHandle;
      }
    }
    for (const productHandle of step.producedProductHandles) {
      const contribution = contributionsByProduct.get(productHandle);
      if (contribution?.configurationKind !== FrameworkRegistrationKind.RouterConfiguration) {
        continue;
      }
      const seed = ensureRouterOptionsSeed(seedsBySequence, sequence);
      seed.contributions.push(contribution);
      seed.sourceAddressHandle = contribution.sourceAddressHandle;
    }
  }

  return [...seedsBySequence.values()];
}

function ensureRouterOptionsSeed(
  seedsBySequence: Map<ConfigurationSequence['productHandle'], RouterOptionsSeed>,
  sequence: ConfigurationSequence,
): RouterOptionsSeed {
  let seed = seedsBySequence.get(sequence.productHandle);
  if (seed == null) {
    seed = {
      sequence,
      contributions: [],
      sourceAddressHandle: null,
    };
    seedsBySequence.set(sequence.productHandle, seed);
  }
  return seed;
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
    ...configuredFields,
    'source',
  ], provenanceHandle);
}
