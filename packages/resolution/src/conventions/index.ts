export type { ConventionConfig, SuffixConfig, FilePatternConfig } from "./types.js";

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
