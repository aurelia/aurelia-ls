import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  SemanticRuntimeAnswerResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticUnresolvedModuleRow,
  type SemanticUnresolvedModulesResult,
} from './contracts.js';
import {
  answer,
  COMPLETE_COLLECTION_ANSWER_OPTIONS,
  pageRows,
} from './answer-helpers.js';
import {
  sourceReferenceForTsNode,
} from './source-reference.js';

export function readSemanticUnresolvedModules(
  evaluation: StaticProjectEvaluationResult,
  page?: SemanticRuntimePageInput,
): SemanticRuntimeAnswer<SemanticUnresolvedModulesResult> {
  const rows = evaluation.readUnresolvedModules()
    .map((edge): SemanticUnresolvedModuleRow => ({
      fromModuleKey: edge.fromModuleKey,
      moduleSpecifier: edge.moduleSpecifier,
      source: sourceReferenceForTsNode(edge.node),
    }))
    .sort((left, right) =>
      `${left.fromModuleKey}:${left.moduleSpecifier}`.localeCompare(`${right.fromModuleKey}:${right.moduleSpecifier}`)
    );
  const paged = pageRows(rows, page);
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Returned ${paged.rows.length} of ${rows.length} unresolved module edge(s).`,
    { rows: paged.rows },
    { ...COMPLETE_COLLECTION_ANSWER_OPTIONS, page: paged.page },
  );
}
