/**
 * Convention Policy — Compiled Convention Rules
 *
 * STATUS: initial implementation
 * DEPENDS ON: project-semantics/conventions/types (ConventionConfig)
 * CONSUMED BY: core/interpret/recognize (replaces hardcoded suffix maps)
 *
 * Single canonical place for convention rules. Takes the user-facing
 * ConventionConfig and compiles it into a lookup-optimized policy
 * that the interpreter consumes.
 *
 * The ConventionConfig type (conventions/types.ts) is the stable
 * user-facing API. This module is the bridge between user config
 * and interpreter behavior.
 */

import type { ConventionConfig, SuffixConfig, FilePatternConfig } from '../../project-semantics/conventions/types.js';

// =============================================================================
// Resource Kind (local to avoid circular deps with core/resource/types)
// =============================================================================

type ConventionResourceKind =
  | 'custom-element'
  | 'custom-attribute'
  | 'template-controller'
  | 'value-converter'
  | 'binding-behavior'
  | 'binding-command';

// =============================================================================
// Compiled Policy
// =============================================================================

export interface CompiledConventionPolicy {
  /** Whether convention-based discovery is enabled at all. */
  readonly enabled: boolean;

  /** Class name suffix rules, ordered by specificity (longest suffix first). */
  readonly suffixRules: readonly SuffixRule[];

  /** Compiled regex for matching any known suffix (for stripping). */
  readonly suffixPattern: RegExp;

  /** File name pattern rules. */
  readonly filePatternRules: readonly FilePatternRule[];

  /**
   * Derive a resource name from a class name and resource kind.
   * Applies the Aurelia 2 naming convention:
   *   CE/CA/TC/BC → kebab-case(bareName)
   *   VC/BB → camelCase(bareName)
   */
  deriveName(className: string, kind: ConventionResourceKind): string;

  /**
   * Try to match a class name against suffix rules.
   * Returns the matched kind and bare name (without suffix), or null.
   */
  matchSuffix(className: string): { kind: ConventionResourceKind; bareName: string } | null;

  /**
   * Try to match a file base name against file pattern rules.
   * Returns the matched kind, or null.
   */
  matchFilePattern(fileBaseName: string): ConventionResourceKind | null;
}

export interface SuffixRule {
  readonly suffix: string;
  readonly kind: ConventionResourceKind;
}

export interface FilePatternRule {
  readonly pattern: RegExp;
  readonly kind: ConventionResourceKind;
}

// =============================================================================
// Defaults — Aurelia 2 Built-in Conventions
// =============================================================================

const DEFAULT_SUFFIXES: Required<SuffixConfig> = {
  element: ['CustomElement'],
  attribute: ['CustomAttribute'],
  templateController: ['TemplateController'],
  valueConverter: ['ValueConverter'],
  bindingBehavior: ['BindingBehavior'],
};

const DEFAULT_FILE_PATTERNS: Required<FilePatternConfig> = {
  element: [],
  attribute: [],
  valueConverter: [],
  bindingBehavior: [],
};

// =============================================================================
// Compilation
// =============================================================================

/**
 * Compile a ConventionConfig into a lookup-optimized policy.
 * If no config is provided, uses Aurelia 2 defaults.
 */
export function compileConventionPolicy(
  config?: ConventionConfig,
): CompiledConventionPolicy {
  const enabled = config?.enabled !== false;

  // Build suffix rules
  const suffixes = config?.suffixes ?? {};
  const suffixRules = buildSuffixRules({
    element: suffixes.element ?? DEFAULT_SUFFIXES.element,
    attribute: suffixes.attribute ?? DEFAULT_SUFFIXES.attribute,
    templateController: suffixes.templateController ?? DEFAULT_SUFFIXES.templateController,
    valueConverter: suffixes.valueConverter ?? DEFAULT_SUFFIXES.valueConverter,
    bindingBehavior: suffixes.bindingBehavior ?? DEFAULT_SUFFIXES.bindingBehavior,
  });

  // Build compiled suffix regex (for stripping in name derivation)
  const allSuffixes = suffixRules.map(r => r.suffix);
  const suffixPattern = allSuffixes.length > 0
    ? new RegExp(`^(.+?)(${allSuffixes.join('|')})$`)
    : /^(.+)$/;

  // Build file pattern rules
  const filePatterns = config?.filePatterns ?? {};
  const filePatternRules = buildFilePatternRules({
    element: filePatterns.element ?? DEFAULT_FILE_PATTERNS.element,
    attribute: filePatterns.attribute ?? DEFAULT_FILE_PATTERNS.attribute,
    valueConverter: filePatterns.valueConverter ?? DEFAULT_FILE_PATTERNS.valueConverter,
    bindingBehavior: filePatterns.bindingBehavior ?? DEFAULT_FILE_PATTERNS.bindingBehavior,
  });

  return {
    enabled,
    suffixRules,
    suffixPattern,
    filePatternRules,

    matchSuffix(className: string) {
      for (const rule of suffixRules) {
        if (className.endsWith(rule.suffix) && className.length > rule.suffix.length) {
          return {
            kind: rule.kind,
            bareName: className.slice(0, -rule.suffix.length),
          };
        }
      }
      return null;
    },

    matchFilePattern(fileBaseName: string) {
      for (const rule of filePatternRules) {
        if (rule.pattern.test(fileBaseName)) {
          return rule.kind;
        }
      }
      return null;
    },

    deriveName(className: string, kind: ConventionResourceKind) {
      // Strip known suffix
      const match = suffixPattern.exec(className);
      const bareName = match ? match[1]! : className;

      switch (kind) {
        case 'value-converter':
        case 'binding-behavior':
          return camelCase(bareName);
        default:
          return kebabCase(bareName);
      }
    },
  };
}

// =============================================================================
// Rule Builders
// =============================================================================

function buildSuffixRules(suffixes: Required<SuffixConfig>): SuffixRule[] {
  const kindMap: [keyof SuffixConfig, ConventionResourceKind][] = [
    ['element', 'custom-element'],
    ['attribute', 'custom-attribute'],
    ['templateController', 'template-controller'],
    ['valueConverter', 'value-converter'],
    ['bindingBehavior', 'binding-behavior'],
  ];

  const rules: SuffixRule[] = [];
  for (const [configKey, kind] of kindMap) {
    for (const suffix of suffixes[configKey]) {
      rules.push({ suffix, kind });
    }
  }

  // Sort by suffix length descending (most specific first)
  rules.sort((a, b) => b.suffix.length - a.suffix.length);
  return rules;
}

function buildFilePatternRules(patterns: Required<FilePatternConfig>): FilePatternRule[] {
  const kindMap: [keyof FilePatternConfig, ConventionResourceKind][] = [
    ['element', 'custom-element'],
    ['attribute', 'custom-attribute'],
    ['valueConverter', 'value-converter'],
    ['bindingBehavior', 'binding-behavior'],
  ];

  const rules: FilePatternRule[] = [];
  for (const [configKey, kind] of kindMap) {
    for (const glob of patterns[configKey]) {
      rules.push({ pattern: globToRegex(glob), kind });
    }
  }
  return rules;
}

/**
 * Convert a simple glob pattern to a regex.
 * Supports: * (any chars), ** (any path segment)
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^.]*');
  return new RegExp(`^${escaped}$`);
}

// =============================================================================
// Name Derivation Helpers
// =============================================================================

function kebabCase(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function camelCase(name: string): string {
  if (name.length === 0) return name;
  if (name === name.toUpperCase()) return name.toLowerCase();
  let i = 0;
  while (i < name.length - 1 && name[i] === name[i]!.toUpperCase() && name[i] !== name[i]!.toLowerCase()) {
    i++;
  }
  if (i <= 1) return name[0]!.toLowerCase() + name.slice(1);
  return name.slice(0, i - 1).toLowerCase() + name.slice(i - 1);
}
