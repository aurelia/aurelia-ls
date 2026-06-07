import { LensId } from "../inquiry/lens.js";
import { RepoRootLocus } from "../inquiry/locus.js";
import { createApi } from "../session/index.js";
import { assertKnownScriptArguments, scriptNumberArgumentValue } from "./script-output.js";

/**
 * framework.territory
 *
 * Source-derived census of the Aurelia capability territory. For each framework family it asks the
 * source-reading lens that enumerates that family's constructs and prints, per array field: the row
 * count, a few sample identities, and the distinct low-cardinality facet vocabularies (the
 * classifying string fields). It makes no in/out decisions — exclusions belong to semantic-runtime
 * ontology work, not to Atlas. The goal is one complete, token-bounded view of "what exists" and the
 * vocabulary each family classifies by, from which the ontology can be derived with on-demand lens
 * drill-down for detail.
 *
 * The facet vocabularies double as a cross-family overlap detector: the same concept spelled under
 * different field names across families is the accidental-ontology-drift signal.
 */

assertKnownScriptArguments("framework:territory", ["--json", "--rows=", "--names=", "--facetMax=", "--rowKeys"]);

const json = process.argv.includes("--json");
const showRowKeys = process.argv.includes("--rowKeys");
const rowBudget = scriptNumberArgumentValue("--rows=") ?? 400;
const nameSamples = scriptNumberArgumentValue("--names=") ?? 5;
const facetMax = scriptNumberArgumentValue("--facetMax=") ?? 24;

/** A framework family plus a best-known lens/projection that enumerates its constructs. */
interface FamilyProbe {
  readonly id: string;
  readonly lens: LensId;
  readonly projection: string;
}

const FAMILY_PROBES: readonly FamilyProbe[] = [
  { id: "resources", lens: LensId.FrameworkResources, projection: "definitions" },
  { id: "observation", lens: LensId.FrameworkObservation, projection: "entities" },
  { id: "router", lens: LensId.FrameworkRouter, projection: "relationships" },
  { id: "di", lens: LensId.FrameworkDi, projection: "registrations" },
  { id: "rendering", lens: LensId.FrameworkRendering, projection: "binding-products" },
  { id: "compiler", lens: LensId.FrameworkCompiler, projection: "instruction-products" },
  { id: "composition", lens: LensId.FrameworkComposition, projection: "actors" },
  { id: "admission", lens: LensId.FrameworkAdmission, projection: "catalogs" },
  { id: "expression", lens: LensId.FrameworkDiscovery, projection: "expression-entities" },
  { id: "observation-decisions", lens: LensId.FrameworkObservation, projection: "observer-locator-decisions" },
  { id: "rendering-syntax", lens: LensId.FrameworkRendering, projection: "syntax-products" },
  { id: "rendering-controllers", lens: LensId.FrameworkRendering, projection: "controller-creations" },
  { id: "compiler-attr", lens: LensId.FrameworkCompiler, projection: "attribute-classification" },
  { id: "router-flow", lens: LensId.FrameworkRouter, projection: "flow" },
];

/** Row fields tried, in order, to derive a compact display identity for a construct. */
const NAME_FIELDS = ["resourceName", "name", "symbolName", "exportEntry", "title", "label", "instructionName", "bindingName", "catalogName", "relation", "id"];

interface ArrayFieldSummary {
  readonly field: string;
  readonly count: number;
  readonly rowKeys: readonly string[];
  readonly samples: readonly string[];
  readonly facets: readonly FacetSummary[];
}

interface FacetSummary {
  readonly field: string;
  readonly values: readonly string[];
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });
const report: Record<string, unknown> = {};

for (const probe of FAMILY_PROBES) {
  try {
    const answer = await api.ask({
      lens: probe.lens,
      locus: RepoRootLocus,
      projection: probe.projection,
      budget: { rows: rowBudget, evidencePerSubject: 0 },
    });
    const arrays = arrayFieldsOf(answer.value);
    report[probe.id] = { lens: probe.lens, projection: probe.projection, outcome: answer.outcome, arrays };
    if (json) {
      continue;
    }
    console.log("");
    console.log(`family ${probe.id} -> ${probe.lens}:${probe.projection} (${answer.outcome})`);
    if (arrays.length === 0) {
      console.log("  (no array fields in value)");
    }
    for (const summary of arrays) {
      console.log(`  ${summary.field} [${summary.count}]: ${summary.samples.join(" | ")}`);
      if (showRowKeys) {
        console.log(`    rowKeys: ${summary.rowKeys.join(", ")}`);
      }
      for (const facet of summary.facets) {
        console.log(`    ~${facet.field} {${facet.values.length}}: ${facet.values.join(", ")}`);
      }
    }
  } catch (error) {
    console.log(`family ${probe.id} (${probe.lens}:${probe.projection}) -> ERROR ${(error as Error).message}`);
  }
}

if (json) {
  console.log(JSON.stringify({ tool: "framework.territory", report }, null, 2));
}

function arrayFieldsOf(value: unknown): readonly ArrayFieldSummary[] {
  if (value === null || typeof value !== "object") {
    return [];
  }
  const summaries: ArrayFieldSummary[] = [];
  for (const [field, candidate] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    const first = candidate[0];
    summaries.push({
      field,
      count: candidate.length,
      rowKeys: first !== null && typeof first === "object" ? Object.keys(first as object) : [],
      samples: candidate.slice(0, nameSamples).map(displayName),
      facets: facetsOf(candidate),
    });
  }
  return summaries;
}

function displayName(row: unknown): string {
  if (row === null || typeof row !== "object") {
    return String(row);
  }
  const record = row as Record<string, unknown>;
  for (const field of NAME_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return JSON.stringify(record).slice(0, 50);
}

/** Distinct low-cardinality string / string-array fields across the rows: the family's vocabulary. */
function facetsOf(rows: readonly unknown[]): readonly FacetSummary[] {
  const values = new Map<string, Set<string>>();
  const disqualified = new Set<string>();
  for (const row of rows) {
    if (row === null || typeof row !== "object") {
      continue;
    }
    for (const [field, raw] of Object.entries(row as Record<string, unknown>)) {
      if (disqualified.has(field)) {
        continue;
      }
      const strings = stringValuesOf(raw);
      if (strings === null) {
        disqualified.add(field);
        values.delete(field);
        continue;
      }
      const set = values.get(field) ?? new Set<string>();
      for (const value of strings) {
        set.add(value);
      }
      if (set.size > facetMax) {
        disqualified.add(field);
        values.delete(field);
        continue;
      }
      values.set(field, set);
    }
  }
  const facets: FacetSummary[] = [];
  for (const [field, set] of values) {
    if (set.size >= 2) {
      facets.push({ field, values: [...set].sort((left, right) => left.localeCompare(right)) });
    }
  }
  return facets.sort((left, right) => left.values.length - right.values.length);
}

/** Return the string values of a field, or null when the field is not a pure string/string-array facet. */
function stringValuesOf(raw: unknown): readonly string[] | null {
  if (typeof raw === "string") {
    return raw.length > 0 ? [raw] : [];
  }
  if (Array.isArray(raw)) {
    const strings: string[] = [];
    for (const entry of raw) {
      if (typeof entry !== "string") {
        return null;
      }
      strings.push(entry);
    }
    return strings;
  }
  return null;
}
