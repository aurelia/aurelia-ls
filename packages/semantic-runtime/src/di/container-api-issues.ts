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
  readDiContainerApiCallSites,
  type DiContainerApiCallSite,
} from './container-api-recognition.js';
import type { ContainerResolutionFailureKind } from './container-lookup.js';
import type { DiIssue } from './di-issue.js';
import {
  DiIssuePublication,
  DiIssuePublisher,
  publishDiIssuePublications,
  withDiIssueSourceAddressRecords,
} from './di-issue-publication.js';
import type { DiProviderActivationView } from './provider-activation.js';

export class DiContainerApiIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes container API failures proven by the DI-owned ordered activation view. */
export class DiContainerApiIssueMaterializer {
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
  ): DiContainerApiIssueMaterialization {
    const publications = readDiContainerApiCallSites(project, typeSystem)
      .flatMap((site, index) => this.publicationsForContainerApiCall(project, activation, site, index));
    const emission = publishDiIssuePublications(this.publication, 'di-container-api-issues', publications);
    return new DiContainerApiIssueMaterialization(emission.issues, emission.records);
  }

  private publicationsForContainerApiCall(
    project: ProjectBootFrame,
    activation: DiProviderActivationView,
    site: DiContainerApiCallSite,
    index: number,
  ): readonly DiIssuePublication[] {
    const failure = activation.containerApiFailure(site);
    if (failure == null) {
      return [];
    }
    const local = containerApiIssueLocalKey(project, site, index, failure.failureKind);
    const source = this.sourceAddress(local, site);
    const publication = this.publisher.publishContainerResolutionFailureForContainerCall(
      local,
      site,
      failure.failureKind,
      failure.receiverDefaultResolverPolicy,
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

function containerApiIssueLocalKey(
  project: ProjectBootFrame,
  site: DiContainerApiCallSite,
  index: number,
  failureKind: ContainerResolutionFailureKind,
): string {
  return [
    'di-container-api-issue',
    failureKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
