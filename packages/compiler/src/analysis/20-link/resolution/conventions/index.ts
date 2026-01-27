// Types
export type {
  ConventionConfig,
  SuffixConfig,
  FilePatternConfig,
  // Directory conventions (user-friendly)
  DirectoryConventionConfig,
  DirectoryRule,
  DirectoryScopeKind,
  // File pairing
  TemplatePairingConfig,
  StylesheetPairingConfig,
} from "./types.js";

// Defaults and naming utilities
export {
  // Decorator names
  DECORATOR_NAMES,
  RESOURCE_DECORATOR_NAMES,
  // Suffix patterns
  DEFAULT_SUFFIXES,
  DEFAULT_FILE_PATTERNS,
  DEFAULT_VIEW_MODEL_EXTENSIONS,
  DEFAULT_TEMPLATE_EXTENSIONS,
  DEFAULT_CONVENTION_CONFIG,
  CLASS_NAME_PATTERN,
  // Functions
  getResourceTypeFromClassName,
  stripResourceSuffix,
} from "./aurelia-defaults.js";

// Normalization (user-friendly → internal)
export {
  normalizeScope,
  normalizeDirectoryRule,
  normalizeDirectoryConventions,
} from "./normalize.js";
