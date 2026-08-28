/** Semantic compiler boundary retained in one family-wide execution sequence. */
export const enum TemplateCompilerOperationKind {
  CompilerHook = 'compiler-hook',
  LocalTemplateExtraction = 'local-template-extraction',
  ProcessContent = 'process-content',
  ProjectionExtraction = 'projection-extraction',
  TemplateControllerWrapping = 'template-controller-wrapping',
  ContainerlessReplacement = 'containerless-replacement',
  TextInterpolationExpansion = 'text-interpolation-expansion',
  HydrationTargetCreation = 'hydration-target-creation',
  AttributeDisposition = 'attribute-disposition',
}
