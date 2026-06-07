import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import {
  answerValue,
  assertHitOrMissAnswer,
  assertKnownScriptArguments,
  scriptNumberArgumentValue,
} from "./script-output.js";

/**
 * framework.capability-reverse-coverage
 *
 * Reverse coverage: which source-derived framework constructs are mirrored by a semantic-runtime
 * auLink anchor, and which are not. It joins the catalog-shaped territory families (each construct is
 * a framework class/symbol) against bridge.aulink mirror targets by framework symbol name.
 *
 * It is construct-kind aware but does NOT hide: every not-mirrored construct is reported, grouped and
 * labelled by framework export shape. Instantiable shapes (class, di-interface) are the real
 * reverse-map candidates and are listed in full; non-instantiable shapes (factory functions,
 * type-union aliases, plain interfaces, enum values) are bounded in the terminal but complete in
 * --json. Atlas does not decide what is in or out of the ontology — it makes the shapes visible so the
 * semantic-runtime ontology work can decide. A not-mirrored construct is either not-yet-modeled or an
 * intentional scope cut.
 *
 * Relationship-graph families (router/di/admission) and decision-grammar families do not symbol-join
 * cleanly and are intentionally out of this instrument; they need a relation-level reverse join.
 */

assertKnownScriptArguments("framework:reverse-coverage", ["--json", "--rows=", "--shapeCap="]);

const json = process.argv.includes("--json");
const rowBudget = scriptNumberArgumentValue("--rows=") ?? 600;
const noisyShapeCap = scriptNumberArgumentValue("--shapeCap=") ?? 12;

/** Framework export shapes a product concept most directly mirrors; used for ordering, not for hiding. */
const INSTANTIABLE_SHAPES = new Set(["class", "di-interface"]);
const UNSHAPED = "<unshaped>";

interface MirrorRow {
  readonly symbolName: string;
  readonly packageId: string;
  readonly roleEvidenceCount: number;
}

interface MirrorValue {
  readonly mirror?: readonly MirrorRow[];
}

/** A catalog-shaped framework family whose constructs are framework classes/symbols. */
interface CatalogFamily {
  readonly id: string;
  readonly lens: LensId;
  readonly projection: string;
  readonly arrayField: string;
  /** Extract the framework symbol name used as the auLink join key. */
  readonly symbolOf: (row: Record<string, unknown>) => string | null;
  /** Extract the framework export shape, when the family carries one. */
  readonly shapeOf?: (row: Record<string, unknown>) => string | null;
}

const CATALOG_FAMILIES: readonly CatalogFamily[] = [
  { id: "resources", lens: LensId.FrameworkResources, projection: "definitions", arrayField: "convergenceRows", symbolOf: (row) => stringField(row, "targetName") },
  { id: "expression", lens: LensId.FrameworkDiscovery, projection: "expression-entities", arrayField: "expressionEntities", symbolOf: symbolFromExportRow, shapeOf: (row) => stringField(row, "exportShape") },
  { id: "observation", lens: LensId.FrameworkObservation, projection: "entities", arrayField: "observers", symbolOf: symbolFromExportRow, shapeOf: (row) => stringField(row, "exportShape") },
  { id: "compiler", lens: LensId.FrameworkCompiler, projection: "instruction-products", arrayField: "instructionProducts", symbolOf: (row) => stringField(row, "instructionName") },
  { id: "rendering", lens: LensId.FrameworkRendering, projection: "binding-products", arrayField: "bindingProducts", symbolOf: (row) => stringField(row, "bindingName") },
];

interface ConstructRow {
  shape: string;
  readonly mirrored: boolean;
  readonly roleEvidence: boolean;
}

interface ShapeGroup {
  readonly shape: string;
  readonly instantiable: boolean;
  readonly symbols: readonly string[];
}

interface FamilyReverseCoverage {
  readonly family: string;
  readonly total: number;
  readonly mirrored: number;
  readonly mirroredWithRoleEvidence: number;
  readonly instantiableTotal: number;
  readonly instantiableMirrored: number;
  readonly notMirroredByShape: readonly ShapeGroup[];
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const mirrorAnswer = await api.ask({
  lens: LensId.BridgeAuLink,
  locus: RepoRootLocus,
  projection: "mirror",
  budget: { rows: rowBudget, evidencePerSubject: 0 },
});
assertHitOrMissAnswer("bridge.aulink:mirror", mirrorAnswer);
const mirrorBySymbol = new Map<string, MirrorRow>();
for (const row of answerValue<MirrorValue>(mirrorAnswer)?.mirror ?? []) {
  if (typeof row.symbolName === "string" && row.symbolName.length > 0) {
    mirrorBySymbol.set(row.symbolName, row);
  }
}

const coverages: FamilyReverseCoverage[] = [];
for (const family of CATALOG_FAMILIES) {
  const answer = await api.ask({
    lens: family.lens,
    locus: RepoRootLocus,
    projection: family.projection,
    budget: { rows: rowBudget, evidencePerSubject: 0 },
  });
  assertHitOrMissAnswer(`${family.lens}:${family.projection}`, answer);

  const bySymbol = new Map<string, ConstructRow>();
  for (const row of readArrayField(answer.value, family.arrayField)) {
    const symbol = family.symbolOf(row);
    if (symbol === null || symbol.length === 0) {
      continue;
    }
    const shape = (family.shapeOf === undefined ? null : family.shapeOf(row)) ?? UNSHAPED;
    const existing = bySymbol.get(symbol);
    if (existing === undefined) {
      const mirror = mirrorBySymbol.get(symbol);
      bySymbol.set(symbol, {
        shape,
        mirrored: mirror !== undefined,
        roleEvidence: (mirror?.roleEvidenceCount ?? 0) > 0,
      });
    } else if (!INSTANTIABLE_SHAPES.has(existing.shape) && INSTANTIABLE_SHAPES.has(shape)) {
      existing.shape = shape;
    }
  }

  const constructs = [...bySymbol.entries()];
  const mirrored = constructs.filter(([, row]) => row.mirrored);
  const instantiable = constructs.filter(([, row]) => INSTANTIABLE_SHAPES.has(row.shape));
  const notMirroredByShape = groupNotMirroredByShape(constructs);

  coverages.push({
    family: family.id,
    total: constructs.length,
    mirrored: mirrored.length,
    mirroredWithRoleEvidence: mirrored.filter(([, row]) => row.roleEvidence).length,
    instantiableTotal: instantiable.length,
    instantiableMirrored: instantiable.filter(([, row]) => row.mirrored).length,
    notMirroredByShape,
  });
}

if (json) {
  console.log(
    JSON.stringify(
      { tool: "framework.capability-reverse-coverage", mirrorTargets: mirrorBySymbol.size, families: coverages },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log("framework.capability-reverse-coverage");
console.log(`auLink mirror targets: ${mirrorBySymbol.size} framework symbol(s) anchored by semantic-runtime`);
for (const coverage of coverages) {
  console.log("");
  console.log(
    `family ${coverage.family}: ${coverage.total} construct(s); mirrored ${coverage.mirrored} (role evidence ${coverage.mirroredWithRoleEvidence}); instantiable ${coverage.instantiableMirrored}/${coverage.instantiableTotal} mirrored`,
  );
  for (const group of coverage.notMirroredByShape) {
    const cap = group.instantiable ? group.symbols.length : noisyShapeCap;
    const shown = group.symbols.slice(0, cap);
    const more = group.symbols.length - shown.length;
    console.log(
      `  not mirrored [${group.shape}] (${group.symbols.length}): ${shown.join(", ")}${more > 0 ? `, +${more} more` : ""}`,
    );
  }
}

/** Group the not-mirrored constructs by shape, instantiable shapes first, symbols sorted. */
function groupNotMirroredByShape(constructs: readonly (readonly [string, ConstructRow])[]): readonly ShapeGroup[] {
  const byShape = new Map<string, string[]>();
  for (const [symbol, row] of constructs) {
    if (row.mirrored) {
      continue;
    }
    const bucket = byShape.get(row.shape) ?? [];
    bucket.push(symbol);
    byShape.set(row.shape, bucket);
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

function readArrayField(value: unknown, field: string): readonly Record<string, unknown>[] {
  if (value === null || typeof value !== "object") {
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
