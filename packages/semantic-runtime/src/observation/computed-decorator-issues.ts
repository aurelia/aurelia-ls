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
  ComputedDecoratorSite,
  readInvalidComputedDecoratorSites,
} from './computed-decorator-recognition.js';
import {
  ObservationSourceIssueProjectResult,
} from './observation-source-issues.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';

/** Materializes source-backed diagnostics for @computed(...) decorators on non-getter/non-method targets. */
export class ComputedDecoratorIssueMaterializer {
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
    const publications = readInvalidComputedDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'computed-decorator-issues'));
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
    site: ComputedDecoratorSite,
    index: number,
  ): ObservationIssuePublication {
    const local = computedDecoratorIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      local,
      project.projectKey,
      ObservationIssuePhase.ComputedDecorator,
      ObservationIssueKind.InvalidComputedDecoratorUsage,
      computedDecoratorIssueMessage(site),
      RuntimeObservationFrameworkErrorCode.ComputedNotGetter,
      source.handle,
    );
    return new ObservationIssuePublication(publication.issue, [
      ...source.records,
      ...publication.records,
    ]);
  }
}

function computedDecoratorIssueMessage(
  site: ComputedDecoratorSite,
): string {
  const target = site.targetName == null
    ? site.targetKind
    : `${site.targetKind} "${site.targetName}"`;
  return `Aurelia @${site.decoratorName}(...) can only be applied to getters or methods; found ${target}.`;
}

function computedDecoratorIssueLocalKey(
  project: ProjectBootFrame,
  site: ComputedDecoratorSite,
  index: number,
): string {
  return [
    'computed-decorator-issue',
    ObservationIssueKind.InvalidComputedDecoratorUsage,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
