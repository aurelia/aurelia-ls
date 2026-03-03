/**
 * Vocabulary Registry — Frozen Syntax Extension Registry
 *
 * The vocabulary is the set of binding commands (BCs) and attribute
 * patterns (APs) that the compiler knows about. It must be frozen
 * before template analysis begins — the attribute parser freezes its
 * pattern set after the first parse() call.
 *
 * Vocabulary is global (root-level singleton), not per-scope. The
 * IAttributeParser is a root-resolved singleton inherited to all
 * child CompilationContexts.
 *
 * Three sources:
 * 1. Core builtins (StandardConfiguration) — 13 BCs + 8 AP classes
 * 2. Plugin postulates (known plugins with default config) — e.g., i18n
 * 3. Gaps from plugin .customize() callbacks — indeterminate aliases
 *
 * BCs and APs are Configured<T> items, not Sourced<T>. They enter the
 * model via builtin registration or explicit configuration, never
 * through the convergence algebra.
 */

import type { EvidenceSource } from './types.js';

// =============================================================================
// Public Types
// =============================================================================

export interface VocabularyGreen {
  /** All known binding commands, keyed by name */
  readonly commands: ReadonlyMap<string, BindingCommandEntry>;
  /** All known attribute patterns */
  readonly patterns: readonly AttributePatternEntry[];
  /** Vocabulary completeness state */
  readonly completeness: VocabularyCompleteness;
}

export interface BindingCommandEntry {
  readonly name: string;
  /** When true, the command owns the attribute — compiler skips bindable/CA resolution */
  readonly ignoreAttr: boolean;
  /** The instruction type the command produces */
  readonly outputInstruction: string;
  /** Which expression parser entry point to use. null for 'spread' (no expression) */
  readonly expressionEntry: 'IsProperty' | 'IsFunction' | 'IsIterator' | 'IsCustom' | null;
  /** Source of this entry */
  readonly source: 'builtin' | 'plugin-postulate';
}

export interface AttributePatternEntry {
  /** Pattern class name (e.g., 'DotSeparated', 'TranslationAP') */
  readonly className: string;
  /** Pattern strings (e.g., ['PART.PART', 'PART.PART.PART']) */
  readonly patterns: readonly string[];
  /** Symbol characters used in pattern matching */
  readonly symbols: string;
  /** Source of this entry */
  readonly source: 'builtin' | 'plugin-postulate';
}

export type VocabularyCompleteness =
  | { readonly state: 'complete' }
  | { readonly state: 'incomplete'; readonly gaps: readonly VocabularyGap[] };

export interface VocabularyGap {
  readonly site: string;
  readonly reason: string;
}

export interface VocabularyRed {
  readonly provenance: ReadonlyMap<string, string>;
}

// =============================================================================
// Core Builtin Vocabulary — Product Postulates (L3 §7.1)
// =============================================================================

const CORE_BINDING_COMMANDS: readonly BindingCommandEntry[] = [
  // DefaultBindingSyntax (6)
  { name: 'one-time', ignoreAttr: false, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'to-view', ignoreAttr: false, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'from-view', ignoreAttr: false, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'two-way', ignoreAttr: false, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'bind', ignoreAttr: false, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'for', ignoreAttr: false, outputInstruction: 'IteratorBinding', expressionEntry: 'IsIterator', source: 'builtin' },
  // DefaultBindingLanguage (7)
  { name: 'trigger', ignoreAttr: true, outputInstruction: 'ListenerBinding', expressionEntry: 'IsFunction', source: 'builtin' },
  { name: 'capture', ignoreAttr: true, outputInstruction: 'ListenerBinding', expressionEntry: 'IsFunction', source: 'builtin' },
  { name: 'attr', ignoreAttr: true, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'style', ignoreAttr: true, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'class', ignoreAttr: true, outputInstruction: 'PropertyBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'ref', ignoreAttr: true, outputInstruction: 'RefBinding', expressionEntry: 'IsProperty', source: 'builtin' },
  { name: 'spread', ignoreAttr: false, outputInstruction: 'SpreadValueBinding', expressionEntry: null, source: 'builtin' },
];

const CORE_ATTRIBUTE_PATTERNS: readonly AttributePatternEntry[] = [
  // DefaultBindingSyntax (5 classes)
  { className: 'DotSeparated', patterns: ['PART.PART', 'PART.PART.PART'], symbols: '.', source: 'builtin' },
  { className: 'Ref', patterns: ['ref', 'PART.ref'], symbols: '.', source: 'builtin' },
  { className: 'Event', patterns: ['PART.trigger:PART', 'PART.capture:PART'], symbols: '.:', source: 'builtin' },
  { className: 'ColonPrefixed', patterns: [':PART'], symbols: ':', source: 'builtin' },
  { className: 'AtPrefixed', patterns: ['@PART', '@PART:PART'], symbols: '@:', source: 'builtin' },
  // DefaultComponents — promise TC patterns (3 classes)
  { className: 'Promise', patterns: ['promise.resolve'], symbols: '', source: 'builtin' },
  { className: 'Fulfilled', patterns: ['then'], symbols: '', source: 'builtin' },
  { className: 'Rejected', patterns: ['catch'], symbols: '', source: 'builtin' },
];

// =============================================================================
// Plugin Postulate: i18n (@aurelia/i18n)
// =============================================================================

const I18N_BINDING_COMMANDS: readonly BindingCommandEntry[] = [
  { name: 't', ignoreAttr: false, outputInstruction: 'TranslationBinding', expressionEntry: 'IsCustom', source: 'plugin-postulate' },
  { name: 't.bind', ignoreAttr: false, outputInstruction: 'TranslationBinding', expressionEntry: 'IsProperty', source: 'plugin-postulate' },
  { name: 't-params.bind', ignoreAttr: false, outputInstruction: 'TranslationBinding', expressionEntry: 'IsProperty', source: 'plugin-postulate' },
];

const I18N_ATTRIBUTE_PATTERNS: readonly AttributePatternEntry[] = [
  { className: 'TranslationAP', patterns: ['t'], symbols: '', source: 'plugin-postulate' },
  { className: 'TranslationBindAP', patterns: ['t.bind'], symbols: '', source: 'plugin-postulate' },
  { className: 'TranslationParametersAP', patterns: ['t-params.bind'], symbols: '', source: 'plugin-postulate' },
];

// =============================================================================
// Known Plugins Registry
// =============================================================================

/**
 * Known plugin identifiers and their vocabulary contributions.
 * The product recognizes these plugins by their import specifier or
 * identifier name and knows their default vocabulary.
 */
interface KnownPlugin {
  /** Identifiers that reference this plugin (import names) */
  readonly identifiers: readonly string[];
  /** Import specifier (module path) */
  readonly specifier: string;
  /** Default BCs registered by this plugin */
  readonly commands: readonly BindingCommandEntry[];
  /** Default APs registered by this plugin */
  readonly patterns: readonly AttributePatternEntry[];
  /** Whether .customize() creates a vocabulary gap */
  readonly customizeCreatesGap: boolean;
}

const KNOWN_PLUGINS: readonly KnownPlugin[] = [
  {
    identifiers: ['I18nConfiguration'],
    specifier: '@aurelia/i18n',
    commands: I18N_BINDING_COMMANDS,
    patterns: I18N_ATTRIBUTE_PATTERNS,
    customizeCreatesGap: true,
  },
];

// =============================================================================
// Vocabulary Evaluation
// =============================================================================

/**
 * Evaluate the vocabulary registry for a project.
 *
 * Builds the frozen vocabulary from:
 * 1. Core builtins (always present)
 * 2. Known plugin postulates (detected from root registrations)
 * 3. Gaps from plugin .customize() callbacks
 *
 * The rootRegistrations parameter carries the class-ref and gap entries
 * from the root registration scanner — used to detect which plugins
 * are registered and whether they use .customize().
 */
export function evaluateVocabulary(
  rootRegistrationRefs: readonly string[],
  rootRegistrationGaps: readonly string[],
): { green: VocabularyGreen; red: VocabularyRed } {
  const commands = new Map<string, BindingCommandEntry>();
  const patterns: AttributePatternEntry[] = [];
  const gaps: VocabularyGap[] = [];
  const provenance = new Map<string, string>();

  // 1. Core builtins — always present
  for (const cmd of CORE_BINDING_COMMANDS) {
    commands.set(cmd.name, cmd);
    provenance.set(`bc:${cmd.name}`, 'StandardConfiguration');
  }
  for (const ap of CORE_ATTRIBUTE_PATTERNS) {
    patterns.push(ap);
    provenance.set(`ap:${ap.className}`, 'StandardConfiguration');
  }

  // 2. Detect known plugins from root registrations
  for (const plugin of KNOWN_PLUGINS) {
    const isRegistered = rootRegistrationRefs.some(ref => {
      if (ref.startsWith('class:')) {
        const className = ref.slice(6);
        return plugin.identifiers.includes(className);
      }
      return false;
    });

    if (!isRegistered) continue;

    // Add plugin's default vocabulary
    for (const cmd of plugin.commands) {
      if (!commands.has(cmd.name)) {
        commands.set(cmd.name, cmd);
        provenance.set(`bc:${cmd.name}`, plugin.specifier);
      }
    }
    for (const ap of plugin.patterns) {
      patterns.push(ap);
      provenance.set(`ap:${ap.className}`, plugin.specifier);
    }

    // Check if the plugin was registered with .customize()
    // This is detected by looking for opaque-call gaps referencing the plugin's configure method
    const hasCustomize = rootRegistrationGaps.some(g =>
      g.includes('customize') || g.includes('opaque-call:customize')
    );

    // Also check class refs: if the identifier was registered via a call
    // (I18nConfiguration.customize(...)), it appears as a gap, not as a class-ref.
    // The registration gap from 4C.5 already carries this information.
    if (hasCustomize && plugin.customizeCreatesGap) {
      gaps.push({
        site: plugin.specifier,
        reason: `plugin customize callback may create additional BCs/APs`,
      });
    }
  }

  // 3. Check for general vocabulary gaps from unrecognized root registration gaps
  for (const gap of rootRegistrationGaps) {
    // Opaque calls that aren't recognized plugins contribute vocabulary uncertainty
    if (gap.startsWith('opaque-call:') || gap.startsWith('spread:opaque')) {
      const alreadyCovered = gaps.some(g => g.reason.includes('plugin customize'));
      if (!alreadyCovered) {
        gaps.push({
          site: 'root',
          reason: `opaque registration may include syntax extensions: ${gap}`,
        });
      }
    }
  }

  const completeness: VocabularyCompleteness = gaps.length > 0
    ? { state: 'incomplete', gaps }
    : { state: 'complete' };

  return {
    green: { commands, patterns, completeness },
    red: { provenance },
  };
}
