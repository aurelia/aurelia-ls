import {
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
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
  publishDiIssuePublications,
} from './di-issue-publication.js';
import {
  DiInjectDecoratorSite,
  readInvalidDiInjectDecoratorSites,
} from './inject-decorator-recognition.js';

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
    readonly publication: KernelPublicationContext,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DiInjectDecoratorIssueMaterialization {
    const publications = readInvalidDiInjectDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const emission = publishDiIssuePublications(this.publication, 'di-inject-decorator-issues', publications);

    return new DiInjectDecoratorIssueMaterialization(
      emission.issues,
      emission.records,
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
