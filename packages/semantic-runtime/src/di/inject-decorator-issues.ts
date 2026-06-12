import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
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
} from './di-issue-publication.js';
import {
  DiInjectDecoratorSite,
  readInvalidDiInjectDecoratorSites,
} from './inject-decorator-recognition.js';
import { DiProductDetails } from './product-details.js';

export class DiInjectDecoratorIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes source-backed diagnostics for @inject-family decorators on kernel-unsupported target kinds. */
export class DiInjectDecoratorIssueMaterializer {
  private readonly publisher: DiIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DiInjectDecoratorIssueMaterialization {
    const publications = readInvalidDiInjectDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-inject-decorator-issues'));
    }
    this.store.productDetails.addAll(DiProductDetails.Issue, publications.map((publication) => publication.issue));

    return new DiInjectDecoratorIssueMaterialization(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: DiInjectDecoratorSite,
    index: number,
  ): DiIssuePublication {
    const local = injectDecoratorIssueLocalKey(project, site, index);
    const source = this.sourceAddress(local, site);
    const publication = this.publisher.publishInvalidInjectDecoratorUsage(local, site, source.handle);
    return new DiIssuePublication(publication.issue, [
      ...source.records,
      ...publication.records,
    ]);
  }

  private sourceAddress(
    local: string,
    site: DiInjectDecoratorSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
  }
}

function injectDecoratorIssueLocalKey(
  project: ProjectBootFrame,
  site: DiInjectDecoratorSite,
  index: number,
): string {
  return [
    'di-inject-decorator-issue',
    DiIssueKind.InvalidInjectDecoratorUsage,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
