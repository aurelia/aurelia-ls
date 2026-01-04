export { extractAllFacts, extractSourceFacts } from "./extractor.js";
export type { ExtractionOptions } from "./extractor.js";
export { extractClassFacts } from "./class-extractor.js";
export { extractRegistrationCalls } from "./registrations.js";
export { resolveImports } from "./import-resolver.js";

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
  BindingMode,
  Position,
  ImportFact,
  ImportedName,
  ExportFact,
  ExportedName,
  SiblingFileFact,
} from "./types.js";
