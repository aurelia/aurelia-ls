import type { ProjectBootFrame } from '../boot/frames.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { StateRawErrorAuthority } from './framework-raw-error-authority.js';
import { StateProductDetails } from './product-details.js';
import {
  FromStateDecoratorSite,
  readInvalidFromStateDecoratorSites,
} from './from-state-decorator-recognition.js';
import {
  StateIssueKind,
  StateIssuePhase,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';
import { StateSourceIssueProjectResult } from './state-source-issues.js';

/** Materializes source-backed diagnostics for @fromState(...) decorators on non-field/non-setter targets. */
export class FromStateDecoratorIssueMaterializer {
  private readonly publisher: StateIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new StateIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): StateSourceIssueProjectResult {
    const publications = readInvalidFromStateDecoratorSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `from-state-decorator-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(StateProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new StateSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: FromStateDecoratorSite,
    index: number,
  ): StateIssuePublication {
    const local = fromStateDecoratorIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      project.projectKey,
      null,
      StateIssuePhase.FromStateDecorator,
      StateIssueKind.InvalidFromStateDecoratorUsage,
      fromStateDecoratorIssueMessage(site),
      StateRawErrorAuthority.InvalidFromStateDecoratorUsage,
      source.handle,
      null,
    );
    return issuePublicationWithRecords(publication, source.records);
  }
}

function fromStateDecoratorIssueMessage(
  site: FromStateDecoratorSite,
): string {
  const target = site.targetName == null
    ? site.targetKind
    : `${site.targetKind} "${site.targetName}"`;
  return `Aurelia @${site.decoratorName}(...) can only be applied to fields or setters; found ${target}.`;
}

function fromStateDecoratorIssueLocalKey(
  project: ProjectBootFrame,
  site: FromStateDecoratorSite,
  index: number,
): string {
  return [
    'from-state-decorator-issue',
    StateIssueKind.InvalidFromStateDecoratorUsage,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
