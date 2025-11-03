export interface AttributePatternDefinition<T extends string = string> {
  pattern: T;       // e.g. 'PART.PART', 'ref', '@PART:PART'
  symbols: string;  // characters considered "separators" for PART
}

/** Result of parsing an attribute name. */
export class AttrSyntax {
  constructor(
    public rawName: string,
    public rawValue: string,
    public target: string,              // e.g. 'value', 'click', 'element' (for 'ref'), 'component' (for 'view-model.ref')
    public command: string | null,      // e.g. 'bind' | 'to-view' | 'two-way' | 'trigger' | 'capture' | 'ref' | null
    public parts: readonly string[] | null = null, // optional extra info (event modifiers, etc.)
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
    public readonly def: AttributePatternDefinition,
    public readonly handler: (rawName: string, rawValue: string, parts: readonly string[]) => AttrSyntax,
  ) {
    const { tokens, score } = compilePattern(def.pattern, def.symbols);
    this.tokens = tokens;
    this.score = score;
    this.symbolSet = toSymbolSet(def.symbols);
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

/* ---------- Public registry ---------- */

export type AttributePatternHandler = (rawName: string, rawValue: string, parts: readonly string[]) => AttrSyntax;
export type IAttributePattern<T extends string = string> = Record<T, AttributePatternHandler>;

/**
 * AttributeParser: register patterns with handlers, then parse names.
 * - Deterministic precedence: more statics > more dynamics > more symbols.
 * - Caches successful matches by attribute name (value-independent).
 */
export class AttributeParser {
  private readonly _compiled: CompiledPattern[] = [];
  private readonly _byKey = new Map<string, CompiledPattern>();
  private readonly _cache = new Map<string, { pat: CompiledPattern; parts: readonly string[] }>();
  private _sealed = false;

  registerPattern(defs: AttributePatternDefinition[], impl: IAttributePattern): void {
    if (this._sealed) throw new Error('[syntax] AttributeParser already used; cannot add patterns after parse()');
    for (const def of defs) {
      if (this._byKey.has(def.pattern)) {
        throw new Error(`[syntax] Duplicate attribute pattern "${def.pattern}"`);
      }
      const handler = impl[def.pattern]!.bind(impl);
      const cp = new CompiledPattern(def, handler);
      this._compiled.push(cp);
      this._byKey.set(def.pattern, cp);
    }
  }

  parse(name: string, value: string): AttrSyntax {
    this._sealed = true;

    // Fast path: cached interpretation for this name
    const cached = this._cache.get(name);
    if (cached) {
      const { pat, parts } = cached;
      return pat.handler(name, value, parts);
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
    return best.pat.handler(name, value, best.parts);
  }
}

/* -------------------------------------------------------------------------------------------------
 * Dot-separated commands (".bind"/".to-view"/".two-way", etc.)
 *   - 'PART.PART'           e.g., "value.bind"         -> target: 'value',  command: 'bind'
 *   - 'PART.PART.PART'      e.g., "foo.bar.bind"       -> target: 'foo.bar', command: 'bind'
 * ------------------------------------------------------------------------------------------------ */

type DotKeys = 'PART.PART' | 'PART.PART.PART';

const DOT_DEFS: AttributePatternDefinition<DotKeys>[] = [
  { pattern: 'PART.PART', symbols: '.' },
  { pattern: 'PART.PART.PART', symbols: '.' },
];

const DOT_IMPL: IAttributePattern<DotKeys> = {
  'PART.PART': (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, parts[0]!, parts[1]!),
  'PART.PART.PART': (rawName, rawValue, parts) => new AttrSyntax(rawName, rawValue, `${parts[0]}.${parts[1]}`, parts[2]!),
};

/* -------------------------------------------------------------------------------------------------
 * Ref:
 *   - 'ref'                => element.ref
 *   - 'PART.ref'           e.g., "view-model.ref" -> component.ref (runtime parity)
 * ------------------------------------------------------------------------------------------------ */

type RefKeys = 'ref' | 'PART.ref';

const REF_DEFS: AttributePatternDefinition<RefKeys>[] = [
  { pattern: 'ref', symbols: '' },
  { pattern: 'PART.ref', symbols: '.' },
];

const REF_IMPL: IAttributePattern<RefKeys> = {
  ref: (rawName, rawValue) =>
    new AttrSyntax(rawName, rawValue, 'element', 'ref'),

  'PART.ref': (rawName, rawValue, parts) => {
    const part = parts[0] === 'view-model' ? 'component' : parts[0]!;
    return new AttrSyntax(rawName, rawValue, part, 'ref');
  },
};

/* -------------------------------------------------------------------------------------------------
 * Event (dot form):
 *   - 'PART.trigger:PART'  e.g., "click.trigger:once"  -> command 'trigger', parts = [event, modifier]
 *   - 'PART.capture:PART'  e.g., "click.capture:once"  -> command 'capture', parts = [event, modifier]
 *
 * NOTE: These parts mirror the runtime: handlers receive only PART captures.
 * ------------------------------------------------------------------------------------------------ */

type EventKeys = 'PART.trigger:PART' | 'PART.capture:PART';

const EVENT_DEFS: AttributePatternDefinition<EventKeys>[] = [
  { pattern: 'PART.trigger:PART', symbols: '.:' },
  { pattern: 'PART.capture:PART', symbols: '.:' },
];

const EVENT_IMPL: IAttributePattern<EventKeys> = {
  'PART.trigger:PART': (rawName, rawValue, parts) =>
    new AttrSyntax(rawName, rawValue, parts[0]!, 'trigger', parts),
  'PART.capture:PART': (rawName, rawValue, parts) =>
    new AttrSyntax(rawName, rawValue, parts[0]!, 'capture', parts),
};

/* -------------------------------------------------------------------------------------------------
 * Colon-prefixed bind:
 *   - ':PART'              e.g., ":class"              -> class.bind
 * ------------------------------------------------------------------------------------------------ */

type ColonKeys = ':PART';

const COLON_DEFS: AttributePatternDefinition<ColonKeys>[] = [
  { pattern: ':PART', symbols: ':' },
];

const COLON_IMPL: IAttributePattern<ColonKeys> = {
  ':PART': (rawName, rawValue, parts) =>
    new AttrSyntax(rawName, rawValue, parts[0]!, 'bind'),
};

/* -------------------------------------------------------------------------------------------------
 * At-prefixed trigger:
 *   - '@PART'              e.g., "@click"              -> click.trigger
 *   - '@PART:PART'         e.g., "@click:once"
 *
 * IMPORTANT SHAPE: For '@PART:PART' we intentionally pass parts as
 * [event, 'trigger', modifier] so downstream code can read parts?.[2]
 * (this matches runtime Trigger/Capture commands).
 * ------------------------------------------------------------------------------------------------ */

type AtKeys = '@PART' | '@PART:PART';

const AT_DEFS: AttributePatternDefinition<AtKeys>[] = [
  { pattern: '@PART', symbols: '@' },
  { pattern: '@PART:PART', symbols: '@:' },
];

const AT_IMPL: IAttributePattern<AtKeys> = {
  '@PART': (rawName, rawValue, parts) =>
    new AttrSyntax(rawName, rawValue, parts[0]!, 'trigger'),

  '@PART:PART': (rawName, rawValue, parts) =>
    // normalize to keep modifier at index 2, like the runtime
    new AttrSyntax(rawName, rawValue, parts[0]!, 'trigger', [parts[0]!, 'trigger', ...parts.slice(1)]),
};

/* -------------------------------------------------------------------------------------------------
 * Public helpers
 * ------------------------------------------------------------------------------------------------ */

/** Registers all built-in patterns into an existing parser (fluent). */
export function registerBuiltins(p: AttributeParser): AttributeParser {
  p.registerPattern(DOT_DEFS,   DOT_IMPL);
  p.registerPattern(REF_DEFS,   REF_IMPL);
  p.registerPattern(EVENT_DEFS, EVENT_IMPL);
  p.registerPattern(COLON_DEFS, COLON_IMPL);
  p.registerPattern(AT_DEFS,    AT_IMPL);
  return p;
}

/** Factory producing a parser preloaded with the built-in syntax. */
export function createDefaultSyntax(): AttributeParser {
  return registerBuiltins(new AttributeParser());
}

export const DEFAULT_SYNTAX = createDefaultSyntax();
