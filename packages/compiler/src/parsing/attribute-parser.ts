import type { BindingMode } from "../model/ir.js";
import type { TextSpan } from "../model/span.js";
import type { AttributePatternConfig, TemplateSyntaxRegistry } from "../schema/registry.js";
import { BUILTIN_ATTRIBUTE_PATTERNS, buildTemplateSyntaxRegistry, BUILTIN_SEMANTICS } from "../schema/registry.js";

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
    /** Pattern string that matched (from registry), or null for identity fallback. */
    public pattern: string | null = null,
  ) {}
}

export type AttrPartSpan = TextSpan & { text: string };

export type AttrCommandSpan = TextSpan & { kind: "symbol" | "text" };

export interface AttributeNameAnalysis {
  readonly syntax: AttrSyntax;
  readonly pattern: AttributePatternConfig | null;
  readonly partSpans: readonly AttrPartSpan[] | null;
  readonly targetSpan: TextSpan | null;
  readonly commandSpan: AttrCommandSpan | null;
}

/* ---------- Internal representation ---------- */

type Token =
  | { kind: 'PART' }
  | { kind: 'LIT'; value: string };

type Score = { statics: number; dynamics: number; symbols: number };

/**
 * Result from the predictive DFA. Describes where a partial input ran out
 * within a pattern and what the next expected token is.
 */
export interface PredictiveMatchResult {
  /** The pattern config that matched this prefix. */
  readonly config: AttributePatternConfig;
  /** Parts consumed so far (variable segments only). */
  readonly consumedParts: readonly string[];
  /** Number of literal tokens consumed from the input. A prediction is only
   *  structurally significant when at least one literal has been consumed —
   *  without a consumed separator/literal, the match is just a bare
   *  identifier with no structural intent evidence. */
  readonly consumedLiterals: number;
  /** Token index in the pattern where the input ran out. */
  readonly tokenIndex: number;
  /** The token expected next. */
  readonly nextToken: { kind: 'PART' } | { kind: 'LIT'; value: string };
  /** How many characters of the input were consumed. */
  readonly inputConsumed: number;
  /** The kind of prediction. */
  readonly state:
    | 'expects-part'      // next token is a variable PART
    | 'expects-literal'   // next token is a fixed literal string
    | 'partial-literal';  // input ran out mid-literal (partial prefix match)
  /** What the user has typed toward the next token (may be empty). */
  readonly prefix: string;
}

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
    const match = this.tryMatchWithSpans(input);
    return match ? match.parts : null;
  }

  tryMatchWithSpans(input: string): { parts: string[]; spans: AttrPartSpan[] } | null {
    const parts: string[] = [];
    const spans: AttrPartSpan[] = [];
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
        const text = input.slice(start, i);
        parts.push(text);
        spans.push({ start, end: i, text });
      }
    }
    return i === input.length ? { parts, spans } : null;
  }

  /**
   * Predictive match: given a partial input, determine how far through this
   * pattern the input matches and what the next expected token is.
   *
   * Returns null if the input cannot be a prefix of this pattern.
   * Returns a PredictiveMatchResult describing where the input ran out
   * and what could come next.
   *
   * This is the prediction counterpart to the recognition tryMatch. Where
   * tryMatch answers "does this complete string match?", tryPredictiveMatch
   * answers "is this string a valid prefix, and what could follow?"
   */
  tryPredictiveMatch(input: string): PredictiveMatchResult | null {
    const consumedParts: string[] = [];
    const syms = this.symbolSet;
    let i = 0;
    let consumedLiterals = 0;

    for (let t = 0; t < this.tokens.length; t++) {
      const tok = this.tokens[t]!;

      if (i >= input.length) {
        // Input exhausted mid-pattern — this token is the next expected.
        return {
          config: this.config,
          consumedParts,
          consumedLiterals,
          tokenIndex: t,
          nextToken: tok,
          inputConsumed: i,
          state: tok.kind === 'PART' ? 'expects-part' : 'expects-literal',
          prefix: '',
        };
      }

      if (tok.kind === 'LIT') {
        const { value } = tok;
        // Check if the remaining input is a prefix of this literal
        const remaining = input.length - i;
        if (remaining < value.length) {
          // Partial literal match — input ran out inside a literal token
          if (input.slice(i) === value.slice(0, remaining)) {
            return {
              config: this.config,
              consumedParts,
              consumedLiterals,
              tokenIndex: t,
              nextToken: tok,
              inputConsumed: i,
              state: 'partial-literal',
              prefix: input.slice(i),
            };
          }
          return null; // mismatch
        }
        if (!input.startsWith(value, i)) return null;
        i += value.length;
        consumedLiterals++;
      } else {
        // PART: consume >= 1 char that is NOT a symbol
        const start = i;
        while (i < input.length && !syms.has(input[i]!)) i++;

        if (i === start) {
          // Input is at a symbol boundary with nothing consumed for PART.
          // This means input ends right where a PART is expected with an
          // empty prefix — valid predictive position.
          return {
            config: this.config,
            consumedParts,
            consumedLiterals,
            tokenIndex: t,
            nextToken: tok,
            inputConsumed: i,
            state: 'expects-part',
            prefix: '',
          };
        }

        const text = input.slice(start, i);
        consumedParts.push(text);

        // If input ended exactly here and there are more tokens, this is
        // a valid prefix: we consumed a PART and the next token tells us
        // what separator or literal must follow.
        if (i === input.length && t + 1 < this.tokens.length) {
          const nextTok = this.tokens[t + 1]!;
          return {
            config: this.config,
            consumedParts,
            consumedLiterals,
            tokenIndex: t + 1,
            nextToken: nextTok,
            inputConsumed: i,
            state: nextTok.kind === 'PART' ? 'expects-part' : 'expects-literal',
            prefix: '',
          };
        }
      }
    }

    // Full match (all tokens consumed, input fully consumed) — not a prefix,
    // it's a complete match. Return null to signal "not a prediction scenario".
    return i === input.length ? null : null;
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
      return new AttrSyntax(rawName, rawValue, target, command, null, null, config.pattern);
    }

    case "fixed": {
      // Fixed target and command (e.g., "ref" → target="element", command="ref")
      return new AttrSyntax(rawName, rawValue, interpret.target, interpret.command, null, null, config.pattern);
    }

    case "fixed-command": {
      // First part becomes target, command is fixed
      // Mode override is passed through if specified (e.g., `:PART` → mode="toView")
      const target = parts[0] ?? rawName;
      return new AttrSyntax(rawName, rawValue, target, interpret.command, null, interpret.mode ?? null, config.pattern);
    }

    case "mapped-fixed-command": {
      // First part becomes target (with optional mapping), command is fixed
      const part = parts[0] ?? "";
      const target = interpret.targetMap?.[part] ?? part;
      return new AttrSyntax(rawName, rawValue, target, interpret.command, null, null, config.pattern);
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
      return new AttrSyntax(rawName, rawValue, event, command, normalizedParts, null, config.pattern);
    }

    case "passthrough": {
      // Fixed target/command but preserve parts (useful for testing pattern matching)
      return new AttrSyntax(rawName, rawValue, interpret.target, interpret.command, parts, null, config.pattern);
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
  private readonly _cache = new Map<string, { pat: CompiledPattern; parts: readonly string[]; spans: readonly AttrPartSpan[] }>();
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
    return this.parseWithConfig(name, value).syntax;
  }

  parseWithConfig(
    name: string,
    value: string,
  ): { syntax: AttrSyntax; config: AttributePatternConfig | null; partSpans: readonly AttrPartSpan[] | null } {
    this._sealed = true;

    // Fast path: cached interpretation for this name
    const cached = this._cache.get(name);
    if (cached) {
      const { pat, parts } = cached;
      return {
        syntax: interpretConfig(pat.config, name, value, parts),
        config: pat.config,
        partSpans: cached.spans,
      };
    }

    // Try all patterns, keep the best match by score.
    let best: { pat: CompiledPattern; parts: string[]; spans: AttrPartSpan[] } | null = null;
    for (let i = 0; i < this._compiled.length; i++) {
      const pat = this._compiled[i]!;
      const match = pat.tryMatchWithSpans(name);
      if (!match) continue;

      if (!best) {
        best = { pat, parts: match.parts, spans: match.spans };
      } else {
        const a = pat.score, b = best.pat.score;
        if (
          a.statics > b.statics ||
          (a.statics === b.statics && (a.dynamics > b.dynamics ||
          (a.dynamics === b.dynamics && a.symbols > b.symbols)))
        ) {
          best = { pat, parts: match.parts, spans: match.spans };
        }
      }
    }

    if (!best) {
      // No pattern matched: identity (target === rawName, no command)
      return {
        syntax: new AttrSyntax(name, value, name, null, null),
        config: null,
        partSpans: null,
      };
    }

    this._cache.set(name, best);
    return {
      syntax: interpretConfig(best.pat.config, name, value, best.parts),
      config: best.pat.config,
      partSpans: best.spans,
    };
  }

  /**
   * Predictive completion: given a partial attribute name, determine what
   * completions could follow.
   *
   * Runs the predictive DFA on each registered pattern, collecting all
   * patterns that accept the input as a valid prefix. Returns the combined
   * predictions ordered by pattern score (same precedence as recognition).
   *
   * This is the completion counterpart to `parse`. Where `parse` maps a
   * complete attribute name to its semantic interpretation, `predictCompletions`
   * maps a partial attribute name to the set of valid continuations.
   */
  predictCompletions(partialName: string): readonly PredictiveMatchResult[] {
    this._sealed = true;
    const results: { result: PredictiveMatchResult; score: Score }[] = [];

    for (const pat of this._compiled) {
      const match = pat.tryPredictiveMatch(partialName);
      if (match) {
        results.push({ result: match, score: pat.score });
      }
    }

    // Sort by same precedence as recognition: statics > dynamics > symbols
    results.sort((a, b) => {
      const sa = a.score, sb = b.score;
      if (sa.statics !== sb.statics) return sb.statics - sa.statics;
      if (sa.dynamics !== sb.dynamics) return sb.dynamics - sa.dynamics;
      return sb.symbols - sa.symbols;
    });

    return results.map((r) => r.result);
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

export const DEFAULT_SYNTAX = createAttributeParserFromRegistry(
  buildTemplateSyntaxRegistry(BUILTIN_SEMANTICS),
);

/** Factory producing a parser preloaded from a TemplateSyntaxRegistry. */
export function createAttributeParserFromRegistry(registry: TemplateSyntaxRegistry): AttributeParser {
  const parser = new AttributeParser();
  parser.registerPatterns(registry.attributePatterns);
  return parser;
}

export function analyzeAttributeName(
  name: string,
  registry: TemplateSyntaxRegistry,
  parser?: AttributeParser,
): AttributeNameAnalysis {
  const attrParser = parser ?? createAttributeParserFromRegistry(registry);
  const { syntax, config, partSpans } = attrParser.parseWithConfig(name, "");
  const targetSpan = resolveTargetSpan(config, partSpans);
  const commandSpan = resolveCommandSpan(config, partSpans, syntax.command, name);
  return {
    syntax,
    pattern: config,
    partSpans,
    targetSpan,
    commandSpan,
  };
}

function resolveTargetSpan(
  config: AttributePatternConfig | null,
  partSpans: readonly AttrPartSpan[] | null,
): TextSpan | null {
  if (!config || !partSpans || partSpans.length === 0) return null;
  switch (config.interpret.kind) {
    case "target-command": {
      if (partSpans.length < 2) return null;
      return spanFromParts(partSpans, 0, partSpans.length - 2);
    }
    case "fixed-command":
    case "mapped-fixed-command":
    case "event-modifier":
      return spanFromParts(partSpans, 0, 0);
    case "fixed":
      return null;
  }
  return null;
}

function resolveCommandSpan(
  config: AttributePatternConfig | null,
  partSpans: readonly AttrPartSpan[] | null,
  command: string | null,
  rawName: string,
): AttrCommandSpan | null {
  if (!config || !command) return null;
  switch (config.interpret.kind) {
    case "target-command": {
      if (!partSpans || partSpans.length < 2) return null;
      const last = partSpans[partSpans.length - 1]!;
      return { start: last.start, end: last.end, kind: "text" };
    }
    case "fixed-command": {
      const symbol = leadingSymbol(config.pattern, config.symbols);
      if (symbol && rawName.startsWith(symbol)) {
        return { start: 0, end: symbol.length, kind: "symbol" };
      }
      return findCommandSpan(rawName, command, 0);
    }
    case "mapped-fixed-command": {
      const minIndex = partSpans?.[0]?.end ?? 0;
      return findCommandSpan(rawName, command, minIndex);
    }
    case "event-modifier": {
      if (config.interpret.injectCommand) {
        const symbol = leadingSymbol(config.pattern, config.symbols);
        if (symbol && rawName.startsWith(symbol)) {
          return { start: 0, end: symbol.length, kind: "symbol" };
        }
        return findCommandSpan(rawName, command, 0);
      }
      if (partSpans && partSpans.length > 1) {
        const first = partSpans[0];
        const last = partSpans[partSpans.length - 1];
        if (!first || !last) return findCommandSpan(rawName, command, 0);
        const start = first.end;
        const end = last.start;
        const idx = rawName.indexOf(command, start);
        if (idx >= 0 && idx + command.length <= end) {
          return { start: idx, end: idx + command.length, kind: "text" };
        }
      }
      return findCommandSpan(rawName, command, 0);
    }
    case "fixed":
      return findCommandSpan(rawName, command, 0);
  }
  return null;
}

function spanFromParts(parts: readonly AttrPartSpan[], startIndex: number, endIndex: number): TextSpan | null {
  if (startIndex < 0 || endIndex < startIndex || endIndex >= parts.length) return null;
  const start = parts[startIndex]!.start;
  const end = parts[endIndex]!.end;
  return { start, end };
}

function leadingSymbol(pattern: string, symbols: string): string | null {
  const partIndex = pattern.indexOf("PART");
  if (partIndex <= 0) return null;
  const prefix = pattern.slice(0, partIndex);
  if (!prefix) return null;
  if (symbols) {
    for (let i = 0; i < prefix.length; i += 1) {
      if (!symbols.includes(prefix[i]!)) return null;
    }
  }
  return prefix;
}

function findCommandSpan(rawName: string, command: string, minIndex: number): AttrCommandSpan | null {
  if (!command) return null;
  const idx = rawName.lastIndexOf(command);
  if (idx < minIndex) return null;
  return { start: idx, end: idx + command.length, kind: "text" };
}
