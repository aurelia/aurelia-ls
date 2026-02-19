import type {
  BindingBehaviorDef,
  CatalogConfidence,
  CatalogGap,
  CustomAttributeDef,
  CustomElementDef,
  NormalizedPath,
  ResourceKind,
  Sourced,
  ResourceCatalog,
  ResourceDef,
  ProjectSemantics,
  MaterializedSemantics,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  ValueConverterDef,
} from '../compiler.js';
import { BUILTIN_SEMANTICS, buildResourceCatalog, prepareProjectSemantics } from '../compiler.js';
import { unwrapSourced } from "./sourced.js";
import {
  mergeResourceDefinitionCandidates,
  type DefinitionReductionReason,
  type DefinitionSourceKind,
  type ResourceDefinitionCandidate,
} from "../definition/index.js";

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

  const sem: ProjectSemantics = {
    ...stripped,
    elements: { ...base.elements, ...elements },
    attributes: { ...base.attributes, ...attributes },
    controllers: { ...base.controllers, ...controllers },
    valueConverters: { ...base.valueConverters, ...valueConverters },
    bindingBehaviors: { ...base.bindingBehaviors, ...bindingBehaviors },
    commands: base.commands,
    patterns: base.patterns,
    dom: base.dom,
    events: base.events,
    naming: base.naming,
    twoWayDefaults: base.twoWayDefaults,
  };

  const prepared = prepareProjectSemantics(sem);
  const catalogOpts = unnamedGaps.length > 0 || opts
    ? {
        ...opts,
        gaps: [...(opts?.gaps ?? []), ...unnamedGaps],
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
  return { grouped, unnamedGaps };
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
