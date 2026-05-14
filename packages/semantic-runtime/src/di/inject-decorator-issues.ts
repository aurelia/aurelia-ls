import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
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
    for (const publication of publications) {
      this.store.productDetails.add(
        DiProductDetails.Issue,
        publication.issue.productHandle,
        publication.issue,
      );
    }

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
  ): {
    readonly handle: AddressHandle | null;
    readonly records: readonly KernelStoreRecord[];
  } {
    const file = this.store.readBestSourceFileAddressForFileName(site.sourcePath);
    if (file == null) {
      return {
        handle: null,
        records: [],
      };
    }
    const handle = this.store.handles.address(`${local}:source`);
    return {
      handle,
      records: [
        new SourceSpanAddress(
          handle,
          file.handle,
          site.start,
          site.end,
          SourceSpanRole.Primary,
        ),
      ],
    };
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
