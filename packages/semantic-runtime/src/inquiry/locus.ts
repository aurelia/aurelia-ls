import type {
  AddressHandle,
  KernelRecordHandle,
} from '../kernel/handles.js';

export const enum InquiryLocusKind {
  /** The query is scoped to one active analysis workspace. */
  Workspace = 'workspace',
  /** The query is scoped to one project frame inside the workspace. */
  Project = 'project',
  /** The query is scoped to one source file. */
  SourceFile = 'source-file',
  /** The query starts from a zero-width source cursor. */
  SourceCursor = 'source-cursor',
  /** The query starts from a concrete source range or selection. */
  SourceRange = 'source-range',
  /** The query is scoped to one handle-bearing kernel record. */
  KernelRecord = 'kernel-record',
}

/** Zero-width source position, usually supplied by an IDE or tooling range selector. */
export class SourceTextCursor {
  constructor(
    /** Normalized workspace-relative, project-relative, or host-canonical source path. */
    readonly filePath: string,
    /** Zero-based source line. */
    readonly line: number,
    /** Zero-based source character. */
    readonly character: number,
    /** Optional zero-based source offset when the caller already has one. */
    readonly offset: number | null = null,
  ) {}
}

/** Half-open source range, usually representing an IDE selection or exact evidence span. */
export class SourceTextRange {
  constructor(
    /** Normalized workspace-relative, project-relative, or host-canonical source path. */
    readonly filePath: string,
    /** Zero-based start line. */
    readonly startLine: number,
    /** Zero-based start character. */
    readonly startCharacter: number,
    /** Zero-based end line. */
    readonly endLine: number,
    /** Zero-based end character. */
    readonly endCharacter: number,
    /** Optional zero-based start offset when the caller already has one. */
    readonly startOffset: number | null = null,
    /** Optional zero-based end offset when the caller already has one. */
    readonly endOffset: number | null = null,
  ) {}
}

/** Workspace-level inquiry locus. */
export class WorkspaceInquiryLocus {
  readonly kind = InquiryLocusKind.Workspace;
  readonly key: string;

  constructor(
    /** Store-local workspace key. */
    readonly workspaceKey: string,
  ) {
    this.key = workspaceKey;
  }
}

/** Project-level inquiry locus. */
export class ProjectInquiryLocus {
  readonly kind = InquiryLocusKind.Project;
  readonly key: string;

  constructor(
    /** Store-local project key. */
    readonly projectKey: string,
  ) {
    this.key = projectKey;
  }
}

/** Source-file inquiry locus before a cursor/range is selected. */
export class SourceFileInquiryLocus {
  readonly kind = InquiryLocusKind.SourceFile;
  readonly key: string;

  constructor(
    /** Normalized source path. */
    readonly filePath: string,
    /** Optional source-file address handle when already admitted into the kernel. */
    readonly addressHandle: AddressHandle | null = null,
  ) {
    this.key = filePath;
  }
}

/** Cursor inquiry locus for completions, hover, go-to-definition, and local narrowing. */
export class SourceCursorInquiryLocus {
  readonly kind = InquiryLocusKind.SourceCursor;
  readonly key: string;

  constructor(
    /** Concrete source cursor. */
    readonly cursor: SourceTextCursor,
    /** Optional source-file or source-span address handle when already resolved. */
    readonly addressHandle: AddressHandle | null = null,
  ) {
    this.key = `${cursor.filePath}:${cursor.line}:${cursor.character}`;
  }
}

/** Range inquiry locus for selection-based explanations, renames, and evidence expansion. */
export class SourceRangeInquiryLocus {
  readonly kind = InquiryLocusKind.SourceRange;
  readonly key: string;

  constructor(
    /** Concrete source range. */
    readonly range: SourceTextRange,
    /** Optional source-span address handle when already resolved. */
    readonly addressHandle: AddressHandle | null = null,
  ) {
    this.key = `${range.filePath}:${range.startLine}:${range.startCharacter}-${range.endLine}:${range.endCharacter}`;
  }
}

/** Kernel-record inquiry locus after selector resolution has reached a stored record. */
export class KernelRecordInquiryLocus {
  readonly kind = InquiryLocusKind.KernelRecord;
  readonly key: string;

  constructor(
    /** Kernel record handle that scopes or anchors the query. */
    readonly handle: KernelRecordHandle,
  ) {
    this.key = handle;
  }
}

/** Place from which an inquiry starts or to which an answer applies. */
export type InquiryLocus =
  | WorkspaceInquiryLocus
  | ProjectInquiryLocus
  | SourceFileInquiryLocus
  | SourceCursorInquiryLocus
  | SourceRangeInquiryLocus
  | KernelRecordInquiryLocus;
