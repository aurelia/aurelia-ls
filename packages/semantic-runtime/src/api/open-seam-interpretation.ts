import {
  SemanticOpenSeamAttemptKind,
  SemanticOpenSeamBoundaryKind,
  type SemanticOpenSeamAttempt,
  type SemanticOpenSeamBoundary,
} from './contracts.js';

/** Explain which semantic operation produced an open-seam kind without upgrading it into a diagnostic. */
export function semanticOpenSeamAttemptForKind(
  seamKindKey: string,
): SemanticOpenSeamAttempt {
  switch (semanticOpenSeamNamespace(seamKindKey)) {
    case 'evaluation':
      return {
        kind: SemanticOpenSeamAttemptKind.StaticModuleEvaluation,
        summary: 'Static module evaluation tried to reduce source enough for Aurelia recognition without executing the app.',
      };
    case 'resource':
      return {
        kind: SemanticOpenSeamAttemptKind.ResourceRecognition,
        summary: 'Resource recognition tried to close authored Aurelia resource metadata.',
      };
    case 'registration':
      return {
        kind: SemanticOpenSeamAttemptKind.RegistrationRecognition,
        summary: 'Registration recognition tried to classify DI or resource registration source expressions.',
      };
    case 'configuration':
      return {
        kind: SemanticOpenSeamAttemptKind.ConfigurationRecognition,
        summary: 'Configuration recognition tried to close app or plugin configuration contributions.',
      };
    case 'di':
      return {
        kind: SemanticOpenSeamAttemptKind.DiWorldConstruction,
        summary: 'DI world construction tried to spend recognized registrations into container effects.',
      };
    case 'router':
    case 'route-recognizer':
      return {
        kind: SemanticOpenSeamAttemptKind.RouterMaterialization,
        summary: 'Router analysis tried to materialize route, viewport, instruction, or recognition state.',
      };
    case 'compiler':
    case 'template':
    case 'instruction':
      return {
        kind: SemanticOpenSeamAttemptKind.TemplateCompilationRendering,
        summary: 'Template compilation or rendering analysis tried to lower HTML/compiler products into runtime semantics.',
      };
    case 'binding':
      return {
        kind: SemanticOpenSeamAttemptKind.BindingRuntimeAnalysis,
        summary: 'Runtime binding analysis tried to close target access, value channel, source operation, or data flow.',
      };
    case 'type-system':
      return {
        kind: SemanticOpenSeamAttemptKind.TypeCheckerProjection,
        summary: 'TypeChecker projection tried to close a type or member surface without guessing.',
      };
    default:
      return {
        kind: SemanticOpenSeamAttemptKind.SemanticProductMaterialization,
        summary: 'A semantic product pass reached a boundary that is not yet classified more narrowly.',
      };
  }
}

/** Classify the kind of boundary that kept a semantic operation open. */
export function semanticOpenSeamBoundaryForKind(
  seamKindKey: string,
): SemanticOpenSeamBoundary {
  switch (seamKindKey) {
    case 'evaluation.depth-limit':
    case 'evaluation.statement-limit':
      return {
        kind: SemanticOpenSeamBoundaryKind.AnalysisGuardrail,
        summary: 'Analysis stopped at an explicit recursion, statement, or budget guardrail.',
      };
    case 'evaluation.unsupported-statement':
    case 'evaluation.unsupported-expression':
    case 'evaluation.unsupported-binding-pattern':
      return {
        kind: SemanticOpenSeamBoundaryKind.UnsupportedSubstrate,
        summary: 'The source construct is legal, but this substrate has not modeled its semantics yet.',
      };
    case 'evaluation.unresolved-identifier':
    case 'evaluation.unresolved-module':
      return {
        kind: SemanticOpenSeamBoundaryKind.StaticEnvironmentGap,
        summary: 'A value or module needed by static analysis was absent from the modeled environment.',
      };
    case 'evaluation.dynamic-call':
    case 'evaluation.dynamic-branch':
    case 'evaluation.dynamic-loop':
    case 'evaluation.dynamic-mutation':
    case 'evaluation.dynamic-import':
      return {
        kind: SemanticOpenSeamBoundaryKind.RuntimeExecutionBoundary,
        summary: 'Closing the fact would require executing user or runtime behavior that semantic-runtime should not guess.',
      };
    case 'type-system.open-type-projection':
      return {
        kind: SemanticOpenSeamBoundaryKind.TypeCheckerProjectionBoundary,
        summary: 'The TypeChecker projection could not close the type or member surface without guessing.',
      };
    default:
      return {
        kind: SemanticOpenSeamBoundaryKind.FrameworkSemanticBoundary,
        summary: frameworkSemanticBoundarySummaryForKind(seamKindKey),
      };
  }
}

function semanticOpenSeamNamespace(seamKindKey: string): string {
  const dot = seamKindKey.indexOf('.');
  return dot < 0 ? seamKindKey : seamKindKey.slice(0, dot);
}

function frameworkSemanticBoundarySummaryForKind(seamKindKey: string): string {
  switch (semanticOpenSeamNamespace(seamKindKey)) {
    case 'resource':
      return 'Resource recognition reached authored metadata that could not close without guessing the resource shape.';
    case 'registration':
      return 'Registration recognition reached a DI or resource registration shape that could not close without guessing the registration target, value, or strategy.';
    case 'configuration':
      return 'Configuration recognition reached an app or plugin configuration shape that could not close without guessing the target, option, or callback contribution.';
    case 'di':
      return 'DI world construction reached a registration or container effect boundary that could not be spent into concrete container state.';
    case 'router':
    case 'route-recognizer':
      return 'Router materialization reached a route, viewport, href, redirect, or recognition boundary that could not close without guessing navigation state.';
    case 'compiler':
    case 'template':
    case 'instruction':
      return 'Template compilation or rendering materialization reached child content, executable command, hook, or instruction shape that could not close without guessing.';
    case 'binding':
      return 'Runtime binding analysis reached target access, target operation, source operation, value-channel, or data-flow semantics that could not close without guessing.';
    default:
      return 'Framework-shaped materialization reached a legal but still-open semantic boundary.';
  }
}
