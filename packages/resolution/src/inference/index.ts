export { createResolverPipeline, type ResolverPipeline } from "./resolver-pipeline.js";
export { resolveFromDecorators } from "./decorator-resolver.js";
export { resolveFromStaticAu } from "./static-au-resolver.js";
export { resolveFromConventions } from "./convention-resolver.js";
export {
  extractTemplateMetadata,
  findPairedTemplate,
  type TemplateMetadata,
  type TemplateImport,
} from "./template-metadata.js";

export type {
  ResourceCandidate,
  BindableSpec,
} from "./types.js";
