import type { ProjectBootFrame } from '../boot/frames.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  DiContainerApiMethodKind,
  readDiContainerApiCallSites,
  type DiContainerApiCallSite,
} from './container-api-recognition.js';
import {
  DiIssueKind,
  type DiIssue,
} from './di-issue.js';
import {
  DiIssuePublication,
  DiIssuePublisher,
  publishDiIssuePublications,
  withDiIssueSourceAddressRecords,
} from './di-issue-publication.js';
import type { DiProviderActivationView } from './provider-activation.js';

export class DiDependencyCycleIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes singleton resolver re-entry diagnostics proven by the DI-owned provider activation view. */
export class DiDependencyCycleIssueMaterializer {
  private readonly publisher: DiIssuePublisher;

  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    activation: DiProviderActivationView,
  ): DiDependencyCycleIssueMaterialization {
    const publications = readDiContainerApiCallSites(project, typeSystem)
      .flatMap((site, index) => this.publicationsForEntrySite(project, activation, site, index));
    const emission = publishDiIssuePublications(this.publication, 'di-dependency-cycle-issues', publications);
    return new DiDependencyCycleIssueMaterialization(emission.issues, emission.records);
  }

  private publicationsForEntrySite(
    project: ProjectBootFrame,
    activation: DiProviderActivationView,
    site: DiContainerApiCallSite,
    index: number,
  ): readonly DiIssuePublication[] {
    if (site.methodKind !== DiContainerApiMethodKind.Get) {
      return [];
    }
    const cycle = activation.dependencyCycleForContainerGet(site);
    if (cycle == null || cycle.length === 0) {
      return [];
    }
    const local = dependencyCycleIssueLocalKey(project, site, index);
    const source = this.sourceAddress(local, site);
    const entryKeyName = site.keyName
      ?? cycle[0]?.keyName
      ?? site.keyExpressionText
      ?? '(anonymous DI key)';
    const publication = this.publisher.publishCyclicDependency(
      local,
      site.keyExpressionText,
      entryKeyName,
      cycle,
      source.handle,
    );
    return [withDiIssueSourceAddressRecords(publication, source.records)];
  }

  private sourceAddress(
    local: string,
    site: DiContainerApiCallSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
  }
}

function dependencyCycleIssueLocalKey(
  project: ProjectBootFrame,
  site: DiContainerApiCallSite,
  index: number,
): string {
  return [
    'di-dependency-cycle-issue',
    DiIssueKind.CyclicDependency,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
