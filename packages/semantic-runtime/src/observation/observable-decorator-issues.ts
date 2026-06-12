import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  RuntimeObservationFrameworkErrorCode,
} from './framework-error-code.js';
import {
  ObservationIssueKind,
  ObservationIssuePhase,
} from './observation-issue.js';
import {
  ObservationIssuePublication,
  ObservationIssuePublisher,
} from './observation-issue-publication.js';
import {
  ObservationProductDetails,
} from './product-details.js';
import {
  ObservationSourceIssueProjectResult,
} from './observation-source-issues.js';
import {
  ObservableDecoratorSite,
  readInvalidObservableDecoratorSites,
} from './observable-decorator-recognition.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';

/** Materializes source-backed diagnostics for @observable decorators on runtime-unsupported target kinds. */
export class ObservableDecoratorIssueMaterializer {
  private readonly publisher: ObservationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new ObservationIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): ObservationSourceIssueProjectResult {
    const publications = readInvalidObservableDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'observable-decorator-issues'));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.Issue,
        publication.issue.productHandle,
        publication.issue,
      );
    }

    return new ObservationSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: ObservableDecoratorSite,
    index: number,
  ): ObservationIssuePublication {
    const local = observableDecoratorIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      local,
      project.projectKey,
      ObservationIssuePhase.ObservableDecorator,
      ObservationIssueKind.InvalidObservableDecoratorUsage,
      observableDecoratorIssueMessage(site),
      RuntimeObservationFrameworkErrorCode.InvalidObservableDecoratorUsage,
      source.handle,
    );
    return new ObservationIssuePublication(publication.issue, [
      ...source.records,
      ...publication.records,
    ]);
  }
}

function observableDecoratorIssueMessage(
  site: ObservableDecoratorSite,
): string {
  const target = site.targetName == null
    ? site.targetKind
    : `${site.targetKind} "${site.targetName}"`;
  return `Aurelia @${site.decoratorName}${site.invalidForm === 'empty-call' ? '()' : '({...})'} is not supported on ${target}.`;
}

function observableDecoratorIssueLocalKey(
  project: ProjectBootFrame,
  site: ObservableDecoratorSite,
  index: number,
): string {
  return [
    'observable-decorator-issue',
    ObservationIssueKind.InvalidObservableDecoratorUsage,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
