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
 * framework.capability-coverage
 *
 * Mechanical completeness instrument. It enumerates Aurelia capability constructs straight from
 * framework source through the source-reading framework.* lenses and reports which constructs the
 * curated framework.capabilities map does not yet represent. This inverts the capability lens's
 * evidence-trace projection (curated row -> backing lens): here the lenses are ground truth and the
 * curated map is the thing under test. Output is a compact coverage signal grouped by kind, never a
 * full row dump, so the context budget stays in Atlas rather than in the reader.
 */

assertKnownScriptArguments("framework:capability-coverage", [
  "--json",
  "--rows=",
]);

const json = process.argv.includes("--json");
const rowBudget = scriptNumberArgumentValue("--rows=") ?? 500;

/** One source-derived construct normalized for coverage matching. */
interface SourceConstruct {
  /** Capability family the construct belongs to. */
  readonly family: string;
  /** Construct kind within the family, used for grouping. */
  readonly kind: string;
  /** Human-facing identity for the coverage report. */
  readonly displayName: string;
  /** Owning framework package id. */
  readonly packageId: string;
  /** Terms that prove the exact source-derived construct is represented by name. */
  readonly exactMatchTerms: readonly string[];
  /** Terms that prove the construct is covered by a broader capability row. */
  readonly broadMatchTerms: readonly string[];
  /** Framework-internal machinery rather than an author-facing capability. */
  readonly internal: boolean;
}

/** A capability family plus the source lens/projection that enumerates its constructs. */
interface CoverageFamily {
  /** Stable family id. */
  readonly id: string;
  /** Source lens that reads the framework checkout for this family. */
  readonly lens: LensId;
  /** Lens projection that enumerates the family constructs. */
  readonly projection: string;
  /** Normalize the lens answer value into coverage constructs. */
  readonly constructsOf: (value: unknown) => readonly SourceConstruct[];
}

interface ResourceConvergenceRow {
  readonly resourceKind: string;
  readonly resourceName: string | null;
  readonly targetName: string;
  readonly packageId: string;
}

/** Resource kinds that are framework dispatch machinery, not author-facing capabilities. */
const INTERNAL_RESOURCE_KINDS = new Set(["renderer"]);

const RESOURCE_FAMILY: CoverageFamily = {
  id: "resources",
  lens: LensId.FrameworkResources,
  projection: "definitions",
  constructsOf: (value) =>
    readArrayField<ResourceConvergenceRow>(value, "convergenceRows").map((row) => ({
      family: "resources",
      kind: row.resourceKind,
      displayName: row.resourceName ?? row.targetName,
      packageId: row.packageId,
      // The template-facing name is the distinctive identity; class names only when there is none.
      exactMatchTerms:
        row.resourceName !== null && row.resourceName.length > 0
          ? [row.resourceName]
          : [row.targetName],
      broadMatchTerms: [row.resourceKind],
      internal: INTERNAL_RESOURCE_KINDS.has(row.resourceKind),
    })),
};

/** Families wired into the coverage join. Add one entry per source-enumerable family. */
const COVERAGE_FAMILIES: readonly CoverageFamily[] = [RESOURCE_FAMILY];

interface CapabilityRow {
  readonly id: string;
  readonly title: string;
  readonly frameworkConcepts: readonly string[];
  readonly userFacingForms: readonly string[];
  readonly summary: string;
}

interface CapabilitiesValue {
  readonly capabilityRows?: readonly CapabilityRow[];
}

interface FamilyCoverage {
  readonly family: string;
  readonly total: number;
  readonly internal: readonly SourceConstruct[];
  readonly publicTotal: number;
  readonly exact: number;
  readonly broad: number;
  readonly broadOnly: readonly SourceConstruct[];
  readonly uncovered: readonly SourceConstruct[];
}

const api = createApi({ idleTtlMs: 120_000, requestTimeoutMs: 180_000 });

const capabilitiesAnswer = await api.ask({
  lens: LensId.FrameworkCapabilities,
  locus: RepoRootLocus,
  projection: "catalog",
  budget: { rows: rowBudget, evidencePerSubject: 0 },
});
assertHitOrMissAnswer("framework.capabilities:catalog", capabilitiesAnswer);
const capabilityRows = answerValue<CapabilitiesValue>(capabilitiesAnswer)?.capabilityRows ?? [];
const corpus = capabilityCorpus(capabilityRows);

const familyCoverages: FamilyCoverage[] = [];
for (const family of COVERAGE_FAMILIES) {
  const answer = await api.ask({
    lens: family.lens,
    locus: RepoRootLocus,
    projection: family.projection,
    budget: { rows: rowBudget, evidencePerSubject: 0 },
  });
  assertHitOrMissAnswer(`${family.lens}:${family.projection}`, answer);
  const constructs = family.constructsOf(answer.value);
  const internal = constructs.filter((construct) => construct.internal);
  const publicConstructs = constructs.filter((construct) => !construct.internal);
  const exact = publicConstructs.filter((construct) => isExactlyRepresented(construct, corpus));
  const broad = publicConstructs.filter((construct) => isBroadlyRepresented(construct, corpus));
  const broadOnly = publicConstructs.filter((construct) =>
    !isExactlyRepresented(construct, corpus) && isBroadlyRepresented(construct, corpus)
  );
  const uncovered = publicConstructs.filter((construct) => !isBroadlyRepresented(construct, corpus));
  familyCoverages.push({
    family: family.id,
    total: constructs.length,
    internal,
    publicTotal: publicConstructs.length,
    exact: exact.length,
    broad: broad.length,
    broadOnly,
    uncovered,
  });
}

if (json) {
  console.log(
    JSON.stringify(
      { tool: "framework.capability-coverage", capabilityRows: capabilityRows.length, families: familyCoverages },
      null,
      2,
    ),
  );
  process.exit(0);
}

printCoverage(familyCoverages, capabilityRows.length);

function printCoverage(families: readonly FamilyCoverage[], capabilityRowCount: number): void {
  console.log("framework.capability-coverage");
  console.log(
    `source-derived constructs checked against ${capabilityRowCount} curated framework.capabilities row(s)`,
  );
  for (const family of families) {
    console.log("");
    console.log(`family: ${family.family}`);
    console.log(`- source constructs: ${family.total}`);
    console.log(`- internal constructs not counted as author-facing capability gaps: ${family.internal.length}`);
    console.log(`- author-facing constructs: ${family.publicTotal}`);
    console.log(`- exact construct identity represented: ${family.exact}`);
    console.log(`- covered by broad capability kind: ${family.broad}`);
    console.log(`- broad-only coverage: ${family.broadOnly.length}`);
    console.log(`- not covered: ${family.uncovered.length}`);
    if (family.internal.length > 0) {
      console.log("");
      console.log("internal constructs (not counted as gaps):");
      for (const [kind, constructs] of groupByKind(family.internal)) {
        const names = constructs
          .map((construct) => construct.displayName)
          .sort((left, right) => left.localeCompare(right))
          .join(", ");
        console.log(`- ${kind} [${constructs.length}]: ${names}`);
      }
    }
    if (family.broadOnly.length > 0) {
      console.log("");
      console.log("broad-only coverage (by kind):");
      for (const [kind, constructs] of groupByKind(family.broadOnly)) {
        const names = constructs
          .map((construct) => construct.displayName)
          .sort((left, right) => left.localeCompare(right))
          .join(", ");
        console.log(`- ${kind} [${constructs.length}]: ${names}`);
      }
    }
    if (family.uncovered.length === 0) {
      continue;
    }
    console.log("");
    console.log("not covered (by kind):");
    for (const [kind, constructs] of groupByKind(family.uncovered)) {
      const names = constructs
        .map((construct) => construct.displayName)
        .sort((left, right) => left.localeCompare(right))
        .join(", ");
      console.log(`- ${kind} [${constructs.length}]: ${names}`);
    }
  }
}

function groupByKind(
  constructs: readonly SourceConstruct[],
): readonly (readonly [string, readonly SourceConstruct[]])[] {
  const groups = new Map<string, SourceConstruct[]>();
  for (const construct of constructs) {
    const bucket = groups.get(construct.kind) ?? [];
    bucket.push(construct);
    groups.set(construct.kind, bucket);
  }
  return [...groups.entries()].sort((left, right) => right[1].length - left[1].length);
}

function capabilityCorpus(rows: readonly CapabilityRow[]): string {
  return rows
    .map((row) =>
      [row.id, row.title, ...row.frameworkConcepts, ...row.userFacingForms, row.summary].join(" "),
    )
    .join("\n")
    .toLowerCase();
}

function isExactlyRepresented(construct: SourceConstruct, corpus: string): boolean {
  return construct.exactMatchTerms.some((term) => corpusHasTerm(corpus, term));
}

function isBroadlyRepresented(construct: SourceConstruct, corpus: string): boolean {
  return isExactlyRepresented(construct, corpus)
    || construct.broadMatchTerms.some((term) => corpusHasTerm(corpus, term));
}

function corpusHasTerm(corpus: string, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (normalized.length < 2) {
    return false;
  }
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Hyphen-aware word boundary so "case" does not match inside "default-case".
  return new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`).test(corpus);
}

function readArrayField<TRow>(value: unknown, field: string): readonly TRow[] {
  if (value === null || typeof value !== "object") {
    return [];
  }
  const candidate = (value as Record<string, unknown>)[field];
  return Array.isArray(candidate) ? (candidate as readonly TRow[]) : [];
}
