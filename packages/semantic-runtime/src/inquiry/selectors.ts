import type { KernelRecordHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  InquiryAnswer,
  InquiryContinuation,
  InquiryContinuationKind,
  InquiryOutcomeKind,
} from './answer.js';
import { KernelExactBasis } from './basis.js';
import {
  KernelRecordInquiryLocus,
  ProjectInquiryLocus,
  SourceCursorInquiryLocus,
  SourceFileInquiryLocus,
  SourceRangeInquiryLocus,
  SourceTextCursor,
  SourceTextRange,
  WorkspaceInquiryLocus,
  type InquiryLocus,
} from './locus.js';
import {
  isSourceFileAddress,
  sourceFilePathMatches,
} from './source-file-addresses.js';

export const enum InquirySelectorKind {
  Workspace = 'workspace',
  Project = 'project',
  SourceFile = 'source-file',
  SourceCursor = 'source-cursor',
  SourceRange = 'source-range',
  KernelRecord = 'kernel-record',
}

export type InquirySelector =
  | WorkspaceSelector
  | ProjectSelector
  | SourceFileSelector
  | SourceCursorSelector
  | SourceRangeSelector
  | KernelRecordSelector;

export class WorkspaceSelector {
  readonly kind = InquirySelectorKind.Workspace;
  constructor(readonly workspaceKey: string) {}
}

export class ProjectSelector {
  readonly kind = InquirySelectorKind.Project;
  constructor(readonly projectKey: string) {}
}

export class SourceFileSelector {
  readonly kind = InquirySelectorKind.SourceFile;
  constructor(readonly filePath: string) {}
}

export class SourceCursorSelector {
  readonly kind = InquirySelectorKind.SourceCursor;
  constructor(readonly cursor: SourceTextCursor) {}
}

export class SourceRangeSelector {
  readonly kind = InquirySelectorKind.SourceRange;
  constructor(readonly range: SourceTextRange) {}
}

export class KernelRecordSelector {
  readonly kind = InquirySelectorKind.KernelRecord;
  constructor(readonly handle: KernelRecordHandle) {}
}

/** Resolve a host/query selector into the narrowest kernel-aware inquiry locus currently available. */
export function resolveInquirySelector(
  store: KernelStore,
  selector: InquirySelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  switch (selector.kind) {
    case InquirySelectorKind.Workspace:
      return hit(new WorkspaceInquiryLocus(selector.workspaceKey), selector);
    case InquirySelectorKind.Project:
      return hit(new ProjectInquiryLocus(selector.projectKey), selector);
    case InquirySelectorKind.KernelRecord: {
      const record = store.read(selector.handle);
      if (record == null) {
        return miss(
          new KernelRecordInquiryLocus(selector.handle),
          selector,
          'No kernel record exists for the selected handle.',
        );
      }
      return hit(new KernelRecordInquiryLocus(selector.handle), selector);
    }
    case InquirySelectorKind.SourceFile:
      return resolveSourceFileSelector(store, selector);
    case InquirySelectorKind.SourceCursor:
      return resolveSourceCursorSelector(store, selector);
    case InquirySelectorKind.SourceRange:
      return resolveSourceRangeSelector(store, selector);
  }
}

function resolveSourceFileSelector(
  store: KernelStore,
  selector: SourceFileSelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  const matches = store.readAddresses()
    .filter(isSourceFileAddress)
    .filter((address) => sourceFilePathMatches(address, selector.filePath));

  if (matches.length === 0) {
    return miss(
      new SourceFileInquiryLocus(selector.filePath),
      selector,
      'No admitted source file matched the selected path.',
    );
  }
  if (matches.length > 1) {
    const continuations = matches.map((match) =>
      new InquiryContinuation(
        InquiryContinuationKind.SelectSourceFile,
        `Narrow to admitted source file ${match.path}.`,
        new SourceFileSelector(match.path),
      )
    );
    return new InquiryAnswer(
      InquiryOutcomeKind.Ambiguous,
      new SourceFileInquiryLocus(selector.filePath),
      `Multiple admitted source files matched ${selector.filePath}.`,
      KernelExactBasis,
      new SourceFileInquiryLocus(selector.filePath),
      [],
      [],
      [],
      [],
      continuations,
      null,
      null,
    );
  }

  const match = matches[0];
  if (match === undefined) {
    return miss(
      new SourceFileInquiryLocus(selector.filePath),
      selector,
      'No admitted source file matched the selected path.',
    );
  }
  return hit(new SourceFileInquiryLocus(match.path, match.handle), selector);
}

function resolveSourceCursorSelector(
  store: KernelStore,
  selector: SourceCursorSelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  const fileAnswer = resolveSourceFileSelector(store, new SourceFileSelector(selector.cursor.filePath));
  if (fileAnswer.outcome !== InquiryOutcomeKind.Hit || fileAnswer.value.kind !== 'source-file') {
    return new InquiryAnswer(
      fileAnswer.outcome,
      new SourceCursorInquiryLocus(selector.cursor),
      fileAnswer.summary,
      fileAnswer.basis,
      new SourceCursorInquiryLocus(selector.cursor),
      fileAnswer.evidenceHandles,
      fileAnswer.provenanceHandles,
      fileAnswer.claimHandles,
      fileAnswer.openSeamHandles,
      fileAnswer.continuations,
      null,
      null,
    );
  }
  return hit(
    new SourceCursorInquiryLocus(selector.cursor, fileAnswer.value.addressHandle),
    selector,
  );
}

function resolveSourceRangeSelector(
  store: KernelStore,
  selector: SourceRangeSelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  const fileAnswer = resolveSourceFileSelector(store, new SourceFileSelector(selector.range.filePath));
  if (fileAnswer.outcome !== InquiryOutcomeKind.Hit || fileAnswer.value.kind !== 'source-file') {
    return new InquiryAnswer(
      fileAnswer.outcome,
      new SourceRangeInquiryLocus(selector.range),
      fileAnswer.summary,
      fileAnswer.basis,
      new SourceRangeInquiryLocus(selector.range),
      fileAnswer.evidenceHandles,
      fileAnswer.provenanceHandles,
      fileAnswer.claimHandles,
      fileAnswer.openSeamHandles,
      fileAnswer.continuations,
      null,
      null,
    );
  }
  return hit(
    new SourceRangeInquiryLocus(selector.range, fileAnswer.value.addressHandle),
    selector,
  );
}

function hit(
  locus: InquiryLocus,
  selector: InquirySelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  return new InquiryAnswer(
    InquiryOutcomeKind.Hit,
    locus,
    'Resolved inquiry selector to a locus.',
    KernelExactBasis,
    locus,
    [],
    [],
    [],
    [],
    [],
    null,
    null,
  );
}

function miss(
  locus: InquiryLocus,
  selector: InquirySelector,
  summary: string,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  return new InquiryAnswer(
    InquiryOutcomeKind.Miss,
    locus,
    summary,
    KernelExactBasis,
    locus,
    [],
    [],
    [],
    [],
    [
      new InquiryContinuation(
        InquiryContinuationKind.ListAdmittedSources,
        'Inspect admitted source files before selecting a source locus.',
        selector,
      ),
    ],
    null,
    null,
  );
}
