import type {
  AttributePatternDefinition,
  BindingCommandDefinition,
  ResourceDefinition,
  CustomAttributeDefinition,
  CustomElementDefinition,
  ResourceDefinitionKind,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { ContainerStateEntry, ContainerStateOpenSeam } from '../registrations/index.js';
import type {
  ContainerWorldRef,
  KeyRef,
  ResourceReferenceRef,
} from '../refs.js';
import type { AdmittedSubject } from '../admissions/index.js';
import type { ConfigurationContribution } from '../configurations/index.js';
import type {
  CompilerCapability,
  TemplateCompilerHookCapability,
} from './compiler-capability.js';
import {
  CompilerAttributeBindableInfoEntry,
  CompilerAttributeBindablesInfo,
  CompilerAttributeBindablesInfoOpenSeam,
  CompilerAttributePrimaryBindableProvenance,
} from './custom-attribute-bindables-info.js';
import {
  CompilerAttributeSyntax,
  CompilerAttributeSyntaxProvenance,
} from './compiler-attribute-syntax.js';
import {
  CompilerAttributeHandlerMaterializer,
  type CompilerAttributeHandlerResult,
} from './compiler-attribute-handler-materializer.js';
import { CompilerValueParser } from './compiler-value-parser.js';

export const COMPILER_WORLD_OPEN_SEAM_KINDS = [
  'resource-resolution-open',
  'service-access-open',
  'attribute-pattern-handler-open',
  'owner-local-branch-open',
] as const;

export type CompilerWorldOpenSeamKind =
  typeof COMPILER_WORLD_OPEN_SEAM_KINDS[number];

export class CompilerWorldOpenSeam {
  constructor(
    readonly kind: CompilerWorldOpenSeamKind,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerResourceAdmissionProvenance {
  constructor(
    readonly definition: ResourceDefinition,
    readonly ownerContributions: readonly ConfigurationContribution[] = [],
    readonly admittedSubjects: readonly AdmittedSubject[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributePatternMatch {
  constructor(
    readonly definition: AttributePatternDefinition,
    readonly parts: readonly string[],
    readonly score: PatternScore,
    readonly declarationIndex: number,
    readonly admission: CompilerResourceAdmissionProvenance | null = null,
  ) {}
}

export const COMPILER_ATTRIBUTE_PARSE_CANDIDATE_STATUS_KINDS = [
  'selected',
  'fallback',
  'open-handler',
  'ambiguous',
] as const;

export type CompilerAttributeParseCandidateStatusKind =
  typeof COMPILER_ATTRIBUTE_PARSE_CANDIDATE_STATUS_KINDS[number];

export class CompilerAttributeParseCandidate {
  constructor(
    readonly id: string,
    readonly status: CompilerAttributeParseCandidateStatusKind,
    readonly match: CompilerAttributePatternMatch | null,
    readonly syntax: CompilerAttributeSyntax | null,
    readonly note: string | null = null,
  ) {}
}

export const COMPILER_ATTRIBUTE_PARSE_RESULT_STATUS_KINDS = [
  'selected',
  'fallback',
  'ambiguous',
  'handler-open',
] as const;

export type CompilerAttributeParseResultStatusKind =
  typeof COMPILER_ATTRIBUTE_PARSE_RESULT_STATUS_KINDS[number];

export class CompilerAttributeParseResult {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly status: CompilerAttributeParseResultStatusKind,
    readonly selected: CompilerAttributeParseCandidate | null,
    readonly candidates: readonly CompilerAttributeParseCandidate[] = [],
    readonly note: string | null = null,
  ) {}

  get matchedPattern(): CompilerAttributePatternMatch | null {
    return this.selected?.match ?? null;
  }

  get syntax(): CompilerAttributeSyntax | null {
    return this.selected?.syntax ?? null;
  }
}

export class CompilerResourceResolver {
  private readonly byKind = new Map<ResourceDefinitionKind, readonly ResourceDefinition[]>();
  private readonly admissionsById = new Map<string, CompilerResourceAdmissionProvenance>();
  private readonly attributeBindablesInfoById = new Map<string, CompilerAttributeBindablesInfo>();

  constructor(
    readonly world: ContainerWorldRef,
    readonly resources: readonly ResourceDefinition[],
    admissions: readonly CompilerResourceAdmissionProvenance[] = [],
  ) {
    for (const current of admissions) {
      this.admissionsById.set(current.definition.id, current);
    }
  }

  readByKind<TKind extends ResourceDefinitionKind>(
    kind: TKind,
  ): readonly Extract<ResourceDefinition, { kind: TKind }>[] {
    const cached = this.byKind.get(kind);
    if (cached != null) {
      return cached as readonly Extract<ResourceDefinition, { kind: TKind }>[];
    }

    const filtered = this.resources.filter(
      (current): current is Extract<ResourceDefinition, { kind: TKind }> => current.kind === kind,
    );
    this.byKind.set(kind, filtered);
    return filtered;
  }

  findElement(
    name: string,
  ): CustomElementDefinition | null {
    return this.readByKind('custom-element').find((current) =>
      current.name === name || current.aliases.includes(name),
    ) ?? null;
  }

  // Template controllers live on the custom-attribute lane in Aurelia's
  // compiler resource resolver, so this access surface deliberately returns
  // both custom attributes and template controllers through one method.
  findAttribute(
    name: string,
  ): CustomAttributeDefinition | TemplateControllerDefinition | null {
    return this.readByKind('custom-attribute').find((current) =>
      current.name === name || current.aliases.includes(name),
    ) ?? this.readByKind('template-controller').find((current) =>
      current.name === name || current.aliases.includes(name),
    ) ?? null;
  }

  findTemplateController(
    name: string,
  ): TemplateControllerDefinition | null {
    return this.readByKind('template-controller').find((current) =>
      current.name === name || current.aliases.includes(name),
    ) ?? null;
  }

  findResourceDefinition(
    kind: ResourceDefinitionKind,
    name: string,
  ): ResourceDefinition | null {
    switch (kind) {
      case 'custom-element':
        return this.findElement(name);
      case 'custom-attribute':
        return this.readByKind('custom-attribute').find((current) =>
          current.name === name || current.aliases.includes(name),
        ) ?? null;
      case 'template-controller':
        return this.findTemplateController(name);
      case 'binding-behavior':
      case 'binding-command':
      case 'value-converter':
        return this.readByKind(kind).find((current) =>
          current.name === name || current.aliases.includes(name),
        ) ?? null;
      case 'attribute-pattern':
        return this.readByKind('attribute-pattern').find((current) =>
          current.pattern === name || current.symbols.includes(name),
        ) ?? null;
      default:
        return null;
    }
  }

  resolveReference(
    reference: ResourceReferenceRef,
  ): ResourceDefinition | null {
    if (reference.key != null) {
      const byKey = this.resources.find((current) => current.key?.id === reference.key?.id);
      if (byKey != null) {
        return byKey;
      }
    }

    if (reference.name == null) {
      return null;
    }

    switch (reference.resourceKind) {
      case 'custom-element':
        return this.findElement(reference.name);
      case 'custom-attribute':
      case 'template-controller':
        return this.findAttribute(reference.name);
      case 'binding-behavior':
      case 'binding-command':
      case 'value-converter':
        return this.findResourceDefinition(reference.resourceKind, reference.name);
      default:
        return null;
    }
  }

  readAdmission(
    definition: ResourceDefinition,
  ): CompilerResourceAdmissionProvenance | null {
    return this.admissionsById.get(definition.id) ?? null;
  }

  // NOTE: runtime compiler lowers CA/TC bindables through ResourceResolver.bindables(def),
  // not directly from raw definition support. The clean-room keeps that as an
  // explicit intermediate so authored vs synthesized primary bindables can be
  // traced instead of silently collapsed away.
  bindables(
    definition: CustomAttributeDefinition | TemplateControllerDefinition,
  ): CompilerAttributeBindablesInfo {
    const cached = this.attributeBindablesInfoById.get(definition.id);
    if (cached != null) {
      return cached;
    }

    const defaultPropertyName = definition.defaultProperty ?? 'value';
    const defaultPropertyProvenance = definition.policy.readProvenance('default-property');
    const openSeams: CompilerAttributeBindablesInfoOpenSeam[] = [];
    const entries: CompilerAttributeBindableInfoEntry[] = [];

    for (const current of definition.bindableSurface.entries) {
      const resolvedName = current.name ?? current.attribute;
      if (resolvedName == null) {
        openSeams.push(new CompilerAttributeBindablesInfoOpenSeam(
          'authored-bindable-name-open',
          `Bindable entry on ${definition.name ?? '(anonymous attribute resource)'} did not close a usable name or attribute.`,
        ));
        continue;
      }

      const resolvedAttribute = current.attribute ?? current.name ?? resolvedName;
      entries.push(new CompilerAttributeBindableInfoEntry(
        resolvedName,
        resolvedAttribute,
        'authored-entry',
        current,
        current.attribute == null && current.name != null
          ? 'Attribute name fell back to the bindable name because no explicit attribute alias was authored.'
          : null,
      ));
    }

    let primary = entries.find((current) =>
      current.name === defaultPropertyName || current.attribute === defaultPropertyName,
    ) ?? null;
    let primaryProvenance: CompilerAttributePrimaryBindableProvenance;

    if (primary != null) {
      primaryProvenance = new CompilerAttributePrimaryBindableProvenance(
        'selected-authored',
        primary,
        defaultPropertyName,
        defaultPropertyProvenance,
        'Primary bindable closed from an authored bindable entry selected against runtime default-property law.',
      );
    } else if (defaultPropertyName != null) {
      primary = new CompilerAttributeBindableInfoEntry(
        defaultPropertyName,
        defaultPropertyName,
        'synthesized-default-property',
        null,
        definition.defaultProperty == null
          ? 'Primary bindable was synthesized from runtime default defaultProperty = "value" because the support bundle did not close one explicitly.'
          : 'Primary bindable was synthesized from explicit defaultProperty because no authored bindable entry matched it.',
      );
      entries.push(primary);
      primaryProvenance = new CompilerAttributePrimaryBindableProvenance(
        'synthesized-default-property',
        primary,
        defaultPropertyName,
        defaultPropertyProvenance,
        'Primary bindable was synthesized to mirror runtime ResourceResolver.bindables(def) behavior while keeping the synthesis explicit for tooling.',
      );
    } else {
      openSeams.push(new CompilerAttributeBindablesInfoOpenSeam(
        'default-property-selection-open',
        'Neither explicit nor runtime-default defaultProperty closed to a usable primary bindable name.',
      ));
      primaryProvenance = new CompilerAttributePrimaryBindableProvenance(
        'open',
        null,
        null,
        defaultPropertyProvenance,
        'Primary bindable stayed open because default-property selection did not close.',
      );
    }

    const info = new CompilerAttributeBindablesInfo(
      definition,
      entries,
      primary,
      primaryProvenance,
      openSeams,
      'Compiler-facing CA/TC bindables info over authored support plus explicit runtime-parity synthesis for primary/default-property resolution.',
    );
    this.attributeBindablesInfoById.set(definition.id, info);
    return info;
  }

  readAdmissions(): readonly CompilerResourceAdmissionProvenance[] {
    return [...this.admissionsById.values()];
  }
}

export class CompilerBindingCommandResolver {
  private readonly byName = new Map<string, BindingCommandDefinition>();

  constructor(
    readonly commands: readonly BindingCommandDefinition[],
    private readonly readAdmissionValue: ((definition: BindingCommandDefinition) => CompilerResourceAdmissionProvenance | null) = () => null,
  ) {
    for (const current of commands) {
      if (current.name != null) {
        this.byName.set(current.name, current);
      }
      for (const alias of current.aliases) {
        this.byName.set(alias, current);
      }
    }
  }

  get(
    name: string,
  ): BindingCommandDefinition | null {
    return this.byName.get(name) ?? null;
  }

  readAll(): readonly BindingCommandDefinition[] {
    return [...this.commands];
  }

  readAdmission(
    definition: BindingCommandDefinition,
  ): CompilerResourceAdmissionProvenance | null {
    return this.readAdmissionValue(definition);
  }
}

export class CompilerAttributeParser {
  private readonly compiledPatterns: readonly CompiledPattern[];
  private readonly handlerMaterializer = new CompilerAttributeHandlerMaterializer();

  constructor(
    readonly patterns: readonly AttributePatternDefinition[],
    private readonly readAdmissionValue: ((definition: AttributePatternDefinition) => CompilerResourceAdmissionProvenance | null) = () => null,
  ) {
    this.compiledPatterns = patterns.map((current, index) => new CompiledPattern(current, index));
  }

  readAll(): readonly AttributePatternDefinition[] {
    return [...this.patterns];
  }

  match(
    rawName: string,
  ): CompilerAttributePatternMatch | null {
    return this.matchAll(rawName)[0] ?? null;
  }

  matchAll(
    rawName: string,
  ): readonly CompilerAttributePatternMatch[] {
    const matches: CompilerAttributePatternMatch[] = [];

    for (const current of this.compiledPatterns) {
      const parts = current.tryMatch(rawName);
      if (parts == null) {
        continue;
      }

      matches.push(new CompilerAttributePatternMatch(
        current.definition,
        parts,
        current.score,
        current.declarationIndex,
        this.readAdmissionValue(current.definition),
      ));
    }

    return matches.sort(compareMatches);
  }

  parse(
    rawName: string,
    rawValue: string,
  ): CompilerAttributeParseResult {
    const matches = this.matchAll(rawName);
    if (matches.length === 0) {
      const syntax = new CompilerAttributeSyntax(
        rawName,
        rawValue,
        rawName,
        null,
        null,
        new CompilerAttributeSyntaxProvenance(
          'fallback-no-pattern',
          null,
          null,
          null,
          'No admitted attribute pattern matched this authored name, so the parser fell back to raw target/no-command syntax.',
        ),
        'No admitted attribute pattern matched this authored name.',
      );
      const selected = new CompilerAttributeParseCandidate(
        `attribute-parse-candidate:fallback:${rawName}`,
        'fallback',
        null,
        syntax,
        'Fallback syntax because no admitted pattern matched.',
      );
      return new CompilerAttributeParseResult(
        rawName,
        rawValue,
        'fallback',
        selected,
        [],
        'No admitted attribute pattern matched this authored name.',
      );
    }

    const topScore = matches[0]!.score;
    const topMatches = matches.filter((current) => sameScore(current.score, topScore));
    const candidates = topMatches.map((match, index) =>
      this.materializeCandidate(rawName, rawValue, match, index),
    );

    if (candidates.length > 1) {
      const ambiguousCandidates = candidates.map((current) => current.syntax == null
        ? current
        : new CompilerAttributeParseCandidate(
          current.id,
          'ambiguous',
          current.match,
          new CompilerAttributeSyntax(
            current.syntax.rawName,
            current.syntax.rawValue,
            current.syntax.target,
            current.syntax.command,
            current.syntax.parts,
            new CompilerAttributeSyntaxProvenance(
              'ambiguous-candidate',
              current.match?.definition ?? null,
              current.syntax.provenance?.handlerSource ?? null,
              current.syntax.provenance?.returnSource ?? null,
              'This candidate remained ambiguous because multiple top-ranked patterns matched.',
            ),
            current.syntax.note,
          ),
          current.note,
        ),
      );
      return new CompilerAttributeParseResult(
        rawName,
        rawValue,
        'ambiguous',
        null,
        ambiguousCandidates,
        `Multiple top-ranked attribute patterns matched ${rawName}.`,
      );
    }

    const selected = candidates[0]!;
    if (selected.syntax == null) {
      return new CompilerAttributeParseResult(
        rawName,
        rawValue,
        'handler-open',
        null,
        candidates,
        selected.note ?? `Matched attribute pattern ${selected.match?.definition.pattern ?? '(unknown)'}, but handler semantics stayed open.`,
      );
    }

    return new CompilerAttributeParseResult(
      rawName,
      rawValue,
      'selected',
      new CompilerAttributeParseCandidate(
        selected.id,
        'selected',
        selected.match,
        selected.syntax,
        selected.note,
      ),
      candidates,
      selected.note ?? `Closed through admitted attribute pattern ${selected.match?.definition.pattern ?? '(unknown)'}.`,
    );
  }

  private materializeCandidate(
    rawName: string,
    rawValue: string,
    match: CompilerAttributePatternMatch,
    index: number,
  ): CompilerAttributeParseCandidate {
    const evaluated = this.handlerMaterializer.materialize(
      match.definition,
      rawName,
      rawValue,
      match.parts,
    );
    return createCandidateFromHandlerResult(match, evaluated, index);
  }
}

export class CompilerTemplateCompilerHooks {
  constructor(
    readonly hooks: readonly TemplateCompilerHookCapability[],
  ) {}

  findAll(): readonly TemplateCompilerHookCapability[] {
    return [...this.hooks];
  }

  findByName(
    name: string,
  ): TemplateCompilerHookCapability | null {
    return this.hooks.find((current) => current.hookName === name) ?? null;
  }
}

export class CompilerServiceLocator {
  private readonly byDebugName = new Map<string, ContainerStateEntry>();
  private readonly byKeyId = new Map<string, ContainerStateEntry>();

  constructor(
    readonly entries: readonly ContainerStateEntry[],
    readonly openSeams: readonly ContainerStateOpenSeam[] = [],
  ) {
    for (const current of entries) {
      if (current.key.debugName != null) {
        this.byDebugName.set(current.key.debugName, current);
      }
      this.byKeyId.set(current.key.id, current);
    }
  }

  readAll(): readonly ContainerStateEntry[] {
    return [...this.entries];
  }

  has(
    debugName: string,
  ): boolean {
    return this.byDebugName.has(debugName);
  }

  findByDebugName(
    debugName: string,
  ): ContainerStateEntry | null {
    return this.byDebugName.get(debugName) ?? null;
  }

  findByKey(
    key: KeyRef,
  ): ContainerStateEntry | null {
    return this.byKeyId.get(key.id) ?? null;
  }
}

export interface CompilerConsultedWorldState {
  readonly worldId: string;
  readonly resourceCount: number;
  readonly bindingCommandCount: number;
  readonly attributePatternCount: number;
  readonly hookCount: number;
  readonly serviceEntryCount: number;
  readonly openSeamCount: number;
}

export class CompilerConsultedWorld {
  readonly resourceResolver: CompilerResourceResolver;
  readonly bindingCommands: CompilerBindingCommandResolver;
  readonly attributeParser: CompilerAttributeParser;
  readonly templateCompilerHooks: CompilerTemplateCompilerHooks;
  readonly services: CompilerServiceLocator;
  readonly valueParser: CompilerValueParser;

  constructor(
    readonly id: string,
    readonly world: ContainerWorldRef,
    resources: readonly ResourceDefinition[] = [],
    resourceAdmissions: readonly CompilerResourceAdmissionProvenance[] = [],
    compilerCapabilities: readonly CompilerCapability[] = [],
    serviceEntries: readonly ContainerStateEntry[] = [],
    serviceOpenSeams: readonly ContainerStateOpenSeam[] = [],
    readonly openSeams: readonly CompilerWorldOpenSeam[] = [],
  ) {
    // TODO: owner-local compiler branches for local custom elements/bindables
    // should fork this consulted world explicitly rather than mutating it
    // in-place. The first cut here stays root-world only.
    this.resourceResolver = new CompilerResourceResolver(world, resources, resourceAdmissions);
    this.bindingCommands = new CompilerBindingCommandResolver(
      this.resourceResolver.readByKind('binding-command'),
      (definition) => this.resourceResolver.readAdmission(definition),
    );
    this.attributeParser = new CompilerAttributeParser(
      this.resourceResolver.readByKind('attribute-pattern'),
      (definition) => this.resourceResolver.readAdmission(definition),
    );
    this.templateCompilerHooks = new CompilerTemplateCompilerHooks(
      compilerCapabilities.filter(
        (current): current is TemplateCompilerHookCapability => current.kind === 'template-compiler-hook',
      ),
    );
    this.services = new CompilerServiceLocator(serviceEntries, serviceOpenSeams);
    this.valueParser = new CompilerValueParser();
  }

  inspectState(): CompilerConsultedWorldState {
    return {
      worldId: this.world.id,
      resourceCount: this.resourceResolver.resources.length,
      bindingCommandCount: this.bindingCommands.readAll().length,
      attributePatternCount: this.attributeParser.readAll().length,
      hookCount: this.templateCompilerHooks.findAll().length,
      serviceEntryCount: this.services.readAll().length,
      openSeamCount: this.openSeams.length + this.services.openSeams.length,
    };
  }
}

type Token =
  | { readonly kind: 0 }
  | { readonly kind: 1; readonly value: string };

interface PatternScore {
  readonly statics: number;
  readonly dynamics: number;
  readonly symbols: number;
}

class CompiledPattern {
  readonly tokens: readonly Token[];
  readonly score: PatternScore;
  private readonly symbolSet: Set<string>;

  constructor(
    readonly definition: AttributePatternDefinition,
    readonly declarationIndex: number,
  ) {
    this.symbolSet = createSymbolSet(definition.symbols);
    const { tokens, score } = compilePattern(definition.pattern, this.symbolSet);
    this.tokens = tokens;
    this.score = score;
  }

  tryMatch(
    input: string,
  ): string[] | null {
    const parts: string[] = [];
    let pos = 0;
    let currentPart = '';

    for (const token of this.tokens) {
      if (token.kind === 1) {
        if (!input.startsWith(token.value, pos)) {
          return null;
        }

        for (const ch of token.value) {
          if (this.symbolSet.has(ch)) {
            if (currentPart.length > 0) {
              parts.push(currentPart);
              currentPart = '';
            }
          } else {
            currentPart += ch;
          }
        }
        pos += token.value.length;
        continue;
      }

      const start = pos;
      while (pos < input.length && !this.symbolSet.has(input[pos]!)) {
        pos++;
      }
      if (pos === start) {
        return null;
      }
      currentPart += input.slice(start, pos);
    }

    if (currentPart.length > 0) {
      parts.push(currentPart);
    }

    return pos === input.length
      ? parts
      : null;
  }
}

function createSymbolSet(
  symbols: readonly string[],
): Set<string> {
  const result = new Set<string>();
  for (const current of symbols) {
    for (const ch of current) {
      result.add(ch);
    }
  }
  return result;
}

function compilePattern(
  pattern: string | null,
  symbolSet: Set<string>,
): { readonly tokens: readonly Token[]; readonly score: PatternScore } {
  if (pattern == null) {
    return {
      tokens: [],
      score: { statics: 0, dynamics: 0, symbols: 0 },
    };
  }

  const tokens: Token[] = [];
  let statics = 0;
  let dynamics = 0;
  let symbols = 0;
  let index = 0;

  while (index < pattern.length) {
    if (pattern.startsWith('PART', index)) {
      tokens.push({ kind: 0 });
      dynamics++;
      index += 4;
      continue;
    }

    const runStart = index;
    while (index < pattern.length && !pattern.startsWith('PART', index)) {
      index++;
    }
    const run = pattern.slice(runStart, index);
    let local = 0;
    while (local < run.length) {
      const isSymbol = symbolSet.has(run[local]!);
      let next = local + 1;
      while (next < run.length && symbolSet.has(run[next]!) === isSymbol) {
        next++;
      }
      tokens.push({ kind: 1, value: run.slice(local, next) });
      if (isSymbol) {
        symbols++;
      } else {
        statics++;
      }
      local = next;
    }
  }

  return {
    tokens,
    score: { statics, dynamics, symbols },
  };
}

function isBetterScore(
  current: PatternScore,
  previous: PatternScore,
): boolean {
  if (current.statics !== previous.statics) {
    return current.statics > previous.statics;
  }
  if (current.dynamics !== previous.dynamics) {
    return current.dynamics > previous.dynamics;
  }
  return current.symbols > previous.symbols;
}

function compareMatches(
  left: CompilerAttributePatternMatch,
  right: CompilerAttributePatternMatch,
): number {
  if (left.score.statics !== right.score.statics) {
    return right.score.statics - left.score.statics;
  }
  if (left.score.dynamics !== right.score.dynamics) {
    return right.score.dynamics - left.score.dynamics;
  }
  if (left.score.symbols !== right.score.symbols) {
    return right.score.symbols - left.score.symbols;
  }
  return left.declarationIndex - right.declarationIndex;
}

function sameScore(
  left: PatternScore,
  right: PatternScore,
): boolean {
  return left.statics === right.statics
    && left.dynamics === right.dynamics
    && left.symbols === right.symbols;
}

function createCandidateFromHandlerResult(
  match: CompilerAttributePatternMatch,
  evaluated: CompilerAttributeHandlerResult,
  index: number,
): CompilerAttributeParseCandidate {
  return new CompilerAttributeParseCandidate(
    `attribute-parse-candidate:${match.definition.id}:${index}`,
    evaluated.status === 'closed'
      ? 'selected'
      : 'open-handler',
    match,
    evaluated.syntax,
    evaluated.note,
  );
}
