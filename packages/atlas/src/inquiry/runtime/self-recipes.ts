import { LensId } from "../lens.js";
import { LocusKind } from "../locus.js";
import { SourceSelectorScheme } from "../../source/index.js";

/** Exact inquiry payload embedded in an Atlas self-analysis recipe. */
export interface AtlasSelfRecipeAsk {
  readonly lens: LensId;
  readonly locus?: unknown;
  readonly subject?: unknown;
  readonly projection: string;
  readonly filters?: Record<string, unknown>;
  readonly budget?: Record<string, unknown>;
  readonly page?: Record<string, unknown>;
}

/** One calibrated hop inside an Atlas self-analysis recipe. */
export interface AtlasSelfRecipeHop {
  readonly id: string;
  readonly purpose: string;
  readonly ask: AtlasSelfRecipeAsk;
  readonly read: readonly string[];
  readonly follow?: string;
}

/** A small hop graph for using Atlas to inspect and evolve Atlas itself. */
export interface AtlasSelfRecipeRow {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly domains: readonly string[];
  readonly startingPoint: string;
  readonly hops: readonly AtlasSelfRecipeHop[];
  readonly calibrationNotes: readonly string[];
}

/** Calibrated self-analysis recipes for future Atlas maintenance sessions. */
export const ATLAS_SELF_RECIPES: readonly AtlasSelfRecipeRow[] = [
  {
    id: "inquiry-taxonomy-coherence",
    title: "Inquiry taxonomy and continuation coherence",
    question:
      "When a lens, projection, continuation, or relationship row grows, which Atlas surfaces show whether the inquiry algebra is staying coherent or splitting into parallel value spaces?",
    domains: [
      "inquiry-algebra",
      "taxonomy",
      "continuations",
      "relationships",
      "refactoring",
    ],
    startingPoint:
      "Start from the target lens contract, then compare observed projection branches, continuation targets, row axes, and the answerer source body.",
    hops: [
      {
        id: "self-contract-target",
        purpose:
          "Join declared lens contract projections with the runtime implementation branch set.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "contracts",
          filters: { lensId: "atlas.self" },
          budget: { rows: 16, evidencePerSubject: 4 },
        },
        read: [
          "value.contracts[].declaredProjectionIds",
          "value.contracts[].observedProjectionIds",
          "value.contracts[].unobservedProjectionIds",
          "value.contracts[].extraRuntimeProjectionIds",
          "value.contracts[].declaredParameterIds",
          "value.contracts[].duplicateParameterIds",
          "value.contracts[].coherenceFacts",
          "continuations pointing at implementation source",
        ],
      },
      {
        id: "self-projection-branches",
        purpose:
          "Inspect the projection switch branches that actually define the answer surface.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "projections",
          filters: { lensId: "atlas.self" },
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.projectionBranches[].projection",
          "value.projectionBranches[].functionName",
          "value.projectionBranches[].source",
          "source continuations for suspicious or duplicated branch sites",
        ],
      },
      {
        id: "self-continuation-edges",
        purpose:
          "Check whether continuations carry explicit target lens, target projection, and route-relation evidence.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "continuations",
          filters: { lensId: "atlas.self" },
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.continuationRows[].targetLens",
          "value.continuationRows[].targetProjection",
          "value.continuationRows[].routeRelationMember",
          "value.continuationRows[].source",
        ],
      },
      {
        id: "enum-value-spaces",
        purpose:
          "Inspect enum member values and raw literal overlap before deciding whether a value space should stay as an enum, collapse into a primitive, or become a richer row type.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "enum-value-spaces",
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.enumValueSpaces[].value",
          "value.enumValueSpaces[].enumNames",
          "value.enumValueSpaces[].memberNames",
          "value.enumValueSpaces[].rawValueOccurrenceCount",
          "source continuations for raw value occurrences",
        ],
      },
      {
        id: "enum-translation-edges",
        purpose:
          "Find exact enum-to-enum translations before smoothing them with local mappings or aliases.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "enum-mappings",
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.enumMappings[].fromEnumName",
          "value.enumMappings[].toEnumName",
          "value.enumMappings[].carrier",
          "value.enumMappings[].evidence",
          "value.enumMappings[].source",
        ],
      },
      {
        id: "axis-pressure",
        purpose:
          "Find exact enum, mapper, stringly-field, and parallel-axis pressure before changing shared primitives.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "axis-pressure",
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.axisPressure[].kind",
          "value.axisPressure[].axis",
          "value.axisPressure[].valueSpace",
          "value.axisPressure[].signals",
          "source continuations for mapper or parallel-axis rows",
        ],
      },
      {
        id: "relationship-surfaces",
        purpose:
          "Separate actual relationship rows from filters, classifiers, route contracts, and plain data rows.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "relationship-surfaces",
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.relationshipSurfaces[].name",
          "value.relationshipSurfaces[].surfaceRole",
          "value.relationshipSurfaces[].fields",
          "value.relationshipSurfaces[].hasSource",
          "value.relationshipSurfaces[].hasRelation",
        ],
      },
      {
        id: "answerer-facts",
        purpose:
          "Resolve the answerer as a TypeChecker declaration and expose declaration-sized source continuations.",
        ask: {
          lens: LensId.TsType,
          subject: {
            scheme: SourceSelectorScheme.Declaration,
            name: "AtlasSelfAnswerer",
            kind: "class",
            packageId: "atlas",
          },
          projection: "facts",
          budget: { rows: 8, evidencePerSubject: 4 },
        },
        read: [
          "evidence[].source for the class declaration range",
          "continuations where inquiry.lens is ts.source",
        ],
        follow:
          "Follow the ts.source continuation for packages/atlas/src/inquiry/runtime/lenses.ts when branch shape or answer composition needs implementation context.",
      },
    ],
    calibrationNotes: [
      "Use this before adding new projections or relationship axes; it keeps declared contract, observed implementation, and continuation route claims visible together.",
      "A high-pressure row is not automatically a bug. Treat it as a prompt to ask whether two value spaces are actually the same concept, or whether the ontology needs a cleaner split.",
      "Prefer source continuations emitted by the rows over opening files directly; the row provenance selects the relevant declaration or branch.",
    ],
  },
  {
    id: "self-analysis-substrate-growth",
    title: "Self-analysis substrate growth without split-brain maintenance",
    question:
      "When Atlas needs a new self-analysis fact, row family, or substrate surface signal, where should it enter the source-backed substrate and how do we keep the public answer surface compact?",
    domains: [
      "self-analysis",
      "substrate",
      "substrate-surface",
      "source-project",
      "architecture",
    ],
    startingPoint:
      "Start with the self-analysis substrate surfaces, then inspect the builder class, the exported function surfaces, and the package module graph.",
    hops: [
      {
        id: "substrate-surfaces",
        purpose:
          "See which reader, builder, and schema surfaces Atlas already recognizes.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "substrate-surfaces",
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.substrateSurfaces[].kind",
          "value.substrateSurfaces[].name",
          "value.substrateSurfaces[].filePath",
          "value.substrateSurfaces[].source",
        ],
      },
      {
        id: "builder-class-surface",
        purpose:
          "Inspect the OOP surface that owns the AST walk and row collection lifecycle.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "classes",
          filters: { className: "AtlasSelfAnalysisBuilder" },
          budget: { rows: 8, evidencePerSubject: 4 },
        },
        read: [
          "value.classSurfaces[].methods",
          "value.classSurfaces[].properties",
          "value.classSurfaces[].source",
          "source continuation for the class body",
        ],
      },
      {
        id: "builder-facts",
        purpose:
          "Resolve the builder through the TypeChecker when method bodies, private fields, or references matter.",
        ask: {
          lens: LensId.TsType,
          subject: {
            scheme: SourceSelectorScheme.Declaration,
            name: "AtlasSelfAnalysisBuilder",
            kind: "class",
            packageId: "atlas",
          },
          projection: "facts",
          budget: { rows: 8, evidencePerSubject: 4 },
        },
        read: [
          "value.facts",
          "evidence[].source for the implementation declaration",
          "continuations where inquiry.lens is ts.source",
        ],
        follow:
          "Follow the source continuation when adding a new row collector or changing finalization order.",
      },
      {
        id: "self-analysis-functions",
        purpose:
          "Find exported and top-level helpers whose names reveal interpretation or derivation logic.",
        ask: {
          lens: LensId.AtlasSelf,
          locus: { kind: LocusKind.Repo },
          projection: "functions",
          filters: { query: "analysis" },
          budget: { rows: 40, evidencePerSubject: 4 },
        },
        read: [
          "value.functionSurfaces[].name",
          "value.functionSurfaces[].functionKind",
          "value.functionSurfaces[].filePath",
          "value.functionSurfaces[].source",
        ],
      },
      {
        id: "runtime-module-neighborhood",
        purpose:
          "Check whether a new self-analysis feature belongs in runtime/lenses.ts, self-analysis.ts, or a decomposed module.",
        ask: {
          lens: LensId.TsStructure,
          subject: {
            scheme: SourceSelectorScheme.Directory,
            path: "packages/atlas/src/inquiry/runtime",
            recursive: false,
          },
          projection: "module-graph",
          budget: { rows: 80, evidencePerSubject: 3 },
        },
        read: [
          "value.moduleGraph.edges[].fromFile",
          "value.moduleGraph.edges[].toFile",
          "value.moduleGraph.edges[].moduleSpecifier",
          "continuations into source rows for suspicious dependency direction",
        ],
      },
      {
        id: "self-diagnostics",
        purpose:
          "End by checking TypeScript diagnostics through the same API surface that future agents will use.",
        ask: {
          lens: LensId.TsType,
          locus: { kind: LocusKind.Package, packageId: "atlas" },
          projection: "diagnostics",
          budget: { rows: 40, evidencePerSubject: 3 },
        },
        read: [
          "value.diagnostics.entries[].code",
          "value.diagnostics.entries[].filePath",
          "value.diagnostics.entries[].messageText",
          "source continuations for diagnostic ranges",
        ],
      },
    ],
    calibrationNotes: [
      "Keep raw AST-derived rows in the self-analysis model and keep answer projections as compact views over that model.",
      "If a new row family needs a bespoke string filter or enum mapping, first ask whether the lower taxonomy should own that axis.",
      "Use the module graph to decide decomposition pressure; do not let one large answer file become the only place where self-analysis facts are interpreted.",
    ],
  },
];

/** Return self-analysis recipes filtered by broad maintenance dimensions. */
export function filterAtlasSelfRecipes(
  filters: Readonly<Record<string, unknown>> | undefined,
): readonly AtlasSelfRecipeRow[] {
  const domain =
    typeof filters?.domain === "string" && filters.domain.length > 0
      ? filters.domain
      : undefined;
  const query =
    typeof filters?.query === "string" && filters.query.length > 0
      ? filters.query.toLowerCase()
      : undefined;
  return ATLAS_SELF_RECIPES.filter(
    (recipe) =>
      (domain === undefined || recipe.domains.includes(domain)) &&
      (query === undefined ||
        recipe.id.toLowerCase().includes(query) ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.question.toLowerCase().includes(query) ||
        recipe.domains.some((entry) => entry.toLowerCase().includes(query))),
  );
}
