import type { TemplateResourceCompilationEmission } from './template-compilation-project-pass.js';
import {
  validateTemplateCompilerNormalizedSiteGraph,
} from './template-compiler-normalized-site-graph.js';
import type {
  TemplateCompilerNormalizedSiteIndexResult,
} from './template-compiler-normalized-site-model.js';

export * from './template-compiler-normalized-site-model.js';

/** Build and validate one GraphExact attribute/text schedule basis without publishing a semantic product. */
export function buildTemplateCompilerNormalizedSiteIndex(
  compilation: TemplateResourceCompilationEmission,
): TemplateCompilerNormalizedSiteIndexResult {
  return validateTemplateCompilerNormalizedSiteGraph(compilation);
}
