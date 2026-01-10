import type { BindingMode } from "../model/ir.js";
import type { AttributePatternConfig, TemplateSyntaxRegistry } from "../language/registry.js";
import { BUILTIN_ATTRIBUTE_PATTERNS } from "../language/registry.js";

/** Result of parsing an attribute name. */
export class AttrSyntax {
  constructor(
    public rawName: string,
    public rawValue: string,
    public target: string,              // e.g. 'value', 'click', 'element' (for 'ref'), 'component' (for 'view-model.ref')
    public command: string | null,      // e.g. 'bind' | 'to-view' | 'two-way' | 'trigger' | 'capture' | 'ref' | null
    public parts: readonly string[] | null = null, // optional extra info (event modifiers, etc.)
    /**
     * Optional mode override from pattern config.
     * When set, this takes precedence over mode derived from command.
     * Used by `:PART` pattern which produces command="bind" but mode="toView".
     */
    public mode: BindingMode | null = null,
  ) {}
}

/* ---------- Internal representation ---------- */

type Token =
  | { kind: 'PART' }
  | { kind: 'LIT'; value: string };

type Score = { statics: number; dynamics: number; symbols: number };

class CompiledPattern {
  readonly tokens: Token[];
  readonly score: Score;
  readonly symbolSet: Set<string>;

  constructor(
    public readonly config: AttributePatternConfig,
  ) {
    const { tokens, score } = compilePattern(config.pattern, config.symbols);
    this.tokens = tokens;
    this.score = score;
    this.symbolSet = toSymbolSet(config.symbols);
  }

  tryMatch(input: string): string[] | null {
    const parts: string[] = [];
    const syms = this.symbolSet;
    let i = 0;

    for (let t = 0; t < this.tokens.length; t++) {
      const tok = this.tokens[t]!;
      if (tok.kind === 'LIT') {
        const { value } = tok;
        if (!input.startsWith(value, i)) return null;
        i += value.length;
      } else {
        // PART: consume >= 1 char that is NOT a symbol
        const start = i;
        while (i < input.length && !syms.has(input[i]!)) i++;
        if (i === start) return null; // empty dynamic segment is invalid
        parts.push(input.slice(start, i));
      }
    }
    return i === input.length ? parts : null;
  }
}

function toSymbolSet(symbols: string): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < symbols.length; i++) s.add(symbols[i]!);
  return s;
}

function compilePattern(pattern: string, symbols: string): { tokens: Token[]; score: Score } {
  const tokens: Token[] = [];
  let statics = 0, dynamics = 0, symbolRuns = 0;

  const isPartAt = (idx: number) => pattern.startsWith('PART', idx);
  const symSet = toSymbolSet(symbols);

  let i = 0;
  while (i < pattern.length) {
    if (isPartAt(i)) {
      tokens.push({ kind: 'PART' });
      dynamics++;
      i += 4; // 'PART'
      continue;
    }

    // collect a maximal run that does not cross a 'PART'
    const runStart = i;
    while (i < pattern.length && !isPartAt(i)) i++;
    const run = pattern.slice(runStart, i);

    // split the run into contiguous segments of [symbols] vs [non-symbols]
    let j = 0;
    while (j < run.length) {
      const isSymbol = symSet.has(run[j]!);
      let k = j + 1;
      while (k < run.length && symSet.has(run[k]!) === isSymbol) k++;
      const seg = run.slice(j, k);
      tokens.push({ kind: 'LIT', value: seg });
      if (isSymbol) symbolRuns++;
      else statics++;
      j = k;
    }
  }

  return { tokens, score: { statics, dynamics, symbols: symbolRuns } };
}

/* ---------- Config-driven interpretation ---------- */

/**
 * Interpret a matched pattern using its config.
 * This replaces the function-based handlers with config-driven logic.
 */
function interpretConfig(
  config: AttributePatternConfig,
  rawName: string,
  rawValue: string,
  parts: readonly string[]
): AttrSyntax {
  const interpret = config.interpret;

  switch (interpret.kind) {
    case "target-command": {
      // PART.PART → target=parts[0], command=parts[last]
      // PART.PART.PART → target=parts[0].parts[1], command=parts[last]
      // All parts except the last are joined by "." to form the target
      const target = parts.slice(0, -1).join(".");
      const command = parts[parts.length - 1]!;
      return new AttrSyntax(rawName, rawValue, target, command);
    }

    case "fixed": {
      // Fixed target and command (e.g., "ref" → target="element", command="ref")
      return new AttrSyntax(rawName, rawValue, interpret.target, interpret.command);
    }

    case "fixed-command": {
      // First part becomes target, command is fixed
      // Mode override is passed through if specified (e.g., `:PART` → mode="toView")
      const target = parts[0] ?? rawName;
      return new AttrSyntax(rawName, rawValue, target, interpret.command, null, interpret.mode ?? null);
    }

    case "mapped-fixed-command": {
      // First part becomes target (with optional mapping), command is fixed
      const part = parts[0] ?? "";
      const target = interpret.targetMap?.[part] ?? part;
      return new AttrSyntax(rawName, rawValue, target, interpret.command);
    }

    case "event-modifier": {
      // Event pattern with modifier: PART.trigger:PART or @PART:PART
      // parts[0] = event, parts[1] = modifier (if present)
      const event = parts[0]!;
      const command = interpret.command;

      // injectCommand: true means insert command at index 1 (for @ patterns)
      // injectCommand: false means passthrough parts as-is
      const normalizedParts = interpret.injectCommand && parts.length > 1
        ? [event, command, ...parts.slice(1)]
        : parts;
      return new AttrSyntax(rawName, rawValue, event, command, normalizedParts);
    }

    case "passthrough": {
      // Fixed target/command but preserve parts (useful for testing pattern matching)
      return new AttrSyntax(rawName, rawValue, interpret.target, interpret.command, parts);
    }
  }
}

/* ---------- Public registry ---------- */

/**
 * AttributeParser: register patterns with configs, then parse names.
 * - Deterministic precedence: more statics > more dynamics > more symbols.
 * - Caches successful matches by attribute name (value-independent).
 */
export class AttributeParser {
  private readonly _compiled: CompiledPattern[] = [];
  private readonly _byKey = new Map<string, CompiledPattern>();
  private readonly _cache = new Map<string, { pat: CompiledPattern; parts: readonly string[] }>();
  private _sealed = false;

  /**
   * Register patterns from config objects.
   * This is the config-driven API replacing the old function-based registerPattern.
   */
  registerPatterns(configs: readonly AttributePatternConfig[]): void {
    if (this._sealed) throw new Error('[syntax] AttributeParser already used; cannot add patterns after parse()');
    for (const config of configs) {
      if (this._byKey.has(config.pattern)) {
        throw new Error(`[syntax] Duplicate attribute pattern "${config.pattern}"`);
      }
      const cp = new CompiledPattern(config);
      this._compiled.push(cp);
      this._byKey.set(config.pattern, cp);
    }
  }

  parse(name: string, value: string): AttrSyntax {
    this._sealed = true;

    // Fast path: cached interpretation for this name
    const cached = this._cache.get(name);
    if (cached) {
      const { pat, parts } = cached;
      return interpretConfig(pat.config, name, value, parts);
    }

    // Try all patterns, keep the best match by score.
    let best: { pat: CompiledPattern; parts: string[] } | null = null;
    for (let i = 0; i < this._compiled.length; i++) {
      const pat = this._compiled[i]!;
      const parts = pat.tryMatch(name);
      if (!parts) continue;

      if (!best) {
        best = { pat, parts };
      } else {
        const a = pat.score, b = best.pat.score;
        if (
          a.statics > b.statics ||
          (a.statics === b.statics && (a.dynamics > b.dynamics ||
          (a.dynamics === b.dynamics && a.symbols > b.symbols)))
        ) {
          best = { pat, parts };
        }
      }
    }

    if (!best) {
      // No pattern matched: identity (target === rawName, no command)
      return new AttrSyntax(name, value, name, null, null);
    }

    this._cache.set(name, best);
    return interpretConfig(best.pat.config, name, value, best.parts);
  }
}

/* -------------------------------------------------------------------------------------------------
 * Public helpers
 * ------------------------------------------------------------------------------------------------ */

/** Registers all built-in patterns into an existing parser (fluent). */
export function registerBuiltins(p: AttributeParser): AttributeParser {
  p.registerPatterns(BUILTIN_ATTRIBUTE_PATTERNS);
  return p;
}

/** Factory producing a parser preloaded with the built-in syntax. */
export function createDefaultSyntax(): AttributeParser {
  return registerBuiltins(new AttributeParser());
}

export const DEFAULT_SYNTAX = createDefaultSyntax();

/** Factory producing a parser preloaded from a TemplateSyntaxRegistry. */
export function createAttributeParserFromRegistry(registry: TemplateSyntaxRegistry): AttributeParser {
  const parser = new AttributeParser();
  parser.registerPatterns(registry.attributePatterns);
  return parser;
}
