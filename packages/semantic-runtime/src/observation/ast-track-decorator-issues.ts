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
  AstTrackDecoratorSite,
  readInvalidAstTrackDecoratorSites,
} from './ast-track-decorator-recognition.js';
import {
  ObservationSourceIssueProjectResult,
} from './observation-source-issues.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';

/** Materializes source-backed diagnostics for @astTrack decorators on non-method targets. */
export class AstTrackDecoratorIssueMaterializer {
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
    const publications = readInvalidAstTrackDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'ast-track-decorator-issues'));
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
    site: AstTrackDecoratorSite,
    index: number,
  ): ObservationIssuePublication {
    const local = astTrackDecoratorIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      local,
      project.projectKey,
      ObservationIssuePhase.AstTrackDecorator,
      ObservationIssueKind.InvalidAstTrackDecoratorUsage,
      astTrackDecoratorIssueMessage(site),
      RuntimeObservationFrameworkErrorCode.InvalidAstTrackDecoratorUsage,
      source.handle,
    );
    return new ObservationIssuePublication(publication.issue, [
      ...source.records,
      ...publication.records,
    ]);
  }
}

function astTrackDecoratorIssueMessage(
  site: AstTrackDecoratorSite,
): string {
  const target = site.targetName == null
    ? site.targetKind
    : `${site.targetKind} "${site.targetName}"`;
  return `Aurelia @${site.decoratorName} can only be applied to methods; found ${target}.`;
}

function astTrackDecoratorIssueLocalKey(
  project: ProjectBootFrame,
  site: AstTrackDecoratorSite,
  index: number,
): string {
  return [
    'ast-track-decorator-issue',
    ObservationIssueKind.InvalidAstTrackDecoratorUsage,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
