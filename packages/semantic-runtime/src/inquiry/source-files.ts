import { SourceLanguage, type SourceFileAddress } from '../kernel/address.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  InquiryAnswer,
  InquiryContinuation,
  InquiryContinuationKind,
  InquiryOutcomeKind,
} from './answer.js';
import { KernelExactBasis } from './basis.js';
import {
  ProjectInquiryLocus,
  WorkspaceInquiryLocus,
} from './locus.js';
import {
  InquiryPageInfo,
  InquiryPageRequest,
} from './page.js';

export class AdmittedSourcesQuery {
  readonly kind = 'admitted-sources' as const;

  constructor(
    /** Project/workspace key to filter by; null means all admitted source files. */
    readonly projectKey: string | null = null,
    /** Optional language filter. */
    readonly language: SourceLanguage | null = null,
    /** Page request for ordered source rows. */
    readonly page: InquiryPageRequest = new InquiryPageRequest(),
  ) {}
}

export interface AdmittedSourceRow {
  readonly projectKey: string;
  readonly path: string;
  readonly language: SourceLanguage;
  readonly addressHandle: AddressHandle;
  readonly evidenceHandles: readonly EvidenceHandle[];
  readonly provenanceHandles: readonly ProvenanceHandle[];
}

export interface AdmittedSourcesResult {
  readonly sources: readonly AdmittedSourceRow[];
}

function unique<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}

function isSourceFileAddress(address: { readonly kind: string }): address is SourceFileAddress {
  return address.kind === 'source-file-address';
}

function pageAfterCursor(
  rows: readonly SourceFileAddress[],
  cursor: string | null,
): readonly SourceFileAddress[] {
  if (cursor == null) {
    return rows;
  }
  const start = rows.findIndex((row) => row.path === cursor);
  return start < 0 ? [] : rows.slice(start + 1);
}

/** Answer which source files have been admitted into the active analysis world. */
export function answerAdmittedSources(
  store: KernelStore,
  query: AdmittedSourcesQuery = new AdmittedSourcesQuery(),
): InquiryAnswer<AdmittedSourcesResult, AdmittedSourcesQuery> {
  const matched = store.readAddresses()
    .filter(isSourceFileAddress)
    .filter((address) => query.projectKey == null || address.workspaceKey === query.projectKey)
    .filter((address) => query.language == null || address.language === query.language)
    .sort((left, right) => left.path.localeCompare(right.path));

  const pageSize = Math.max(0, query.page.size);
  const pageRows = pageAfterCursor(matched, query.page.cursor).slice(0, pageSize);
  const sources = pageRows.map((address): AdmittedSourceRow => {
    const evidenceHandles = store.readEvidenceForAddress(address.handle);
    const provenanceHandles = unique(evidenceHandles.flatMap((handle) =>
      store.readProvenanceForEvidence(handle)
    ));
    return {
      projectKey: address.workspaceKey,
      path: address.path,
      language: address.language,
      addressHandle: address.handle,
      evidenceHandles,
      provenanceHandles,
    };
  });
  const hasMore = pageRows.length > 0 && pageAfterCursor(matched, pageRows.at(-1)?.path ?? null).length > 0;
  const result: AdmittedSourcesResult = {
    sources,
  };
  const locus = query.projectKey == null
    ? new WorkspaceInquiryLocus('(all-projects)')
    : new ProjectInquiryLocus(query.projectKey);

  if (matched.length === 0) {
    return new InquiryAnswer(
      InquiryOutcomeKind.Miss,
      locus,
      'No admitted source files matched the selected locus.',
      KernelExactBasis,
      result,
      [],
      [],
      [],
      [],
      [],
      null,
      null,
    );
  }

  const nextCursor = hasMore ? pageRows.at(-1)?.path ?? null : null;
  const page = new InquiryPageInfo(
    pageSize,
    query.page.cursor,
    nextCursor,
    sources.length,
    matched.length,
  );
  const evidenceHandles = unique(sources.flatMap((source) => source.evidenceHandles));
  const provenanceHandles = unique(sources.flatMap((source) => source.provenanceHandles));
  const continuations = hasMore && nextCursor != null
    ? [
      new InquiryContinuation(
        InquiryContinuationKind.NextPage,
        'Continue with the next page of admitted source files.',
        new AdmittedSourcesQuery(query.projectKey, query.language, new InquiryPageRequest(pageSize, nextCursor)),
      ),
    ]
    : [];

  return new InquiryAnswer(
    hasMore ? InquiryOutcomeKind.Partial : InquiryOutcomeKind.Hit,
    locus,
    hasMore
      ? `Returned ${sources.length} of ${matched.length} admitted source files.`
      : `Returned ${sources.length} admitted source file(s).`,
    KernelExactBasis,
    result,
    evidenceHandles,
    provenanceHandles,
    [],
    [],
    continuations,
    page,
    null,
  );
}
