import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  AttributePatternDefinitionEntry,
} from '../resources/attribute-pattern-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { BindingCommandExecutableReference } from './binding-command-execution.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';
import {
  TemplateCompilerServiceKind,
  TemplateCompilerServiceReference,
  type TemplateBindableReference,
  type TemplateVisibleResource,
} from './compiler-world.js';

export const enum AttributeSyntaxKind {
  /** Attribute name did not match an Aurelia attribute pattern. */
  Plain = 'plain',
  /** Attribute name matched an Aurelia attribute pattern and was decomposed into parts. */
  Pattern = 'pattern',
  /** Attribute name is malformed, partial, or otherwise recovery-owned. */
  Open = 'open',
}

export const enum AttributeClassificationKind {
  /** Attribute stays a platform/plain attribute until later lowering proves otherwise. */
  Plain = 'plain',
  /** Attribute targets a bindable on a custom element or custom attribute. */
  Bindable = 'bindable',
  /** Attribute names a visible custom attribute. */
  CustomAttribute = 'custom-attribute',
  /** Attribute names a visible template controller. */
  TemplateController = 'template-controller',
  /** Attribute is controlled by a binding command. */
  BindingCommand = 'binding-command',
  /** Attribute is captured and forwarded through a custom element capture definition. */
  Captured = 'captured',
  /** Attribute controls compiler behavior directly rather than producing a runtime binding. */
  CompilerControl = 'compiler-control',
  /** Attribute participates in ref lowering. */
  Ref = 'ref',
  /** Attribute participates in spread lowering. */
  Spread = 'spread',
  /** Classification remains open for recovery, completion, or missing resource scope. */
  Open = 'open',
}

export const enum AttributePatternExecutionKind {
  /** Runtime built-in pattern handler whose behavior can be modeled directly. */
  BuiltIn = 'built-in',
  /** Future user-defined pattern handler with a known target; not dynamically executed by the current compiler world. */
  Custom = 'custom',
  /** Pattern handler exists but its behavior must be preserved as an open execution seam. */
  Opaque = 'opaque',
  /** Pattern handler lookup or definition is unresolved. */
  Open = 'open',
}

export const enum AttributePatternTokenKind {
  /** Dynamic PART segment in an Aurelia attribute pattern. */
  Part = 'part',
  /** Literal segment in an Aurelia attribute pattern. */
  Literal = 'literal',
}

export type AttributeSyntaxField =
  | 'rawName'
  | 'rawValue'
  | 'target'
  | 'command'
  | 'parts'
  | 'pattern'
  | 'source';

export type AttributePatternExecutableField =
  | 'definition'
  | 'target'
  | 'patterns'
  | 'executionKind'
  | 'source';

export type AttributeParserServiceField =
  | 'patterns'
  | 'machine'
  | 'source';

export type AttributeParserMachineField =
  | 'compiledPatterns'
  | 'cache'
  | 'source';

export type AttributeClassificationField =
  | 'syntax'
  | 'classificationKind'
  | 'resource'
  | 'bindingCommand'
  | 'bindable'
  | 'instructions'
  | 'source';

/** Runtime compiled pattern score used to choose the best matching attribute pattern. */
export class AttributePatternScore {
  constructor(
    /** Count of static non-symbol literal segments. */
    readonly statics: number,
    /** Count of dynamic PART segments. */
    readonly dynamics: number,
    /** Count of symbol literal segments. */
    readonly symbols: number,
  ) {}
}

/** Runtime token produced by compiling one AttributePatternDefinition entry. */
export class AttributePatternToken {
  constructor(
    /** Token kind produced by compilePattern. */
    readonly tokenKind: AttributePatternTokenKind,
    /** Literal value for literal tokens; null for dynamic PART tokens. */
    readonly value: string | null,
  ) {}
}

export function compileAttributePatternDefinition(
  definition: AttributePatternDefinitionEntry,
): {
  readonly tokens: readonly AttributePatternToken[];
  readonly score: AttributePatternScore;
  readonly symbols: readonly string[];
} {
  const tokens: AttributePatternToken[] = [];
  const symbolSet = new Set(definition.symbols.split(''));
  let statics = 0;
  let dynamics = 0;
  let symbols = 0;

  let i = 0;
  while (i < definition.pattern.length) {
    if (definition.pattern.startsWith('PART', i)) {
      tokens.push(new AttributePatternToken(AttributePatternTokenKind.Part, null));
      dynamics++;
      i += 4;
      continue;
    }

    const runStart = i;
    while (i < definition.pattern.length && !definition.pattern.startsWith('PART', i)) {
      i++;
    }
    const run = definition.pattern.slice(runStart, i);

    let j = 0;
    while (j < run.length) {
      const isSymbol = symbolSet.has(run[j]!);
      let k = j + 1;
      while (k < run.length && symbolSet.has(run[k]!) === isSymbol) {
        k++;
      }
      tokens.push(new AttributePatternToken(AttributePatternTokenKind.Literal, run.slice(j, k)));
      if (isSymbol) {
        symbols++;
      } else {
        statics++;
      }
      j = k;
    }
  }

  return {
    tokens,
    score: new AttributePatternScore(statics, dynamics, symbols),
    symbols: [...symbolSet],
  };
}

export function isBetterAttributePatternScore(
  candidate: AttributePatternScore,
  current: AttributePatternScore,
): boolean {
  if (candidate.statics !== current.statics) {
    return candidate.statics > current.statics;
  }
  if (candidate.dynamics !== current.dynamics) {
    return candidate.dynamics > current.dynamics;
  }
  return candidate.symbols > current.symbols;
}

/** Runtime CompiledPattern model used by SyntaxInterpreter. */
@auLink('template-compiler:CompiledPattern')
export class CompiledAttributePattern {
  constructor(
    /** Product handle for the materialized-product envelope that represents this compiled pattern. */
    readonly productHandle: ProductHandle,
    /** Identity for this compiled pattern model. */
    readonly identityHandle: IdentityHandle,
    /** Source pattern definition entry that was compiled. */
    readonly definition: AttributePatternDefinitionEntry,
    /** Tokens produced by the runtime compilePattern algorithm. */
    readonly tokens: readonly AttributePatternToken[],
    /** Runtime score used for best-match selection. */
    readonly score: AttributePatternScore,
    /** Symbol set used to split dynamic parts. */
    readonly symbols: readonly string[],
    /** Attribute-pattern executable that owns the handler for this pattern. */
    readonly executableProductHandle: ProductHandle | null,
    /** Source address for the pattern definition or registration. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  tryMatch(input: string): readonly string[] | null {
    const parts: string[] = [];
    const symbolSet = new Set(this.symbols);
    let pos = 0;
    let currentPart = '';

    for (const token of this.tokens) {
      if (token.tokenKind === AttributePatternTokenKind.Literal) {
        const value = token.value ?? '';
        if (!input.startsWith(value, pos)) {
          return null;
        }

        for (const ch of value) {
          if (symbolSet.has(ch)) {
            if (currentPart.length > 0) {
              parts.push(currentPart);
              currentPart = '';
            }
          } else {
            currentPart += ch;
          }
        }
        pos += value.length;
      } else {
        const start = pos;
        while (pos < input.length && !symbolSet.has(input[pos]!)) {
          pos++;
        }
        if (pos === start) {
          return null;
        }
        currentPart += input.slice(start, pos);
      }
    }

    if (currentPart.length > 0) {
      parts.push(currentPart);
    }
    return pos === input.length ? parts : null;
  }
}

/** Cached result of interpreting one raw attribute name. */
export class AttributePatternInterpretation {
  constructor(
    /** Raw attribute name used as the cache key. */
    readonly rawName: string,
    /** Matched pattern string, or null when the name stays plain. */
    readonly pattern: string | null,
    /** Extracted dynamic parts from the matched pattern. */
    readonly parts: readonly string[],
    /** Compiled pattern product that won the match, when any pattern matched. */
    readonly compiledPatternProductHandle: ProductHandle | null,
  ) {}
}

export function interpretCompiledAttributePatterns(
  rawName: string,
  compiledPatterns: readonly CompiledAttributePattern[],
): AttributePatternInterpretation {
  let bestPattern: CompiledAttributePattern | null = null;
  let bestParts: readonly string[] | null = null;

  for (const pattern of compiledPatterns) {
    const parts = pattern.tryMatch(rawName);
    if (parts == null) {
      continue;
    }

    if (bestPattern == null || isBetterAttributePatternScore(pattern.score, bestPattern.score)) {
      bestPattern = pattern;
      bestParts = parts;
    }
  }

  return bestPattern == null
    ? new AttributePatternInterpretation(rawName, null, [], null)
    : new AttributePatternInterpretation(
      rawName,
      bestPattern.definition.pattern,
      bestParts ?? [],
      bestPattern.productHandle,
    );
}

/**
 * Hydrated result of invoking an attribute-pattern handler method.
 *
 * Runtime returns AttrSyntax here. The product model below allocates identity and provenance later, after a parser
 * materializer knows the owning HTML attribute, matched compiled pattern, and inquiry mode.
 */
export class AttributePatternExecutionResult {
  constructor(
    /** Whether the handler produced plain, patterned, or recovery-owned syntax. */
    readonly syntaxKind: AttributeSyntaxKind,
    /** Raw authored attribute name. */
    readonly rawName: string,
    /** Raw authored attribute value. */
    readonly rawValue: string,
    /** Attribute parser target part. */
    readonly target: string,
    /** Binding command part, if any. */
    readonly command: string | null,
    /** Runtime pattern parts preserved in handler order. */
    readonly parts: readonly string[] = [],
  ) {}

  static plain(rawName: string, rawValue: string): AttributePatternExecutionResult {
    return new AttributePatternExecutionResult(
      AttributeSyntaxKind.Plain,
      rawName,
      rawValue,
      rawName,
      null,
      [],
    );
  }

  static pattern(
    rawName: string,
    rawValue: string,
    target: string,
    command: string | null,
    parts: readonly string[] = [],
  ): AttributePatternExecutionResult {
    return new AttributePatternExecutionResult(
      AttributeSyntaxKind.Pattern,
      rawName,
      rawValue,
      target,
      command,
      parts,
    );
  }
}

/** Matched runtime compiled pattern plus its executable handler product, when visible. */
export class AttributeParserMatchedPattern {
  constructor(
    /** Compiled pattern selected by SyntaxInterpreter. */
    readonly compiledPattern: CompiledAttributePattern,
    /** Pattern handler visible through the parser service. */
    readonly executable: AttributePatternExecutable | null,
  ) {}

  get pattern(): AttributePatternDefinitionEntry {
    return this.compiledPattern.definition;
  }

  get executableProductHandle(): ProductHandle | null {
    return this.compiledPattern.executableProductHandle ?? this.executable?.productHandle ?? null;
  }
}

/** Host input for executing the handler part of runtime IAttributeParser.parse. */
export class AttributeParserHandlerExecutionInput {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly interpretation: AttributePatternInterpretation,
    readonly matchedPattern: AttributeParserMatchedPattern,
  ) {}
}

/** Product host that performs the handler invocation part of runtime IAttributeParser.parse. */
export interface AttributeParserExecutionHost {
  execute(input: AttributeParserHandlerExecutionInput): AttributePatternExecutionResult | null;
}

/** Runtime-shaped IAttributeParser.parse result before kernel product allocation. */
export class AttributeParserParseResult {
  constructor(
    /** Name interpretation produced by SyntaxInterpreter, or null when the parser machine is unavailable. */
    readonly interpretation: AttributePatternInterpretation | null,
    /** Matched compiled pattern and executable, when the name selected a pattern. */
    readonly matchedPattern: AttributeParserMatchedPattern | null,
    /** AttrSyntax-like execution result produced by the selected branch. */
    readonly execution: AttributePatternExecutionResult,
  ) {}

  get pattern(): AttributePatternDefinitionEntry | null {
    return this.matchedPattern?.pattern ?? null;
  }

  get executableProductHandle(): ProductHandle | null {
    return this.matchedPattern?.executableProductHandle ?? null;
  }
}

/** Runtime SyntaxInterpreter model that turns registered pattern definitions into an attribute-name matcher. */
@auLink('template-compiler:SyntaxInterpreter')
export class AttributeParserMachine {
  private readonly _cache = new Map<string, AttributePatternInterpretation>();
  private readonly _compiledPatterns: CompiledAttributePattern[] = [];

  constructor(
    /** Product handle for the materialized-product envelope that represents this parser machine. */
    readonly productHandle: ProductHandle,
    /** Identity for this parser machine model. */
    readonly identityHandle: IdentityHandle,
    /** Compiled patterns in the order registered with the parser. */
    compiledPatterns: readonly CompiledAttributePattern[],
    /** Cached interpretations for already-seen raw names. */
    cachedInterpretations: readonly AttributePatternInterpretation[],
    /** Source address for the parser machine owner or registration boundary. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AttributeParserMachineField>[] = [],
  ) {
    this._compiledPatterns.push(...compiledPatterns);
    for (const interpretation of cachedInterpretations) {
      this._cache.set(interpretation.rawName, interpretation);
    }
  }

  /** Compiled patterns in runtime registration order. */
  get compiledPatterns(): readonly CompiledAttributePattern[] {
    return [...this._compiledPatterns];
  }

  /** Product handles for the compiled patterns in runtime registration order. */
  get compiledPatternProductHandles(): readonly ProductHandle[] {
    return this._compiledPatterns.map((pattern) => pattern.productHandle);
  }

  /** Cached interpretations for already-seen raw names. */
  get cachedInterpretations(): readonly AttributePatternInterpretation[] {
    return this.readCachedInterpretations();
  }

  /** Runtime `SyntaxInterpreter.interpret(name)` shape with live cache behavior. */
  interpret(rawName: string): AttributePatternInterpretation {
    const cached = this._cache.get(rawName);
    if (cached != null) {
      return cached;
    }
    const interpretation = interpretCompiledAttributePatterns(rawName, this._compiledPatterns);
    this._cache.set(rawName, interpretation);
    return interpretation;
  }

  /** Runtime SyntaxInterpreter registration shape used by IAttributeParser.registerPattern. */
  registerPatterns(compiledPatterns: readonly CompiledAttributePattern[]): void {
    this._compiledPatterns.push(...compiledPatterns);
    this._cache.clear();
  }

  /** Snapshot the current live interpretation cache for answer envelopes or later kernel emission. */
  readCachedInterpretations(): readonly AttributePatternInterpretation[] {
    return [...this._cache.values()];
  }
}

/**
 * Runtime AttrSyntax shape after IAttributeParser has interpreted the raw attribute name.
 *
 * This is still authored syntax. It should not silently perform resource lookup, bindable selection, expression
 * parsing, or instruction lowering.
 */
@auLink('template-compiler:AttrSyntax')
export class AttributeSyntax {
  constructor(
    /** Product handle for the materialized-product envelope that represents this syntax record. */
    readonly productHandle: ProductHandle,
    /** Identity for this authored attribute syntax. */
    readonly identityHandle: IdentityHandle,
    /** Whether the parser produced plain syntax, pattern syntax, or an open recovery syntax. */
    readonly syntaxKind: AttributeSyntaxKind,
    /** Raw authored attribute name. */
    readonly rawName: string,
    /** Raw authored attribute value, before expression parsing. */
    readonly rawValue: string,
    /** Attribute parser target part such as `value` in `value.bind`. */
    readonly target: string,
    /** Binding command part such as `bind` in `value.bind`, if present. */
    readonly command: string | null,
    /** Additional pattern parts in runtime order. */
    readonly parts: readonly string[],
    /** Attribute pattern definition entry that matched this syntax, when known. */
    readonly pattern: AttributePatternDefinitionEntry | null,
    /** Source attribute reference that produced this syntax. */
    readonly attribute: HtmlAttributeReference,
    /** Source address for the full attribute syntax. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AttributeSyntaxField>[] = [],
  ) {}
}

/** Executable attribute-pattern handler visible to IAttributeParser. */
@auLink('template-compiler:IAttributePattern')
export class AttributePatternExecutable {
  constructor(
    /** Product handle for the materialized-product envelope that represents this handler. */
    readonly productHandle: ProductHandle,
    /** Identity for this handler model. */
    readonly identityHandle: IdentityHandle,
    /** Definition product that registered the pattern entries. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Type, object, or function target that implements the handler. */
    readonly target: ResourceTargetReference | null,
    /** Pattern entries registered by this handler. */
    readonly patterns: readonly AttributePatternDefinitionEntry[],
    /** How much of the handler execution is known to this substrate. */
    readonly executionKind: AttributePatternExecutionKind,
    /** Source address for the handler definition or registration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AttributePatternExecutableField>[] = [],
  ) {}
}

/** Runtime IAttributeParser model, including the pattern handlers visible through DI. */
@auLink('template-compiler:IAttributeParser')
export class AttributeParserService {
  private readonly _patternExecutables: AttributePatternExecutable[] = [];

  constructor(
    /** Product handle for the materialized-product envelope that represents this parser service. */
    readonly productHandle: ProductHandle,
    /** Identity for this parser service model. */
    readonly identityHandle: IdentityHandle,
    /** Pattern handlers visible to this parser service. */
    patternExecutables: readonly AttributePatternExecutable[],
    /** Compiled SyntaxInterpreter machine visible to this parser service. */
    readonly machine: AttributeParserMachine | null,
    /** Source address for the parser service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AttributeParserServiceField>[] = [],
  ) {
    this._patternExecutables.push(...patternExecutables);
  }

  /** Pattern handlers visible to this parser service. */
  get patternExecutables(): readonly AttributePatternExecutable[] {
    return [...this._patternExecutables];
  }

  /** Product handles for pattern handlers visible through this parser service. */
  get patternExecutableProductHandles(): readonly ProductHandle[] {
    return this._patternExecutables.map((pattern) => pattern.productHandle);
  }

  /** Product handle for the compiled SyntaxInterpreter machine, when materialized. */
  get machineProductHandle(): ProductHandle | null {
    return this.machine?.productHandle ?? null;
  }

  /** Interpret a raw attribute name through the visible SyntaxInterpreter machine. */
  interpret(rawName: string): AttributePatternInterpretation | null {
    return this.machine?.interpret(rawName) ?? null;
  }

  /** Runtime `IAttributeParser.registerPattern(patterns, Type)` shape over materialized pattern products. */
  registerPattern(
    executable: AttributePatternExecutable,
    compiledPatterns: readonly CompiledAttributePattern[],
  ): void {
    if (!this._patternExecutables.some((pattern) => pattern.productHandle === executable.productHandle)) {
      this._patternExecutables.push(executable);
    }
    this.machine?.registerPatterns(compiledPatterns);
  }

  /** Runtime `IAttributeParser.parse(name, value)` shape with handler execution delegated to a product host. */
  parse(
    rawName: string,
    rawValue: string,
    host: AttributeParserExecutionHost,
  ): AttributeParserParseResult {
    const interpretation = this.interpret(rawName);
    if (interpretation == null) {
      return new AttributeParserParseResult(
        null,
        null,
        new AttributePatternExecutionResult(
          AttributeSyntaxKind.Open,
          rawName,
          rawValue,
          rawName,
          null,
          [],
        ),
      );
    }
    if (interpretation.compiledPatternProductHandle == null) {
      return new AttributeParserParseResult(
        interpretation,
        null,
        AttributePatternExecutionResult.plain(rawName, rawValue),
      );
    }

    const matchedPattern = this.matchPattern(interpretation.compiledPatternProductHandle);
    if (matchedPattern == null || matchedPattern.executableProductHandle == null) {
      return new AttributeParserParseResult(
        interpretation,
        matchedPattern,
        this.openExecution(rawName, rawValue, interpretation.parts),
      );
    }

    const execution = host.execute(new AttributeParserHandlerExecutionInput(
      rawName,
      rawValue,
      interpretation,
      matchedPattern,
    ));
    return new AttributeParserParseResult(
      interpretation,
      matchedPattern,
      execution ?? this.openExecution(rawName, rawValue, interpretation.parts),
    );
  }

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.AttributeParser,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }

  private matchPattern(compiledPatternProductHandle: ProductHandle): AttributeParserMatchedPattern | null {
    const compiledPattern = this.machine?.compiledPatterns.find((pattern) => pattern.productHandle === compiledPatternProductHandle) ?? null;
    if (compiledPattern == null) {
      return null;
    }
    const executable = compiledPattern.executableProductHandle == null
      ? null
      : this._patternExecutables.find((pattern) => pattern.productHandle === compiledPattern.executableProductHandle) ?? null;
    return new AttributeParserMatchedPattern(compiledPattern, executable);
  }

  private openExecution(
    rawName: string,
    rawValue: string,
    parts: readonly string[],
  ): AttributePatternExecutionResult {
    return new AttributePatternExecutionResult(
      AttributeSyntaxKind.Open,
      rawName,
      rawValue,
      rawName,
      null,
      parts,
    );
  }
}

/**
 * Attribute classification after syntax parsing and resource/bindable lookup.
 *
 * This is the last layer before binding-command execution and instruction lowering. It intentionally preserves the
 * visible resource and bindable references rather than collapsing directly into instructions.
 */
export class AttributeClassification {
  constructor(
    /** Product handle for the materialized-product envelope that represents this classification. */
    readonly productHandle: ProductHandle,
    /** Identity for this classification product. */
    readonly identityHandle: IdentityHandle,
    /** Parsed attribute syntax being classified. */
    readonly syntaxProductHandle: ProductHandle,
    /** HTML element or template node that owns the attribute. */
    readonly ownerNode: HtmlNodeReference,
    /** Classification lane selected by lookup/lowering. */
    readonly classificationKind: AttributeClassificationKind,
    /** Resource kind selected by classification, when a resource is involved. */
    readonly resourceKind: ResourceDefinitionKind | null,
    /** Visible resource that matched the attribute, if any. */
    readonly resource: TemplateVisibleResource | null,
    /** Binding command selected by the attribute syntax, if any. */
    readonly bindingCommand: BindingCommandExecutableReference | null,
    /** Bindable selected by classification, if any. */
    readonly bindable: TemplateBindableReference | null,
    /** Instruction products produced downstream from this classification. */
    readonly instructionProductHandles: readonly ProductHandle[],
    /** Source address for the classification site. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AttributeClassificationField>[] = [],
  ) {}
}
