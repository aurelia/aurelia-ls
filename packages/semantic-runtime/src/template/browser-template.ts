/** Explicit compiler-conservation surface; ordinary semantic-runtime consumers do not load its HTML parser. */
export * from './browser-template-draft.js';
export * from './browser-template-parser.js';
export * from './browser-template-selection.js';
export * from './browser-template-correspondence.js';
export * from './browser-effective-template-materializer.js';
export {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
export * from './template-compiler-deterministic-execution.js';
export * from './template-compiler-root-site-cursor-observation.js';
export * from './template-compiler-occurrence-target-execution.js';
export * from './template-compiler-occurrence-target-schedule.js';
