import type { ProjectBootFrame } from '../boot/frames.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppQuery,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  answer,
} from './answer-helpers.js';
import {
  readSemanticAuthoringCatalogAnswer,
} from './authoring-catalog.js';
import {
  readSemanticSourceFiles,
} from './source-files.js';
import {
  readSemanticUnresolvedModules,
} from './unresolved-modules.js';

export type SemanticAppWorldFreeEvaluationReader = () => StaticProjectEvaluationResult;

export function answerRuntimeStaticAppQuery(
  query: SemanticAppQuery,
): SemanticRuntimeAnswer<unknown> {
  switch (query.kind) {
    case SemanticAppQueryKind.AuthoringCatalog:
      return readSemanticAuthoringCatalogAnswer();
    default:
      return answer(
        SemanticRuntimeAnswerOutcome.Unsupported,
        `Semantic app query '${query.kind}' is not a runtime-static query.`,
        { query },
      );
  }
}

export function answerAppWorldFreeQuery(
  project: ProjectBootFrame,
  query: SemanticAppQuery,
  readEvaluation: SemanticAppWorldFreeEvaluationReader,
): SemanticRuntimeAnswer<unknown> {
  switch (query.kind) {
    case SemanticAppQueryKind.AuthoringCatalog:
      return answerRuntimeStaticAppQuery(query);
    case SemanticAppQueryKind.SourceFiles:
      return readSemanticSourceFiles(project, query.page, query.detail);
    case SemanticAppQueryKind.UnresolvedModules:
      return readSemanticUnresolvedModules(readEvaluation(), query.page);
    default:
      return answer(
        SemanticRuntimeAnswerOutcome.Unsupported,
        `Semantic app query '${query.kind}' is not an app-world-free query.`,
        { query },
      );
  }
}
