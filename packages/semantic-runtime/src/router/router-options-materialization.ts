import type { ProjectBootFrame } from '../boot/frames.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import type { ConfigurationOptionContribution } from '../configuration/configuration-option.js';
import { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { ConfigurationSequence } from '../configuration/configuration-sequence.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { RouterIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
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

class RouterOptionsEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly options: RouterOptionsModel,
  ) {}
}

interface RouterOptionsSeed {
  readonly sequence: ConfigurationSequence;
  readonly contributions: ConfigurationOptionContribution[];
  sourceAddressHandle: AddressHandle | null;
}

class RouterOptionsDraft {
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
    const evidenceHandle = store.handles.evidence(local);
    const provenanceHandle = store.handles.provenance(local);
    const productHandle = store.handles.product(local);
    const identityHandle = store.handles.identity(local);
    const sourceAddressHandle = seed.sourceAddressHandle ?? seed.sequence.sourceAddressHandle;
    const options = new RouterOptionsModel(
      productHandle,
      identityHandle,
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
      routerOptionsFieldProvenance(provenanceHandle),
    );
    return new RouterOptionsEmission(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          'RouterOptions materialized from RouterConfiguration defaults and recognized customize option contributions.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        new RouterIdentity(
          identityHandle,
          KernelVocabulary.Router.Options.key,
          seed.sequence.identityHandle,
          sourceAddressHandle,
          'RouterOptions',
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Router.Options.key,
          identityHandle,
          sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(local),
          seed.sequence.identityHandle,
          [productHandle],
          [],
          [],
        ),
      ],
      options,
    );
  }
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
      draft.basePath = stringOrNullOption(contribution);
      return;
    case 'useUrlFragmentHash':
      draft.useUrlFragmentHash = booleanOption(contribution, draft.useUrlFragmentHash);
      return;
    case 'useHref':
      draft.useHref = booleanOption(contribution, draft.useHref);
      return;
    case 'historyStrategy':
      draft.historyStrategy = stringOption(contribution, draft.historyStrategy);
      return;
    case 'useNavigationModel':
      draft.useNavigationModel = booleanOption(contribution, draft.useNavigationModel);
      return;
    case 'activeClass':
      draft.activeClass = stringOrNullOption(contribution);
      return;
    case 'restorePreviousRouteTreeOnError':
      draft.restorePreviousRouteTreeOnError = booleanOption(contribution, draft.restorePreviousRouteTreeOnError);
      return;
    case 'treatQueryAsParameters':
      draft.treatQueryAsParameters = booleanOption(contribution, draft.treatQueryAsParameters);
      return;
    case 'useEagerLoading':
      draft.useEagerLoading = booleanOption(contribution, draft.useEagerLoading);
      return;
    default:
      return;
  }
}

function booleanOption(
  contribution: ConfigurationOptionContribution,
  current: boolean,
): boolean {
  return contribution.value.valueKind === ConfigurationOptionValueKind.Boolean
    ? contribution.value.value
    : current;
}

function stringOption(
  contribution: ConfigurationOptionContribution,
  current: string | null,
): string | null {
  return contribution.value.valueKind === ConfigurationOptionValueKind.String
    ? contribution.value.value
    : current;
}

function stringOrNullOption(
  contribution: ConfigurationOptionContribution,
): string | null {
  switch (contribution.value.valueKind) {
    case ConfigurationOptionValueKind.String:
      return contribution.value.value;
    case ConfigurationOptionValueKind.Null:
      return null;
    default:
      return null;
  }
}

function routerOptionsFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<RouterOptionsField>[] {
  return compactFieldProvenance<RouterOptionsField>([
    new FieldProvenance('basePath', provenanceHandle),
    new FieldProvenance('useUrlFragmentHash', provenanceHandle),
    new FieldProvenance('useHref', provenanceHandle),
    new FieldProvenance('historyStrategy', provenanceHandle),
    new FieldProvenance('useNavigationModel', provenanceHandle),
    new FieldProvenance('activeClass', provenanceHandle),
    new FieldProvenance('restorePreviousRouteTreeOnError', provenanceHandle),
    new FieldProvenance('treatQueryAsParameters', provenanceHandle),
    new FieldProvenance('useEagerLoading', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}
