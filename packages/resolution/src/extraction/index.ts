// === FileFacts extraction ===
export {
  extractAllFileFacts,
  extractFileFacts,
  extractFileContext,
} from "./file-facts-extractor.js";

export type { ExtractionOptions } from "./file-facts-extractor.js";

export type {
  FileFacts,
  ImportDeclaration,
  ExportDeclaration,
  VariableDeclaration,
  FunctionDeclaration,
  RegistrationCall,
  DefineCall,
  FileContext,
  TemplateImport,
  MatchContext,
} from "./file-facts.js";

export { emptyFileFacts, emptyFileContext } from "./file-facts.js";

export {
  extractTemplateImports,
  resolveTemplateImportPaths,
  extractComponentTemplateImports,
} from "./template-imports.js";
