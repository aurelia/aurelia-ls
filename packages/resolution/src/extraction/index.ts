export { extractAllFacts, extractSourceFacts } from "./extractor.js";
export { extractClassFacts } from "./class-extractor.js";
export { extractRegistrationCalls } from "./registrations.js";

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
} from "./types.js";
