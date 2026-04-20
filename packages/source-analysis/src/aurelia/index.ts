export {
  REF_KINDS,
  KEY_REF_KINDS,
  RESOURCE_REFERENCE_REF_KINDS,
  TEMPLATE_NODE_REF_KINDS,
  SourceSpan,
  ProgramRef,
  SourceFileRef,
  SourceNodeRef,
  SymbolRef,
  KeyRef,
  ContainerWorldRef,
  RegistrationRef,
  TemplateRef,
  CompiledTemplateRef,
  TemplateNodeRef,
  TemplateLocationRef,
  ResourceReferenceRef,
  type T_Ref,
  type RefKind,
  type KeyRefKind,
  type ResourceReferenceRefKind,
  type TemplateNodeRefKind,
} from './refs.js';

export {
  Container,
  type ContainerLookupRequest,
  type ContainerEntry,
  type ContainerState,
} from './container.js';

export { AppRoot, type AppRootConfig } from './app-root.js';
export { Aurelia, type AureliaAppConfig } from './aurelia.js';
export { Registration } from './registration.js';
export { ResourceResolver } from './resource-resolver.js';
export { Resolver } from './resolver.js';
export { TemplateCompiler } from './template-compiler.js';
export {
  EVALUATION_BOUNDARY_KINDS,
  VALUE_VIEW_KINDS,
  EvaluationBoundary,
  TypeScriptEvaluator,
  ValueView,
  type EvaluationBoundaryKind,
  type ValueViewKind,
} from './typescript-evaluator.js';
export {
  DeclarationWorld,
  type DeclarationExport,
  type DeclarationWorldState,
} from './declaration-world.js';
export { Framework, type FrameworkOptions } from './framework.js';
export { Project, type ProjectOptions } from './project.js';
export { Workspace, type WorkspaceOptions } from './workspace.js';
