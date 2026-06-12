import {
  EvidenceRole,
} from '../kernel/evidence.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  ComputedObservationDefinition,
  ComputedObservationProjectResult,
} from './computed-observation.js';
import {
  readComputedObservationSites,
  type ComputedObservationSite,
} from './computed-observation-recognition.js';
import { ObservationProductDetails } from './product-details.js';
import { sourceObservationProductRecords } from './source-observation-product-publication.js';

export class ComputedObservationDefinitionPublication {
  constructor(
    readonly definition: ComputedObservationDefinition,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes valid @computed getter/method dependency declarations as observation products. */
export class ComputedObservationMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): ComputedObservationProjectResult {
    const publications = readComputedObservationSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'computed-observation-definitions'));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.ComputedObservationDefinition,
        publication.definition.productHandle,
        publication.definition,
      );
    }

    return new ComputedObservationProjectResult(publications.map((publication) => publication.definition));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: ComputedObservationSite,
    index: number,
  ): ComputedObservationDefinitionPublication {
    const local = computedObservationDefinitionLocalKey(project, site, index);
    const product = sourceObservationProductRecords({
      store: this.store,
      local,
      site,
      productKindKey: KernelVocabulary.Observation.ComputedDefinition.key,
      evidenceRoles: [EvidenceRole.Declaration],
      evidenceSummary: computedObservationDefinitionSummary(site),
      identityOwnerHandle: null,
      identityLocalName: `${site.memberKind}:${site.memberName ?? '<anonymous>'}:${site.dependencyMode}`,
    });
    const definition = new ComputedObservationDefinition(
      product.productHandle,
      product.identityHandle,
      project.projectKey,
      site.memberKind,
      site.memberName,
      site.dependencyMode,
      site.dependencyKeys,
      site.dependencyFunctionCount,
      site.flush,
      site.deep,
      product.sourceAddressHandle,
      [],
    );
    return new ComputedObservationDefinitionPublication(definition, product.records);
  }
}

function computedObservationDefinitionSummary(
  site: ComputedObservationSite,
): string {
  const member = site.memberName == null
    ? site.memberKind
    : `${site.memberKind} ${site.memberName}`;
  const keys = site.dependencyKeys.length === 0
    ? ''
    : ` (${site.dependencyKeys.join(', ')})`;
  const functions = site.dependencyFunctionCount === 0
    ? ''
    : ` (${site.dependencyFunctionCount} dependency function${site.dependencyFunctionCount === 1 ? '' : 's'})`;
  return `@${site.decoratorName} ${member} uses ${site.dependencyMode}${keys}${functions}.`;
}

function computedObservationDefinitionLocalKey(
  project: ProjectBootFrame,
  site: ComputedObservationSite,
  index: number,
): string {
  return [
    'computed-observation-definition',
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
