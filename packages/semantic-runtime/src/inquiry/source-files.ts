import {
  SourceFileRole,
  SourceLanguage,
  type SourceFileAddress,
} from '../kernel/address.js';
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
import { uniqueValues } from '../collections.js';
import { isSourceFileAddress } from '../kernel/source-address.js';

export class AdmittedSourcesQuery {
  readonly kind = 'admitted-sources' as const;

  constructor(
    /** Project/workspace key to filter by; null means all admitted source files. */
    readonly projectKey: string | null = null,
    /** Optional language filter. */
    readonly language: SourceLanguage | null = null,
    /** Page request for ordered source rows. */
    readonly page: InquiryPageRequest = new InquiryPageRequest(),
    /** Optional source-role filter. */
    readonly role: SourceFileRole | null = null,
  ) {}

  withPage(page: InquiryPageRequest): AdmittedSourcesQuery {
    return new AdmittedSourcesQuery(this.projectKey, this.language, page, this.role);
  }
}

export interface AdmittedSourceRow {
  readonly projectKey: string;
  readonly path: string;
  readonly language: SourceLanguage;
  readonly role: SourceFileRole;
  readonly addressHandle: AddressHandle;
  readonly evidenceHandles: readonly EvidenceHandle[];
  readonly provenanceHandles: readonly ProvenanceHandle[];
}

export interface AdmittedSourcesResult {
  readonly sources: readonly AdmittedSourceRow[];
}

interface AdmittedSourcesPage {
  readonly size: number;
  readonly rows: readonly SourceFileAddress[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
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
  const matched = matchedAdmittedSourceAddresses(store, query);
  const page = admittedSourcesPage(matched, query.page);
  const sources = page.rows.map((address) => admittedSourceRow(store, address));
  const result: AdmittedSourcesResult = { sources };
  const locus = admittedSourcesLocus(query);

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

  const evidenceHandles = uniqueValues(sources.flatMap((source) => source.evidenceHandles));
  const provenanceHandles = uniqueValues(sources.flatMap((source) => source.provenanceHandles));
  const continuations = admittedSourcesContinuations(query, page);

  return new InquiryAnswer(
    page.hasMore ? InquiryOutcomeKind.Partial : InquiryOutcomeKind.Hit,
    locus,
    page.hasMore
      ? `Returned ${sources.length} of ${matched.length} admitted source files.`
      : `Returned ${sources.length} admitted source file(s).`,
    KernelExactBasis,
    result,
    evidenceHandles,
    provenanceHandles,
    [],
    [],
    continuations,
    new InquiryPageInfo(
      page.size,
      query.page.cursor,
      page.nextCursor,
      sources.length,
      matched.length,
    ),
    null,
  );
}

function matchedAdmittedSourceAddresses(
  store: KernelStore,
  query: AdmittedSourcesQuery,
): readonly SourceFileAddress[] {
  return store.readAddresses()
    .filter(isSourceFileAddress)
    .filter((address) => query.projectKey == null || address.workspaceKey === query.projectKey)
    .filter((address) => query.language == null || address.language === query.language)
    .filter((address) => query.role == null || address.role === query.role)
    .sort((left, right) => left.path.localeCompare(right.path));
}

function admittedSourcesPage(
  matched: readonly SourceFileAddress[],
  request: InquiryPageRequest,
): AdmittedSourcesPage {
  const size = Math.max(0, request.size);
  const rows = pageAfterCursor(matched, request.cursor).slice(0, size);
  const nextCursor = rows.at(-1)?.path ?? null;
  return {
    size,
    rows,
    nextCursor: rows.length > 0 && pageAfterCursor(matched, nextCursor).length > 0
      ? nextCursor
      : null,
    hasMore: rows.length > 0 && pageAfterCursor(matched, nextCursor).length > 0,
  };
}

function admittedSourceRow(
  store: KernelStore,
  address: SourceFileAddress,
): AdmittedSourceRow {
  const evidenceHandles = store.readEvidenceForAddress(address.handle);
  return {
    projectKey: address.workspaceKey,
    path: address.path,
    language: address.language,
    role: address.role,
    addressHandle: address.handle,
    evidenceHandles,
    provenanceHandles: uniqueValues(evidenceHandles.flatMap((handle) =>
      store.readProvenanceForEvidence(handle)
    )),
  };
}

function admittedSourcesLocus(
  query: AdmittedSourcesQuery,
): WorkspaceInquiryLocus | ProjectInquiryLocus {
  return query.projectKey == null
    ? new WorkspaceInquiryLocus('(all-projects)')
    : new ProjectInquiryLocus(query.projectKey);
}

function admittedSourcesContinuations(
  query: AdmittedSourcesQuery,
  page: AdmittedSourcesPage,
): readonly InquiryContinuation<AdmittedSourcesQuery>[] {
  return page.nextCursor == null
    ? []
    : [
      new InquiryContinuation(
        InquiryContinuationKind.NextPage,
        'Continue with the next page of admitted source files.',
        query.withPage(new InquiryPageRequest(page.size, page.nextCursor)),
      ),
    ];
}
