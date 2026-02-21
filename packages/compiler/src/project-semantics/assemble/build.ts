import type {
  BindingBehaviorDef,
  CatalogConfidence,
  CatalogGap,
  CustomAttributeDef,
  CustomElementDef,
  NormalizedPath,
  ResourceKind,
  SourceLocation,
  Sourced,
  ResourceCatalog,
  ResourceDef,
  ProjectSemantics,
  MaterializedSemantics,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  ValueConverterDef,
} from '../compiler.js';
import type { AttributePatternDef, BindingCommandDef, PatternInterpret } from '../../schema/types.js';
import { BUILTIN_SEMANTICS, buildResourceCatalog, prepareProjectSemantics } from '../compiler.js';
import { unwrapSourced } from "./sourced.js";
import type {
  RecognizedAttributePattern,
  RecognizedBindingCommand,
} from "../recognize/extensions.js";
import {
  compareAttributePatternRecognition,
  compareBindingCommandRecognition,
} from "../recognize/extensions.js";
import {
  mergeResourceDefinitionCandidates,
  type DefinitionReductionReason,
  type DefinitionSourceKind,
  type ResourceDefinitionCandidate,
} from "../definition/index.js";

const BUILTIN_DEFINITION_BY_KEY = buildBuiltinDefinitionIndex();

export interface DefinitionConvergenceCandidate {
  readonly candidateId: string;
  readonly sourceKind: DefinitionSourceKind;
  readonly file?: NormalizedPath;
}

export interface DefinitionConvergenceRecord {
  readonly resourceKind: ResourceDef["kind"];
  readonly resourceName: string;
  readonly reasons: readonly DefinitionReductionReason[];
  readonly candidates: readonly DefinitionConvergenceCandidate[];
}

export interface DefinitionCandidateOverride {
  readonly sourceKind: DefinitionSourceKind;
  readonly evidenceRank: number;
  readonly candidateId?: string;
}

export interface BuildSemanticsArtifactsOptions {
  readonly gaps?: readonly CatalogGap[];
  readonly confidence?: CatalogConfidence;
  readonly recognizedBindingCommands?: readonly RecognizedBindingCommand[];
  readonly recognizedAttributePatterns?: readonly RecognizedAttributePattern[];
  /**
   * Optional per-resource convergence metadata overrides.
   *
   * Keyed by resource object identity from the resources input array.
   */
  readonly candidateOverrides?: ReadonlyMap<ResourceDef, DefinitionCandidateOverride>;
}

export interface SemanticsArtifacts {
  readonly semantics: MaterializedSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
  /**
   * Converged resource definitions that form semantic authority for this build.
   */
  readonly definitionAuthority: readonly ResourceDef[];
  readonly definitionConvergence: readonly DefinitionConvergenceRecord[];
  readonly mergeUncertaintyGaps: readonly CatalogGap[];
}

export function buildSemanticsArtifacts(
  resources: readonly ResourceDef[],
  baseSemantics?: ProjectSemantics,
  opts?: BuildSemanticsArtifactsOptions,
): SemanticsArtifacts {
  const base = baseSemantics ?? BUILTIN_SEMANTICS;
  const stripped = stripSemanticsCaches(base);

  const elements: Record<string, CustomElementDef> = {};
  const attributes: Record<string, CustomAttributeDef> = {};
  const controllers: Record<string, TemplateControllerDef> = {};
  const valueConverters: Record<string, ValueConverterDef> = {};
  const bindingBehaviors: Record<string, BindingBehaviorDef> = {};
  const definitionAuthority: ResourceDef[] = [];
  const definitionConvergence: DefinitionConvergenceRecord[] = [];
  const mergeUncertaintyGaps: CatalogGap[] = [];

  const { grouped, unnamedGaps } = groupDefinitionCandidates(resources, opts?.candidateOverrides);
  for (const candidates of grouped.values()) {
    const mergeResult = mergeResourceDefinitionCandidates(candidates);
    if (mergeResult.reasons.length > 0) {
      const firstCandidate = candidates[0];
      const resourceName = firstCandidate
        ? (unwrapSourced(firstCandidate.resource.name) ?? resourceFallbackKey(firstCandidate.resource) ?? "")
        : "";
      const resourceKind = firstCandidate?.resource.kind ?? "custom-element";
      definitionConvergence.push({
        resourceKind,
        resourceName,
        reasons: mergeResult.reasons,
        candidates: candidates.map((candidate, index) => ({
          candidateId: candidate.candidateId ?? `candidate:${index + 1}`,
          sourceKind: candidate.sourceKind,
          file: candidate.resource.file,
        })),
      });
    }
    const merged = mergeResult.value;
    if (!merged) continue;
    const name = unwrapSourced(merged.name);
    const dictKey = name ?? resourceFallbackKey(merged);
    if (!dictKey) continue;
    definitionAuthority.push(merged);
    switch (merged.kind) {
      case "custom-element":
        elements[dictKey] = merged;
        break;
      case "custom-attribute":
        attributes[dictKey] = merged;
        break;
      case "template-controller":
        controllers[dictKey] = merged;
        break;
      case "value-converter":
        valueConverters[dictKey] = merged;
        break;
      case "binding-behavior":
        bindingBehaviors[dictKey] = merged;
        break;
    }
  }

  const mergedCommands = mergeRecognizedBindingCommands(
    base.commands,
    opts?.recognizedBindingCommands,
  );
  const mergedPatterns = mergeRecognizedAttributePatterns(
    base.patterns,
    opts?.recognizedAttributePatterns,
  );
  mergeUncertaintyGaps.push(...mergedCommands.uncertaintyGaps, ...mergedPatterns.uncertaintyGaps);

  const sem: ProjectSemantics = {
    ...stripped,
    elements: { ...base.elements, ...elements },
    attributes: { ...base.attributes, ...attributes },
    controllers: { ...base.controllers, ...controllers },
    valueConverters: { ...base.valueConverters, ...valueConverters },
    bindingBehaviors: { ...base.bindingBehaviors, ...bindingBehaviors },
    commands: mergedCommands.commands,
    patterns: mergedPatterns.patterns,
    dom: base.dom,
    events: base.events,
    naming: base.naming,
    twoWayDefaults: base.twoWayDefaults,
  };

  const prepared = prepareProjectSemantics(sem);
  const catalogOpts = unnamedGaps.length > 0 || mergeUncertaintyGaps.length > 0 || opts
    ? {
        ...opts,
        gaps: [...(opts?.gaps ?? []), ...unnamedGaps, ...mergeUncertaintyGaps],
        confidence: mergeUncertaintyGaps.length > 0
          ? degradeConfidenceForUncertainty(opts?.confidence)
          : opts?.confidence,
        scopeCompleteness: prepared.catalog.scopeCompleteness,
      }
    : undefined;
  const catalog = catalogOpts
    ? buildResourceCatalog(prepared.resources, prepared.bindingCommands, prepared.attributePatterns, catalogOpts)
    : prepared.catalog;
  const withCatalog: MaterializedSemantics = catalogOpts ? { ...prepared, catalog } : prepared;

  const syntax: TemplateSyntaxRegistry = {
    bindingCommands: withCatalog.bindingCommands,
    attributePatterns: withCatalog.attributePatterns,
    controllers: withCatalog.resources.controllers,
  };

  return {
    semantics: withCatalog,
    catalog: withCatalog.catalog,
    syntax,
    definitionAuthority,
    definitionConvergence,
    mergeUncertaintyGaps,
  };
}

function stripSemanticsCaches(base: ProjectSemantics): ProjectSemantics {
  const {
    resources,
    bindingCommands,
    attributePatterns,
    catalog,
    ...rest
  } = base as MaterializedSemantics;
  void resources;
  void bindingCommands;
  void attributePatterns;
  void catalog;
  return rest;
}

interface GroupResult {
  readonly grouped: Map<string, ResourceDefinitionCandidate[]>;
  readonly unnamedGaps: CatalogGap[];
}

function groupDefinitionCandidates(
  resources: readonly ResourceDef[],
  candidateOverrides?: ReadonlyMap<ResourceDef, DefinitionCandidateOverride>,
): GroupResult {
  const grouped = new Map<string, ResourceDefinitionCandidate[]>();
  const unnamedGaps: CatalogGap[] = [];
  for (const resource of resources) {
    const name = unwrapSourced(resource.name);
    let key: string;
    if (name) {
      key = `${resource.kind}:${name}`;
    } else {
      const fallback = resourceFallbackKey(resource);
      if (!fallback) continue;
      key = `${resource.kind}:${fallback}`;
      const displayName = unwrapSourced(resource.className) ?? resource.file ?? "unknown";
      unnamedGaps.push({
        kind: "unresolved-name",
        message: `Resource name could not be determined for ${displayName}`,
        resourceKind: resource.kind as ResourceKind,
        resourceName: fallback,
        ...(resource.file ? { resource: resource.file } : {}),
      });
    }
    const candidates = grouped.get(key) ?? [];
    const nextIndex = candidates.length + 1;
    const override = candidateOverrides?.get(resource);
    candidates.push({
      candidateId: override?.candidateId ?? createDefinitionCandidateId(resource, nextIndex),
      resource,
      sourceKind: override?.sourceKind ?? sourceKindFromNameOrigin(resource.name),
      evidenceRank: override?.evidenceRank ?? evidenceRankFromNameOrigin(resource.name),
    });
    grouped.set(key, candidates);
  }

  // Enroll builtin definitions for colliding keys so builtin-analysis seam
  // collisions are resolved via the same field-level merge algebra.
  for (const [key, candidates] of grouped.entries()) {
    const builtin = BUILTIN_DEFINITION_BY_KEY.get(key);
    if (!builtin) continue;
    const hasBuiltinCandidate = candidates.some((candidate) => candidate.sourceKind === "builtin");
    if (hasBuiltinCandidate) continue;
    candidates.push({
      candidateId: createBuiltinCandidateId(builtin),
      resource: builtin,
      sourceKind: "builtin",
      evidenceRank: 2,
    });
  }

  return { grouped, unnamedGaps };
}

function buildBuiltinDefinitionIndex(): ReadonlyMap<string, ResourceDef> {
  const index = new Map<string, ResourceDef>();
  const builtinResources: ResourceDef[] = [
    ...Object.values(BUILTIN_SEMANTICS.elements),
    ...Object.values(BUILTIN_SEMANTICS.attributes),
    ...Object.values(BUILTIN_SEMANTICS.controllers),
    ...Object.values(BUILTIN_SEMANTICS.valueConverters),
    ...Object.values(BUILTIN_SEMANTICS.bindingBehaviors),
  ];
  for (const resource of builtinResources) {
    const name = unwrapSourced(resource.name);
    if (!name) continue;
    index.set(`${resource.kind}:${name}`, resource);
  }
  return index;
}

function createBuiltinCandidateId(resource: ResourceDef): string {
  const name = unwrapSourced(resource.name) ?? "";
  const className = unwrapSourced(resource.className) ?? "";
  return `builtin|${resource.kind}|${name}|${className}`;
}

function sourceKindFromNameOrigin(name: Sourced<string>): DefinitionSourceKind {
  switch (name.origin) {
    case "config":
      return "explicit-config";
    case "builtin":
      return "builtin";
    case "source":
      return "analysis-explicit";
  }
}

function evidenceRankFromNameOrigin(name: Sourced<string>): number {
  switch (name.origin) {
    case "config":
      return 0;
    case "source":
      return 1;
    case "builtin":
      return 2;
  }
}

function resourceFallbackKey(resource: ResourceDef): string | null {
  const className = unwrapSourced(resource.className);
  if (className) return `?class=${className}`;
  if (resource.file) return `?file=${resource.file}`;
  return null;
}

function createDefinitionCandidateId(resource: ResourceDef, ordinal: number): string {
  const name = unwrapSourced(resource.name) ?? "";
  const className = unwrapSourced(resource.className) ?? "";
  const file = resource.file ?? "";
  return `${resource.kind}|${name}|${className}|${file}|${ordinal}`;
}

interface BindingCommandMergeResult {
  readonly commands: Record<string, BindingCommandDef>;
  readonly uncertaintyGaps: CatalogGap[];
}

function mergeRecognizedBindingCommands(
  baseCommands: Readonly<Record<string, BindingCommandDef>>,
  recognized: readonly RecognizedBindingCommand[] | undefined,
): BindingCommandMergeResult {
  const commands: Record<string, BindingCommandDef> = { ...baseCommands };
  const uncertaintyGaps: CatalogGap[] = [];
  if (!recognized || recognized.length === 0) {
    return { commands, uncertaintyGaps };
  }

  const sorted = [...recognized].sort(compareBindingCommandRecognition);
  for (const recognition of sorted) {
    const key = recognition.name;
    if (commands[key]) {
      continue;
    }
    commands[key] = createConservativeBindingCommandDef(recognition);
    uncertaintyGaps.push({
      kind: "recognized-command-uncertain",
      message: `Binding command '${recognition.name}' merged with conservative defaults (kind=property).`,
      resource: recognition.file,
    });
  }

  return { commands, uncertaintyGaps };
}

interface AttributePatternMergeResult {
  readonly patterns: AttributePatternDef[];
  readonly uncertaintyGaps: CatalogGap[];
}

function mergeRecognizedAttributePatterns(
  basePatterns: readonly AttributePatternDef[],
  recognized: readonly RecognizedAttributePattern[] | undefined,
): AttributePatternMergeResult {
  const patterns = [...basePatterns];
  const uncertaintyGaps: CatalogGap[] = [];
  if (!recognized || recognized.length === 0) {
    return { patterns, uncertaintyGaps };
  }

  const existing = new Set(
    basePatterns.map((pattern) => {
      const pat = pattern.pattern.value ?? "";
      const symbols = pattern.symbols.value ?? "";
      return `${pat}|${symbols}`;
    }),
  );
  const sorted = [...recognized].sort(compareAttributePatternRecognition);

  for (const recognition of sorted) {
    const key = `${recognition.pattern}|${recognition.symbols}`;
    if (existing.has(key)) {
      continue;
    }
    const interpret = inferConservativePatternInterpret(recognition.pattern);
    patterns.push(createConservativeAttributePatternDef(recognition, interpret));
    existing.add(key);
    uncertaintyGaps.push({
      kind: "recognized-pattern-uncertain",
      message: `Attribute pattern '${recognition.pattern}' merged with conservative interpret '${describePatternInterpret(interpret)}'.`,
      resource: recognition.file,
    });
  }

  return { patterns, uncertaintyGaps };
}

function createConservativeBindingCommandDef(
  recognition: RecognizedBindingCommand,
): BindingCommandDef {
  const nameLocation = toRecognitionLocation(recognition.file, recognition.nameSpan, recognition.declarationSpan);
  return {
    name: configValue(recognition.name, nameLocation),
    commandKind: configValue("property", toRecognitionLocation(recognition.file, recognition.declarationSpan, recognition.nameSpan)),
  };
}

function createConservativeAttributePatternDef(
  recognition: RecognizedAttributePattern,
  interpret: PatternInterpret,
): AttributePatternDef {
  return {
    pattern: configValue(
      recognition.pattern,
      toRecognitionLocation(recognition.file, recognition.patternSpan, recognition.declarationSpan),
    ),
    symbols: configValue(
      recognition.symbols,
      toRecognitionLocation(recognition.file, recognition.symbolsSpan, recognition.declarationSpan),
    ),
    interpret: configValue(
      interpret,
      toRecognitionLocation(recognition.file, recognition.declarationSpan, recognition.patternSpan),
    ),
  };
}

function inferConservativePatternInterpret(pattern: string): PatternInterpret {
  const partCount = countPartTokens(pattern);
  if (partCount >= 2) {
    return { kind: "target-command" };
  }
  return { kind: "fixed-command", command: "bind" };
}

function countPartTokens(pattern: string): number {
  let count = 0;
  let index = 0;
  while (index < pattern.length) {
    const next = pattern.indexOf("PART", index);
    if (next < 0) break;
    count += 1;
    index = next + 4;
  }
  return count;
}

function describePatternInterpret(interpret: PatternInterpret): string {
  if (interpret.kind === "target-command") {
    return "target-command";
  }
  if (interpret.kind === "fixed-command") {
    return `fixed-command:${interpret.command}`;
  }
  return interpret.kind;
}

function configValue<T>(value: T, location: SourceLocation): { origin: "config"; value: T; location: SourceLocation } {
  return { origin: "config", value, location };
}

function toRecognitionLocation(
  file: NormalizedPath,
  primary?: { start: number; end: number },
  fallback?: { start: number; end: number },
): SourceLocation {
  const span = primary ?? fallback;
  const start = span?.start ?? 0;
  const end = span?.end ?? start;
  return { file, pos: start, end };
}

function degradeConfidenceForUncertainty(confidence: CatalogConfidence | undefined): CatalogConfidence | undefined {
  if (!confidence) return undefined;
  if (confidence === "conservative" || confidence === "partial") {
    return confidence;
  }
  return "partial";
}
