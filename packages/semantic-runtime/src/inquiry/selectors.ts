import type { KernelRecordHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  InquiryAnswer,
  InquiryAnswerCoverage,
  InquiryAnswerResult,
  InquiryAnswerSelection,
  InquiryContinuation,
  InquiryContinuationKind,
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
  SOURCE_INVENTORY_CONTINUATION,
  SOURCE_SELECTION_CONTINUATION,
} from './continuation-intent.js';
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
  const resolution = store.resolveSourceFileAddressByFileName(selector.filePath);

  if (resolution.kind === 'absent') {
    return miss(
      new SourceFileInquiryLocus(selector.filePath),
      selector,
      'No admitted source file matched the selected path.',
    );
  }
  if (resolution.kind === 'ambiguous') {
    const continuations = resolution.candidates.map((match) =>
      new InquiryContinuation(
        InquiryContinuationKind.SelectSourceFile,
        `Narrow to admitted source file ${match.path}.`,
        new SourceFileSelector(match.path),
        SOURCE_SELECTION_CONTINUATION,
      )
    );
    return new InquiryAnswer({
      result: InquiryAnswerResult.Answered,
      selection: InquiryAnswerSelection.Ambiguous,
      coverage: InquiryAnswerCoverage.Complete,
      locus: new SourceFileInquiryLocus(selector.filePath),
      summary: `Multiple admitted source files matched ${selector.filePath}.`,
      basis: KernelExactBasis,
      value: new SourceFileInquiryLocus(selector.filePath),
      continuations,
    });
  }

  return hit(new SourceFileInquiryLocus(resolution.source.path, resolution.source.handle), selector);
}

function resolveSourceCursorSelector(
  store: KernelStore,
  selector: SourceCursorSelector,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  const fileAnswer = resolveSourceFileSelector(store, new SourceFileSelector(selector.cursor.filePath));
  if (fileAnswer.selection !== InquiryAnswerSelection.Exact || fileAnswer.value.kind !== 'source-file') {
    return new InquiryAnswer({
      result: fileAnswer.result,
      selection: fileAnswer.selection,
      coverage: fileAnswer.coverage,
      locus: new SourceCursorInquiryLocus(selector.cursor),
      summary: fileAnswer.summary,
      basis: fileAnswer.basis,
      value: new SourceCursorInquiryLocus(selector.cursor),
      evidenceHandles: fileAnswer.evidenceHandles,
      provenanceHandles: fileAnswer.provenanceHandles,
      claimHandles: fileAnswer.claimHandles,
      openSeamHandles: fileAnswer.openSeamHandles,
      continuations: fileAnswer.continuations,
    });
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
  if (fileAnswer.selection !== InquiryAnswerSelection.Exact || fileAnswer.value.kind !== 'source-file') {
    return new InquiryAnswer({
      result: fileAnswer.result,
      selection: fileAnswer.selection,
      coverage: fileAnswer.coverage,
      locus: new SourceRangeInquiryLocus(selector.range),
      summary: fileAnswer.summary,
      basis: fileAnswer.basis,
      value: new SourceRangeInquiryLocus(selector.range),
      evidenceHandles: fileAnswer.evidenceHandles,
      provenanceHandles: fileAnswer.provenanceHandles,
      claimHandles: fileAnswer.claimHandles,
      openSeamHandles: fileAnswer.openSeamHandles,
      continuations: fileAnswer.continuations,
    });
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
  return new InquiryAnswer({
    result: InquiryAnswerResult.Answered,
    selection: InquiryAnswerSelection.Exact,
    coverage: InquiryAnswerCoverage.Complete,
    locus,
    summary: 'Resolved inquiry selector to a locus.',
    basis: KernelExactBasis,
    value: locus,
  });
}

function miss(
  locus: InquiryLocus,
  selector: InquirySelector,
  summary: string,
): InquiryAnswer<InquiryLocus, InquirySelector> {
  return new InquiryAnswer({
    result: InquiryAnswerResult.Answered,
    selection: InquiryAnswerSelection.Absent,
    coverage: InquiryAnswerCoverage.Complete,
    locus,
    summary,
    basis: KernelExactBasis,
    value: locus,
    continuations: [
      new InquiryContinuation(
        InquiryContinuationKind.ListAdmittedSources,
        'Inspect admitted source files before selecting a source locus.',
        selector,
        SOURCE_INVENTORY_CONTINUATION,
      ),
    ],
  });
}
