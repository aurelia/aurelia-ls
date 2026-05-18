import type { ProjectBootFrame } from '../boot/frames.js';
import {
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticSourceFileRow,
  type SemanticSourceFilesResult,
} from './contracts.js';
import {
  answer,
  includeHandles,
  pageRows,
} from './answer-helpers.js';

/** Read admitted source files from the booted project frame without opening an app-world epoch. */
export function readSemanticSourceFiles(
  project: ProjectBootFrame,
  page?: SemanticRuntimePageInput,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
): SemanticRuntimeAnswer<SemanticSourceFilesResult> {
  const handles = includeHandles(detail);
  const rows = project.sourceFiles
    .map((source): SemanticSourceFileRow => ({
      projectKey: source.projectKey,
      path: source.path,
      language: source.language,
      role: source.role,
      ...(handles ? { handles: { addressHandle: source.addressHandle } } : {}),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const paged = pageRows(rows, page);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read ${paged.rows.length} of ${rows.length} admitted source file(s) for '${project.projectKey}'.`,
    {
      rows: paged.rows,
      totalRows: rows.length,
    },
    paged.page,
  );
}
