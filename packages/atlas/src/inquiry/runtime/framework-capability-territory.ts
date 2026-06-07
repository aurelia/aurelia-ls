import { type Answer } from "../answer.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { RepoRootLocus } from "../locus.js";
import type { SourceProject } from "../../source/index.js";
import { answerBridgeAuLink } from "./bridge-lenses.js";
import { answerFrameworkAdmission } from "./framework-admission-lenses.js";
import { answerFrameworkCompiler } from "./framework-compiler-lenses.js";
import { answerFrameworkComposition } from "./framework-composition-lenses.js";
import { answerFrameworkDi } from "./framework-di-lenses.js";
import { answerFrameworkDiscovery } from "./framework-discovery-answerer.js";
import { answerFrameworkObservation } from "./framework-observation-lenses.js";
import { answerFrameworkRendering } from "./framework-lenses.js";
import { answerFrameworkResources } from "./framework-resource-lenses.js";
import { answerFrameworkRouter } from "./framework-router-lenses.js";

/**
 * Source-derived Aurelia capability territory.
 *
 * This is the shared in-process enumeration of the concrete framework inventory, derived from the
 * framework.* source lenses. It is the substrate for the framework.capabilities lens's source-derived
 * projections (inventory, coverage, reverse-coverage) and for the framework:territory / coverage CLI
 * scripts, so curated rows and source-derived evidence use the same inventory stream.
 *
 * Families are heterogeneous by design: catalog families expose one framework class/symbol per row;
 * relationship-graph families expose capabilities as the distinct values of relation/mechanism facet
 * fields. Both are normalized into FrameworkTerritoryConstruct so the inventory is one typed stream.
 */

const DEFAULT_TERRITORY_ROWS = 600;
const UNSHAPED = "<unshaped>";

/** Framework export shapes a product concept most directly mirrors; used for ordering, not hiding. */
const INSTANTIABLE_SHAPES = new Set(["class", "di-interface"]);

/** How a family's capability constructs are read from its source lens. */
export const enum FrameworkFamilyShape {
  /** Each row is one framework class/symbol construct (symbol-joinable for reverse coverage). */
  Catalog = "catalog",
  /** Capability constructs are the distinct values of relation/mechanism facet fields. */
  RelationGraph = "relation-graph",
}

/** One normalized concrete construct in the source-derived territory. */
export interface FrameworkTerritoryConstruct {
  readonly family: string;
  readonly lensId: LensId;
  readonly familyShape: FrameworkFamilyShape;
  /** Stable identity: the symbol for catalog families, or "field:value" for relation-graph families. */
  readonly identity: string;
  /** Framework symbol name used as the auLink reverse-coverage join key; null for relation-graph rows. */
  readonly symbol: string | null;
  /** Family-specific classifier (resourceKind, productKind, facet field, ...) when available. */
  readonly kind: string | null;
  /** Framework export shape when the family carries one. */
  readonly exportShape: string | null;
  readonly packageId: string | null;
}

interface TerritoryFamily {
  readonly id: string;
  readonly lens: LensId;
  readonly projection: string;
  readonly arrayField: string;
  readonly shape: FrameworkFamilyShape;
  readonly symbolOf?: (row: Record<string, unknown>) => string | null;
  readonly kindOf?: (row: Record<string, unknown>) => string | null;
  readonly shapeOf?: (row: Record<string, unknown>) => string | null;
  readonly packageOf?: (row: Record<string, unknown>) => string | null;
  readonly facetFields?: readonly string[];
}

const TERRITORY_FAMILIES: readonly TerritoryFamily[] = [
  { id: "resources", lens: LensId.FrameworkResources, projection: "definitions", arrayField: "convergenceRows", shape: FrameworkFamilyShape.Catalog, symbolOf: (row) => stringField(row, "targetName"), kindOf: (row) => stringField(row, "resourceKind"), packageOf: (row) => stringField(row, "packageId") },
  { id: "expression", lens: LensId.FrameworkDiscovery, projection: "expression-entities", arrayField: "expressionEntities", shape: FrameworkFamilyShape.Catalog, symbolOf: symbolFromExportRow, shapeOf: (row) => stringField(row, "exportShape"), packageOf: (row) => stringField(row, "packageId") },
  { id: "observation", lens: LensId.FrameworkObservation, projection: "entities", arrayField: "observers", shape: FrameworkFamilyShape.Catalog, symbolOf: symbolFromExportRow, shapeOf: (row) => stringField(row, "exportShape"), packageOf: (row) => stringField(row, "packageId") },
  { id: "compiler", lens: LensId.FrameworkCompiler, projection: "instruction-products", arrayField: "instructionProducts", shape: FrameworkFamilyShape.Catalog, symbolOf: (row) => stringField(row, "instructionName"), kindOf: (row) => stringField(row, "productKind"), packageOf: (row) => stringField(row, "packageId") },
  { id: "rendering", lens: LensId.FrameworkRendering, projection: "binding-products", arrayField: "bindingProducts", shape: FrameworkFamilyShape.Catalog, symbolOf: (row) => stringField(row, "bindingName"), packageOf: (row) => stringField(row, "packageId") },
  { id: "router", lens: LensId.FrameworkRouter, projection: "relationships", arrayField: "relationships", shape: FrameworkFamilyShape.RelationGraph, facetFields: ["relation", "mechanism"], packageOf: (row) => stringField(row, "packageId") },
  { id: "di", lens: LensId.FrameworkDi, projection: "registrations", arrayField: "relationships", shape: FrameworkFamilyShape.RelationGraph, facetFields: ["relation", "strategy", "mechanism"], packageOf: (row) => stringField(row, "packageId") },
  { id: "admission", lens: LensId.FrameworkAdmission, projection: "catalogs", arrayField: "relationships", shape: FrameworkFamilyShape.RelationGraph, facetFields: ["exportName", "catalogName"], packageOf: (row) => stringField(row, "packageId") },
];

/** The catalog-shaped families, in declared order, for symbol-joined reverse coverage. */
export const FRAMEWORK_CATALOG_FAMILY_IDS: readonly string[] = TERRITORY_FAMILIES
  .filter((family) => family.shape === FrameworkFamilyShape.Catalog)
  .map((family) => family.id);

/** Enumerate the full concrete territory as one normalized construct stream. */
export function enumerateFrameworkTerritoryConstructs(
  sourceProject: SourceProject,
  budgetRows: number = DEFAULT_TERRITORY_ROWS,
): readonly FrameworkTerritoryConstruct[] {
  const constructs: FrameworkTerritoryConstruct[] = [];
  for (const family of TERRITORY_FAMILIES) {
    const answer = answerFrameworkFamily(family.lens, family.projection, sourceProject, budgetRows);
    if (answer === undefined) {
      continue;
    }
    const rows = readArrayField(answer.value, family.arrayField);
    if (family.shape === FrameworkFamilyShape.Catalog) {
      for (const row of rows) {
        const symbol = family.symbolOf === undefined ? null : family.symbolOf(row);
        if (symbol === null || symbol.length === 0) {
          continue;
        }
        constructs.push({
          family: family.id,
          lensId: family.lens,
          familyShape: family.shape,
          identity: symbol,
          symbol,
          kind: family.kindOf === undefined ? null : family.kindOf(row),
          exportShape: family.shapeOf === undefined ? null : family.shapeOf(row),
          packageId: family.packageOf === undefined ? null : family.packageOf(row),
        });
      }
      continue;
    }
    const seen = new Set<string>();
    for (const field of family.facetFields ?? []) {
      for (const row of rows) {
        const value = stringField(row, field);
        if (value === null || value.length === 0) {
          continue;
        }
        const identity = `${field}:${value}`;
        if (seen.has(identity)) {
          continue;
        }
        seen.add(identity);
        constructs.push({
          family: family.id,
          lensId: family.lens,
          familyShape: family.shape,
          identity,
          symbol: null,
          kind: field,
          exportShape: null,
          packageId: null,
        });
      }
    }
  }
  return constructs;
}

export interface FrameworkReverseCoverageShapeGroup {
  readonly shape: string;
  readonly instantiable: boolean;
  readonly symbols: readonly string[];
}

export interface FrameworkReverseCoverageFamily {
  readonly family: string;
  readonly total: number;
  readonly mirrored: number;
  readonly mirroredWithRoleEvidence: number;
  readonly instantiableTotal: number;
  readonly instantiableMirrored: number;
  readonly notMirroredByShape: readonly FrameworkReverseCoverageShapeGroup[];
}

/** Reverse coverage: catalog-family constructs joined to semantic-runtime auLink mirror targets. */
export function frameworkReverseCoverage(
  sourceProject: SourceProject,
  budgetRows: number = DEFAULT_TERRITORY_ROWS,
): readonly FrameworkReverseCoverageFamily[] {
  const mirrorAnswer = answerFrameworkFamily(LensId.BridgeAuLink, "mirror", sourceProject, budgetRows);
  const mirrorRoleBySymbol = new Map<string, number>();
  for (const row of readArrayField(mirrorAnswer?.value, "mirror")) {
    const symbol = stringField(row, "symbolName");
    if (symbol !== null) {
      mirrorRoleBySymbol.set(symbol, numberField(row, "roleEvidenceCount"));
    }
  }

  const families: FrameworkReverseCoverageFamily[] = [];
  for (const family of TERRITORY_FAMILIES) {
    if (family.shape !== FrameworkFamilyShape.Catalog) {
      continue;
    }
    const answer = answerFrameworkFamily(family.lens, family.projection, sourceProject, budgetRows);
    const bySymbol = new Map<string, { shape: string; mirrored: boolean; roleEvidence: boolean }>();
    for (const row of readArrayField(answer?.value, family.arrayField)) {
      const symbol = family.symbolOf === undefined ? null : family.symbolOf(row);
      if (symbol === null || symbol.length === 0) {
        continue;
      }
      const shape = (family.shapeOf === undefined ? null : family.shapeOf(row)) ?? UNSHAPED;
      const existing = bySymbol.get(symbol);
      if (existing === undefined) {
        const role = mirrorRoleBySymbol.get(symbol);
        bySymbol.set(symbol, { shape, mirrored: role !== undefined, roleEvidence: (role ?? 0) > 0 });
      } else if (!INSTANTIABLE_SHAPES.has(existing.shape) && INSTANTIABLE_SHAPES.has(shape)) {
        existing.shape = shape;
      }
    }
    const constructs = [...bySymbol.values()];
    const instantiable = constructs.filter((entry) => INSTANTIABLE_SHAPES.has(entry.shape));
    families.push({
      family: family.id,
      total: constructs.length,
      mirrored: constructs.filter((entry) => entry.mirrored).length,
      mirroredWithRoleEvidence: constructs.filter((entry) => entry.roleEvidence).length,
      instantiableTotal: instantiable.length,
      instantiableMirrored: instantiable.filter((entry) => entry.mirrored).length,
      notMirroredByShape: groupNotMirroredByShape(bySymbol),
    });
  }
  return families;
}

function groupNotMirroredByShape(
  bySymbol: ReadonlyMap<string, { shape: string; mirrored: boolean }>,
): readonly FrameworkReverseCoverageShapeGroup[] {
  const byShape = new Map<string, string[]>();
  for (const [symbol, entry] of bySymbol) {
    if (entry.mirrored) {
      continue;
    }
    const bucket = byShape.get(entry.shape) ?? [];
    bucket.push(symbol);
    byShape.set(entry.shape, bucket);
  }
  return [...byShape.entries()]
    .map(([shape, symbols]) => ({
      shape,
      instantiable: INSTANTIABLE_SHAPES.has(shape),
      symbols: symbols.sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => {
      if (left.instantiable !== right.instantiable) {
        return left.instantiable ? -1 : 1;
      }
      return left.shape.localeCompare(right.shape);
    });
}

export interface FrameworkForwardCoverageFamily {
  readonly family: string;
  readonly total: number;
  readonly accounted: number;
  readonly instantiableTotal: number;
  readonly instantiableAccounted: number;
  readonly notAccountedByShape: readonly FrameworkReverseCoverageShapeGroup[];
}

/** Forward coverage: catalog constructs mentioned by the curated category corpus. */
export function frameworkForwardCoverage(
  sourceProject: SourceProject,
  categoryCorpus: string,
  budgetRows: number = DEFAULT_TERRITORY_ROWS,
): readonly FrameworkForwardCoverageFamily[] {
  const families: FrameworkForwardCoverageFamily[] = [];
  for (const family of TERRITORY_FAMILIES) {
    if (family.shape !== FrameworkFamilyShape.Catalog) {
      continue;
    }
    const answer = answerFrameworkFamily(family.lens, family.projection, sourceProject, budgetRows);
    const bySymbol = new Map<string, { shape: string; accounted: boolean }>();
    for (const row of readArrayField(answer?.value, family.arrayField)) {
      const symbol = family.symbolOf === undefined ? null : family.symbolOf(row);
      if (symbol === null || symbol.length === 0) {
        continue;
      }
      const shape = (family.shapeOf === undefined ? null : family.shapeOf(row)) ?? UNSHAPED;
      const existing = bySymbol.get(symbol);
      if (existing === undefined) {
        bySymbol.set(symbol, { shape, accounted: corpusHasTerm(categoryCorpus, symbol) });
      } else if (!INSTANTIABLE_SHAPES.has(existing.shape) && INSTANTIABLE_SHAPES.has(shape)) {
        existing.shape = shape;
      }
    }
    const constructs = [...bySymbol.values()];
    const instantiable = constructs.filter((entry) => INSTANTIABLE_SHAPES.has(entry.shape));
    const byShape = new Map<string, string[]>();
    for (const [symbol, entry] of bySymbol) {
      if (entry.accounted) {
        continue;
      }
      const bucket = byShape.get(entry.shape) ?? [];
      bucket.push(symbol);
      byShape.set(entry.shape, bucket);
    }
    families.push({
      family: family.id,
      total: constructs.length,
      accounted: constructs.filter((entry) => entry.accounted).length,
      instantiableTotal: instantiable.length,
      instantiableAccounted: instantiable.filter((entry) => entry.accounted).length,
      notAccountedByShape: [...byShape.entries()]
        .map(([shape, symbols]) => ({
          shape,
          instantiable: INSTANTIABLE_SHAPES.has(shape),
          symbols: symbols.sort((left, right) => left.localeCompare(right)),
        }))
        .sort((left, right) =>
          left.instantiable !== right.instantiable
            ? left.instantiable
              ? -1
              : 1
            : left.shape.localeCompare(right.shape),
        ),
    });
  }
  return families;
}

function corpusHasTerm(corpus: string, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (normalized.length < 2) {
    return false;
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`).test(corpus);
}

/** A derived capability cluster: catalog constructs grouped by framework structure. */
export interface FrameworkCapabilityCluster {
  readonly key: string;
  readonly family: string;
  readonly memberCount: number;
  readonly members: readonly string[];
  readonly kinds: readonly string[];
}

/**
 * Candidate capability clusters grouped by source-file co-location and binding-command instruction target.
 * Clusters are evidence handles for reviewing curated capability rows, not capability identities by themselves.
 */
export function frameworkCapabilityClusters(
  sourceProject: SourceProject,
  budgetRows: number = DEFAULT_TERRITORY_ROWS,
): readonly FrameworkCapabilityCluster[] {
  const clusters = new Map<string, { family: string; members: Set<string>; kinds: Set<string> }>();
  for (const family of TERRITORY_FAMILIES) {
    if (family.shape !== FrameworkFamilyShape.Catalog) {
      continue;
    }
    const answer = answerFrameworkFamily(family.lens, family.projection, sourceProject, budgetRows);
    for (const row of readArrayField(answer?.value, family.arrayField)) {
      const symbol = family.symbolOf === undefined ? null : family.symbolOf(row);
      if (symbol === null || symbol.length === 0) {
        continue;
      }
      const key = `${family.id}/${clusterKeyForRow(row)}`;
      const entry = clusters.get(key) ?? { family: family.id, members: new Set<string>(), kinds: new Set<string>() };
      entry.members.add(symbol);
      const kind = family.kindOf === undefined ? null : family.kindOf(row);
      if (kind !== null) {
        entry.kinds.add(kind);
      }
      clusters.set(key, entry);
    }
  }
  return [...clusters.entries()]
    .map(([key, entry]) => ({
      key,
      family: entry.family,
      memberCount: entry.members.size,
      members: [...entry.members].sort((left, right) => left.localeCompare(right)),
      kinds: [...entry.kinds].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => right.memberCount - left.memberCount || left.key.localeCompare(right.key));
}

function clusterKeyForRow(row: Record<string, unknown>): string {
  const kind = stringField(row, "resourceKind");
  const instructions = stringArrayField(row, "instructionNames");
  if (kind === "binding-command" && instructions.length > 0) {
    return `instr:${instructions[0]}`;
  }
  const file = sourceFileBasename(row);
  return file === null ? "unfiled" : `file:${file}`;
}

function sourceFileBasename(row: Record<string, unknown>): string | null {
  for (const field of ["definitionSource", "source", "declarationSource"]) {
    const candidate = row[field];
    if (candidate !== null && typeof candidate === "object") {
      const filePath = (candidate as Record<string, unknown>).filePath;
      if (typeof filePath === "string" && filePath.length > 0) {
        return filePath.split("/").at(-1) ?? null;
      }
    }
  }
  return null;
}

function stringArrayField(row: Record<string, unknown>, field: string): readonly string[] {
  const candidate = row[field];
  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function answerFrameworkFamily(
  lens: LensId,
  projection: string,
  sourceProject: SourceProject,
  rows: number,
): Answer | undefined {
  const inquiry: Inquiry = {
    lens,
    locus: RepoRootLocus,
    projection,
    budget: { rows, evidencePerSubject: 0 },
  };
  switch (lens) {
    case LensId.FrameworkResources:
      return answerFrameworkResources(inquiry, sourceProject);
    case LensId.FrameworkObservation:
      return answerFrameworkObservation(inquiry, sourceProject);
    case LensId.FrameworkRouter:
      return answerFrameworkRouter(inquiry, sourceProject);
    case LensId.FrameworkDi:
      return answerFrameworkDi(inquiry, sourceProject);
    case LensId.FrameworkRendering:
      return answerFrameworkRendering(inquiry, sourceProject);
    case LensId.FrameworkCompiler:
      return answerFrameworkCompiler(inquiry, sourceProject);
    case LensId.FrameworkComposition:
      return answerFrameworkComposition(inquiry, sourceProject);
    case LensId.FrameworkAdmission:
      return answerFrameworkAdmission(inquiry, sourceProject);
    case LensId.FrameworkDiscovery:
      return answerFrameworkDiscovery(inquiry, sourceProject);
    case LensId.BridgeAuLink:
      return answerBridgeAuLink(inquiry, sourceProject);
    default:
      return undefined;
  }
}

function symbolFromExportRow(row: Record<string, unknown>): string | null {
  const symbolName = stringField(row, "symbolName");
  if (symbolName !== null) {
    return symbolName;
  }
  const id = stringField(row, "id") ?? stringField(row, "exportEntry");
  if (id === null) {
    return null;
  }
  const segment = id.split(":").at(-1);
  return segment !== undefined && segment.length > 0 ? segment : null;
}

function stringField(row: Record<string, unknown>, field: string): string | null {
  const value = row[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberField(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  return typeof value === "number" ? value : 0;
}

function readArrayField(value: unknown, field: string): readonly Record<string, unknown>[] {
  if (value === null || value === undefined || typeof value !== "object") {
    return [];
  }
  const candidate = (value as Record<string, unknown>)[field];
  if (!Array.isArray(candidate)) {
    return [];
  }
  return candidate.filter(
    (row): row is Record<string, unknown> => row !== null && typeof row === "object",
  );
}
