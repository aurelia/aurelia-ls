import type {
  CorpusSemanticIndex,
  DocumentExampleSet,
  DocsCorpus,
  EvidenceDisposition,
  SourceCompanionGroup
} from '../corpus/corpus-types.js';
import { buildCorpusSemanticIndex } from '../corpus/semantic-index.js';

type CandidateEvidenceItem = SourceCompanionGroup | DocumentExampleSet;

export interface CorpusCandidateReview {
  readonly bucketSummaries: readonly CorpusCandidateBucketSummary[];
}

export interface CorpusCandidateBucketSummary {
  readonly bucket: string;
  readonly itemCount: number;
  readonly sourceDocumentCount: number;
  readonly exampleSetCount: number;
  readonly dispositionCounts: Readonly<Partial<Record<EvidenceDisposition, number>>>;
  readonly topSignalNames: readonly string[];
  readonly topDocumentPaths: readonly string[];
  readonly cautionMessages: readonly string[];
}

interface CandidateBucketAccumulator {
  readonly bucket: string;
  readonly items: CandidateEvidenceItem[];
}

export function buildCorpusCandidateReview(corpus: DocsCorpus): CorpusCandidateReview {
  return buildCorpusCandidateReviewFromSemanticIndex(buildCorpusSemanticIndex(corpus));
}

export function buildCorpusCandidateReviewFromSemanticIndex(
  semanticIndex: CorpusSemanticIndex
): CorpusCandidateReview {
  const buckets = new Map<string, CandidateBucketAccumulator>();
  const items: CandidateEvidenceItem[] = [
    ...semanticIndex.sourceCompanionGroups,
    ...semanticIndex.exampleSets
  ];

  for (const item of items) {
    for (const bucket of bucketsForEvidenceItem(item)) {
      const accumulator = buckets.get(bucket) ?? { bucket, items: [] };
      accumulator.items.push(item);
      buckets.set(bucket, accumulator);
    }
  }

  return {
    bucketSummaries: Array.from(buckets.values())
      .map(summarizeBucket)
      .sort((left, right) => right.itemCount - left.itemCount || left.bucket.localeCompare(right.bucket))
  };
}

export function formatCorpusCandidateReview(review: CorpusCandidateReview): string {
  const lines: string[] = ['# Aurelia Patterns Corpus Candidate Review', ''];

  if (review.bucketSummaries.length === 0) {
    lines.push('No candidate buckets found.');
    return `${lines.join('\n')}\n`;
  }

  for (const bucket of review.bucketSummaries) {
    lines.push(`## ${bucket.bucket}`);
    lines.push('');
    lines.push(`- evidence items: ${bucket.itemCount}`);
    lines.push(`- source documents: ${bucket.sourceDocumentCount}`);
    lines.push(`- document example sets: ${bucket.exampleSetCount}`);
    lines.push(`- dispositions: ${formatCounts(bucket.dispositionCounts)}`);
    lines.push(`- top signals: ${bucket.topSignalNames.join(', ') || 'none'}`);
    lines.push(`- top documents: ${bucket.topDocumentPaths.join(', ') || 'none'}`);
    if (bucket.cautionMessages.length > 0) {
      lines.push('- cautions:');
      for (const caution of bucket.cautionMessages) {
        lines.push(`  - ${caution}`);
      }
    }
    lines.push('');
  }

  return `${lines.join('\n')}`;
}

function bucketsForEvidenceItem(item: CandidateEvidenceItem): readonly string[] {
  const signals = new Set(item.signalNames);
  const buckets: string[] = [];

  if (item.disposition === 'excluded' || signals.has('router-direct') || isRouterDirectDocument(item.documentPath)) {
    buckets.push('excluded.router-direct');
    return buckets;
  }

  if (signals.has('event-aggregator')) {
    buckets.push('capability.event-aggregator');
  }
  if (signals.has('callback-bindable') || signals.has('two-way-bindable') || signals.has('from-view-bindable')) {
    buckets.push('non-default.component-interface');
  }
  if (signals.has('validation-plugin')) {
    buckets.push('deferred.validation');
  }
  if (signals.has('state-plugin') || signals.has('store-plugin')) {
    buckets.push('deferred.state');
  }
  if (signals.has('i18n-plugin')) {
    buckets.push('deferred.i18n');
  }
  if (signals.has('router')) {
    buckets.push('deferred.router');
  }
  if (signals.has('router-events')) {
    buckets.push('candidate.shell-navigation-progress');
  }
  if (signals.has('route-lifecycle') || signals.has('can-load-hook') || signals.has('loading-hook')) {
    buckets.push('candidate.router-critical-loading');
  }
  if (signals.has('route-parameter-aggregation') || (signals.has('route-context') && signals.has('route-parameter'))) {
    buckets.push('candidate.router-route-parameters');
  }
  if (signals.has('route-link')) {
    buckets.push('candidate.router-navigation-links');
  }
  if (signals.has('navigation-model') || signals.has('active-class-binding') || signals.has('router-active-class')) {
    buckets.push('candidate.router-active-navigation');
  }
  if (signals.has('promise.bind')) {
    buckets.push('candidate.promise-secondary');
  }

  if (signals.has('repeat.for') && (signals.has('local-array') || signals.has('filter-or-sort'))) {
    buckets.push('candidate.local-collection');
  }
  if (signals.has('form-element') || signals.has('submit.trigger') || signals.has('checked.bind') || signals.has('select-element')) {
    buckets.push('candidate.form-native');
  }
  if (signals.has('bindable-component') || signals.has('bindable-property-binding')) {
    buckets.push('candidate.bindable-component');
  }
  if (signals.has('slot-content')) {
    buckets.push('candidate.slotted-layout');
  }
  if (signals.has('custom-event-dispatch') || signals.has('custom-event-listener')) {
    buckets.push('candidate.custom-event');
  }
  if (signals.has('dependency-injection') || signals.has('resolve-service') || signals.has('service-class') || signals.has('shared-state-service')) {
    buckets.push('candidate.di-service');
  }
  if (signals.has('http-client') || signals.has('http-request')) {
    buckets.push('candidate.fetch-client');
  }
  if (signals.has('class-style-binding')) {
    buckets.push('candidate.class-style');
  }
  if (signals.has('value-converter') || signals.has('value-converter-class')) {
    buckets.push('candidate.value-converter');
  }
  if (signals.has('binding-behavior')) {
    buckets.push('candidate.binding-behavior');
  }
  if (signals.has('focus-binding')) {
    buckets.push('candidate.focus-control');
  }
  if (signals.has('template-ref')) {
    buckets.push('candidate.template-ref');
  }
  if (signals.has('debounce-behavior')) {
    buckets.push('candidate.debounced-input');
  }
  if (signals.has('if.bind') || signals.has('show.bind') || signals.has('switch.bind')) {
    buckets.push('candidate.conditional-rendering');
  }
  if (signals.has('lifecycle-cleanup') || signals.has('global-listener')) {
    buckets.push('candidate.lifecycle-cleanup');
  }
  if (signals.has('custom-attribute')) {
    buckets.push('candidate.custom-attribute');
  }

  return unique(buckets);
}

function summarizeBucket(accumulator: CandidateBucketAccumulator): CorpusCandidateBucketSummary {
  const sourceDocuments = unique(accumulator.items.map((item) => item.documentPath));
  const exampleSetCount = accumulator.items.filter(isDocumentExampleSet).length;
  const cautionMessages = bucketCautionMessages(accumulator.bucket, accumulator.items);

  return {
    bucket: accumulator.bucket,
    itemCount: accumulator.items.length,
    sourceDocumentCount: sourceDocuments.length,
    exampleSetCount,
    dispositionCounts: countDispositions(accumulator.items),
    topSignalNames: topValues(accumulator.items.flatMap((item) => item.signalNames), 12),
    topDocumentPaths: topValues(accumulator.items.map((item) => item.documentPath), 8),
    cautionMessages
  };
}

function bucketCautionMessages(bucket: string, items: readonly CandidateEvidenceItem[]): readonly string[] {
  const messages: string[] = [];
  const excludedCount = items.filter((item) => item.disposition === 'excluded').length;
  const capabilityCount = items.filter((item) => item.disposition === 'capability-reference').length;
  const nonDefaultCount = items.filter((item) => item.disposition === 'non-default').length;
  const cautionCount = items.filter((item) => item.disposition === 'caution').length;

  if (excludedCount > 0) {
    messages.push(`${excludedCount} excluded evidence item(s); keep this bucket out of public admission.`);
  }
  if (bucket.startsWith('capability.') || capabilityCount > 0) {
    messages.push(`${capabilityCount} capability-reference item(s); docs support does not imply public default.`);
  }
  if (bucket.startsWith('non-default.') || nonDefaultCount > 0) {
    messages.push(`${nonDefaultCount} non-default item(s); require a deliberate handoff or separate admitted pattern.`);
  }
  if (cautionCount > 0) {
    messages.push(`${cautionCount} caution/reference item(s); inspect context before using as pattern source.`);
  }

  return messages;
}

function countDispositions(
  items: readonly CandidateEvidenceItem[]
): Readonly<Partial<Record<EvidenceDisposition, number>>> {
  const counts = new Map<EvidenceDisposition, number>();
  for (const item of items) {
    counts.set(item.disposition, (counts.get(item.disposition) ?? 0) + 1);
  }
  return Object.fromEntries(Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right))) as Partial<Record<EvidenceDisposition, number>>;
}

function topValues(values: readonly string[], limit: number): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => rightCount - leftCount || leftValue.localeCompare(rightValue))
    .slice(0, limit)
    .map(([value]) => value);
}

function formatCounts(counts: Readonly<Record<string, number | undefined>>): string {
  const entries = Object.entries(counts).filter(([, count]) => count !== undefined && count > 0);
  if (entries.length === 0) {
    return 'none';
  }
  return entries.map(([key, count]) => `${key}=${count}`).join(', ');
}

function isDocumentExampleSet(item: CandidateEvidenceItem): item is DocumentExampleSet {
  return 'exampleSetId' in item;
}

function isRouterDirectDocument(documentPath: string): boolean {
  return /(?:^|\/)router-direct(?:\/|\.md$)/.test(documentPath);
}

function unique<T extends string>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values)).sort();
}
