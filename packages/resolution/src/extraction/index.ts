export { extractAllFacts, extractSourceFacts } from "./extractor.js";
export type { ExtractionOptions } from "./extractor.js";
export { extractClassFacts } from "./class-extractor.js";
export { extractRegistrationCalls } from "./registrations.js";
export { extractDefineCalls } from "./define-calls.js";
export { resolveImports } from "./import-resolver.js";
export {
  extractTemplateImports,
  resolveTemplateImportPaths,
  extractComponentTemplateImports,
} from "./template-imports.js";

export type {
  SourceFacts,
  ClassFacts,
  DecoratorFact,
  DecoratorArgFact,
  PropertyValueFact,
  StaticAuFact,
  StaticDependenciesFact,
  DependencyRef,
  BindableMemberFact,
  BindableDefFact,
  RegistrationCallFact,
  RegistrationArgFact,
  DefineCallFact,
  BindingMode,
  Position,
  ImportFact,
  ImportedName,
  ExportFact,
  ExportedName,
  SiblingFileFact,
  TemplateImportFact,
  NamedAlias,
} from "./types.js";
