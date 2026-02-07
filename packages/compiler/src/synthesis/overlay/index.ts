// Overlay synthesis public API
//
// IMPORTANT: Consumers should import from this barrel, not from deep paths.
// Note: VmReflection and SynthesisOptions are exported from shared/, not here.

// Types
export type { OverlayPlanModule, TemplateOverlayPlan, FrameOverlayPlan } from "./types.js";
export type { EmitResult as OverlayEmitResult, EmitOptions as OverlayEmitOptions, OverlayEmitMappingEntry } from "./emit.js";
export type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "./mapping.js";
export type { TemplateQueryFacade, TemplateNodeInfo, TemplateBindableInfo, TemplateExpressionInfo, TemplateControllerInfo } from "./query.js";
export type { OverlayProductArtifacts, OverlayProductOptions, OverlayProductResult } from "./product.js";
export type { MappedExpressionEmitResult, SpanMapping, PrintedExpressionLike, MappableExpression } from "./mapped-emitter.js";

// Functions
export { plan as planOverlay } from "./plan.js";
export { emitOverlayFile, emitOverlay } from "./emit.js";
export { emitMappedExpression, emitPrintedExpression } from "./mapped-emitter.js";
export { buildTemplateMapping } from "./mapping.js";
export { buildTemplateQuery } from "./query.js";
export { buildOverlayProduct } from "./product.js";
export { computeOverlayBaseName, overlayFilename, overlayPath } from "./paths.js";
