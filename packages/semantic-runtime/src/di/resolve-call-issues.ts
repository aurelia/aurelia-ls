import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
  type SourceSpanSite,
} from '../kernel/source-address.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  DiIssueKind,
  type DiIssue,
} from './di-issue.js';
import {
  DiIssuePublication,
  DiIssuePublisher,
  withDiIssueSourceAddressRecords,
} from './di-issue-publication.js';
import {
  DiResolveCallSite,
  readDiResolveCallSites,
} from './resolve-call-recognition.js';
import { DiProductDetails } from './product-details.js';

export class DiResolveCallIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes source-backed diagnostics for ambient `resolve(...)` calls that match exact kernel DI semantics. */
export class DiResolveCallIssueMaterializer {
  private readonly publisher: DiIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DiResolveCallIssueMaterialization {
    const publications = readDiResolveCallSites(project, typeSystem)
      .flatMap((site, index) => this.publicationsForResolveCall(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-resolve-call-issues'));
    }
    this.store.productDetails.addAll(DiProductDetails.Issue, publications.map((publication) => publication.issue));

    return new DiResolveCallIssueMaterialization(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationsForResolveCall(
    project: ProjectBootFrame,
    site: DiResolveCallSite,
    index: number,
  ): readonly DiIssuePublication[] {
    if (site.activeContainerExpectation === 'definitely-absent') {
      const local = resolveCallIssueLocalKey(project, site, index, DiIssueKind.NoActiveContainerForResolve, null);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishNoActiveContainerForResolve(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (site.activeContainerExpectation === 'provided-by-container-activation' && site.nullishKeyArguments.length > 0) {
      const firstNullish = site.nullishKeyArguments[0]!;
      const local = resolveCallIssueLocalKey(
        project,
        site,
        index,
        DiIssueKind.NullUndefinedKey,
        firstNullish.index,
      );
      const source = this.sourceAddress(local, {
        sourceFileAddressHandle: site.sourceFileAddressHandle,
        start: firstNullish.start,
        end: firstNullish.end,
      });
      const publication = this.publisher.publishNullUndefinedKeyForResolve(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    return [];
  }

  private sourceAddress(
    local: string,
    site: SourceSpanSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
  }
}

function resolveCallIssueLocalKey(
  project: ProjectBootFrame,
  site: DiResolveCallSite,
  index: number,
  issueKind: DiIssueKind,
  argumentIndex: number | null,
): string {
  return [
    'di-resolve-call-issue',
    issueKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
    argumentIndex ?? 'call',
  ].join(':');
}
