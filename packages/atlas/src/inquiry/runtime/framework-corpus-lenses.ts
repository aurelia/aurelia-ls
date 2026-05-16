import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, RepoRootLocus, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { evidenceLimit, pageOffset, rowLimit } from "../paging.js";
import type { SourceProject } from "../../source/index.js";
import {
  readFrameworkCorpusAnalysis,
  compareFixtureSeedPressure,
  type FrameworkCorpusAnalysis,
  type FrameworkCorpusDocRow,
  type FrameworkCorpusDocSnippetRow,
  type FrameworkCorpusExpectedEffectDescriptorRow,
  type FrameworkCorpusFixtureSeedRow,
  type FrameworkCorpusLegacyPackageRow,
  type FrameworkCorpusTestRow,
  type FrameworkCorpusTestSnippetRow,
} from "./framework-corpus-analysis.js";
import { frameworkSourceStateBaseValue } from "./framework-source-state-value.js";
import {
  inquiryBooleanFilter,
  inquiryLowerStringFilter,
  inquiryStringFilter,
  matchesAnyFilterValue,
  queryMatches,
  querySignificantPartialMatches,
} from "./lens-filter-utils.js";
import { optionalNextPageContinuation } from "./lens-continuation-utils.js";
import {
  frameworkCorpusFixtureSeedHasClassificationKey,
  frameworkCorpusFixtureSeedMatchesClassification,
} from "./framework-corpus-classification.js";
import { frameworkCorpusFixtureSeedQueryScore } from "./framework-corpus-row-relevance.js";

export interface FrameworkCorpusValue {
  readonly version: FrameworkCorpusAnalysis["version"];
  readonly sourceState: FrameworkCorpusAnalysis["sourceState"];
  readonly rollup: FrameworkCorpusAnalysis["rollup"];
  readonly docs?: readonly FrameworkCorpusDocRow[];
  readonly docSnippets?: readonly FrameworkCorpusDocSnippetRow[];
  readonly tests?: readonly FrameworkCorpusTestRow[];
  readonly testSnippets?: readonly FrameworkCorpusTestSnippetRow[];
  readonly legacyPackages?: readonly FrameworkCorpusLegacyPackageRow[];
  readonly expectedEffectDescriptors?: readonly FrameworkCorpusExpectedEffectDescriptorRow[];
  readonly fixtureSeeds?: readonly FrameworkCorpusFixtureSeedRow[];
}

type FrameworkCorpusProjection =
  | "summary"
  | "docs"
  | "doc-snippets"
  | "tests"
  | "test-snippets"
  | "legacy"
  | "expected-effects"
  | "fixture-seeds";

export function answerFrameworkCorpus(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<FrameworkCorpusValue> {
  const analysis = readFrameworkCorpusAnalysis(sourceProject);
  const basis = frameworkCorpusBasis(sourceProject);
  switch (frameworkCorpusProjection(inquiry)) {
    case "summary":
      return answerFrameworkCorpusSummary(inquiry, analysis, basis);
    case "docs":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:docs",
        "framework documentation file row(s)",
        [...filterDocRows(analysis.docs, inquiry)].sort(compareDocPressure),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), docs: rows }),
        evidenceForDocRow,
        sourceForCorpusRow,
      );
    case "doc-snippets":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:doc-snippets",
        "framework documentation snippet row(s)",
        [...filterDocSnippetRows(analysis.docSnippets, inquiry)].sort(compareDocSnippetPressure),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), docSnippets: rows }),
        evidenceForDocSnippetRow,
        sourceForCorpusRow,
      );
    case "tests":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:tests",
        "framework test file row(s)",
        [...filterTestRows(analysis.tests, inquiry)].sort(compareTestPressure),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), tests: rows }),
        evidenceForTestRow,
        sourceForCorpusRow,
      );
    case "test-snippets":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:test-snippets",
        "framework test snippet row(s)",
        [...filterTestSnippetRows(analysis.testSnippets, inquiry)].sort(compareTestSnippetPressure),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), testSnippets: rows }),
        evidenceForTestSnippetRow,
        sourceForCorpusRow,
      );
    case "legacy":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:legacy",
        "legacy replacement package row(s)",
        filterLegacyPackageRows(analysis.legacyPackages, inquiry),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), legacyPackages: rows }),
        evidenceForLegacyPackageRow,
      );
    case "expected-effects":
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:expected-effects",
        "semantic-runtime expected-effect descriptor row(s)",
        [...filterExpectedEffectDescriptorRows(analysis.expectedEffectDescriptors, inquiry)]
          .sort(compareExpectedEffectDescriptorRows),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), expectedEffectDescriptors: rows }),
        evidenceForExpectedEffectDescriptorRow,
        sourceForCorpusRow,
      );
    case "fixture-seeds":
      const fixtureSeedFilters = frameworkCorpusFilters(inquiry);
      return answerFrameworkCorpusRows(
        inquiry,
        "framework.corpus:fixture-seeds",
        "framework fixture seed row(s)",
        [...filterFixtureSeedRows(analysis.fixtureSeeds, fixtureSeedFilters)]
          .sort((left, right) => compareFixtureSeedRows(left, right, fixtureSeedFilters)),
        basis,
        (rows) => ({ ...frameworkSourceStateBaseValue(analysis), fixtureSeeds: rows }),
        evidenceForFixtureSeedRow,
        sourceForCorpusRow,
      );
  }
}

function answerFrameworkCorpusSummary(
  inquiry: Inquiry,
  analysis: FrameworkCorpusAnalysis,
  basis: readonly Basis[],
): Answer<FrameworkCorpusValue> {
  const docs = [...filterDocRows(analysis.docs, inquiry)]
    .sort(compareDocPressure)
    .slice(0, rowLimit(inquiry));
  const tests = [...filterTestRows(analysis.tests, inquiry)]
    .sort(compareTestPressure)
    .slice(0, rowLimit(inquiry));
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    `Read ${analysis.rollup.docFileCount} doc file(s), ${analysis.rollup.docSnippetCount} doc snippet(s), ${analysis.rollup.testFileCount} framework test file(s), ${analysis.rollup.testSnippetCount} framework test snippet(s), and ${analysis.rollup.legacyPackageCount} legacy package row(s). ${analysis.sourceState.summary}`,
    {
      value: {
        ...frameworkSourceStateBaseValue(analysis),
        docs,
        tests,
      },
      basis,
      evidence: [
        ...docs.slice(0, evidenceLimit(inquiry)).map(evidenceForDocRow),
        ...tests.slice(0, evidenceLimit(inquiry)).map(evidenceForTestRow),
      ],
      continuations: frameworkCorpusContinuations(inquiry),
    },
  );
}

function answerFrameworkCorpusRows<TRow>(
  inquiry: Inquiry,
  familyId: string,
  rowLabel: string,
  rows: readonly TRow[],
  basis: readonly Basis[],
  valueWithRows: (rows: readonly TRow[]) => FrameworkCorpusValue,
  evidenceForRow: (row: TRow) => Evidence,
  sourceForRow?: (row: TRow) => SourceRange,
): Answer<FrameworkCorpusValue> {
  const rowFamily = new PagedRowFamily<TRow>({
    id: familyId,
    rowLabel,
    evidenceForRow,
    continuationsForPage: (inquiry, _rows, nextOffset, limit) => [
      ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
        priority: ContinuationPriority.Secondary,
        rationale: "Continue the paged framework corpus row family.",
        routeSummary: "Next framework corpus row page.",
      }),
      ...frameworkCorpusSourceContinuations(inquiry, _rows, sourceForRow),
      ...frameworkCorpusContinuations(inquiry),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows,
    limit: rowLimit(inquiry),
    offset: pageOffset(inquiry),
    basis,
    value: (page) => valueWithRows(page.rows),
  });
}

function frameworkCorpusProjection(
  inquiry: Inquiry,
): FrameworkCorpusProjection {
  switch (inquiry.projection) {
    case "docs":
    case "doc-snippets":
    case "tests":
    case "test-snippets":
    case "legacy":
    case "expected-effects":
    case "fixture-seeds":
      return inquiry.projection;
    default:
      return "summary";
  }
}

function filterDocRows(
  rows: readonly FrameworkCorpusDocRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusDocRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    matchesPathAndGroup(row, filters) &&
    matchesAnyFilterValue(row.concepts, filters.concept) &&
    corpusQueryMatches(filters, [
      row.id,
      row.filePath,
      row.group,
      row.title ?? "",
      row.summary,
      ...row.fenceLanguages,
      ...row.concepts,
      ...row.aureliaPackageImports,
    ]),
  );
}

function filterDocSnippetRows(
  rows: readonly FrameworkCorpusDocSnippetRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusDocSnippetRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    matchesPathAndGroup(row, filters) &&
    matchesAnyFilterValue(row.concepts, filters.concept) &&
    (filters.language === undefined || row.language === filters.language) &&
    (filters.snippetKind === undefined || row.kind === filters.snippetKind) &&
    corpusQueryMatches(filters, [
      row.id,
      row.filePath,
      row.group,
      row.kind,
      row.language,
      row.summary,
      row.preview,
      ...row.concepts,
    ]),
  );
}

function filterTestRows(
  rows: readonly FrameworkCorpusTestRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusTestRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    matchesPathAndGroup(row, filters) &&
    matchesAnyFilterValue(row.concepts, filters.concept) &&
    (filters.generated === undefined || row.generated === filters.generated) &&
    corpusQueryMatches(filters, [
      row.id,
      row.filePath,
      row.group,
      row.summary,
      ...row.concepts,
    ]),
  );
}

function filterTestSnippetRows(
  rows: readonly FrameworkCorpusTestSnippetRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusTestSnippetRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    matchesPathAndGroup(row, filters) &&
    matchesAnyFilterValue(row.concepts, filters.concept) &&
    (filters.generated === undefined || row.generated === filters.generated) &&
    (filters.snippetKind === undefined || row.kind === filters.snippetKind) &&
    corpusQueryMatches(filters, [
      row.id,
      row.filePath,
      row.group,
      row.kind,
      row.name ?? "",
      row.summary,
      row.preview,
      ...row.concepts,
    ]),
  );
}

function filterLegacyPackageRows(
  rows: readonly FrameworkCorpusLegacyPackageRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusLegacyPackageRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    (filters.path === undefined || row.packagePath.includes(filters.path)) &&
    corpusQueryMatches(filters, [
      row.id,
      row.packagePath,
      row.name ?? "",
      row.summary,
      ...row.aureliaDependencies,
      ...row.topSourceGroups.map((group) => group.name),
    ]),
  );
}

function filterExpectedEffectDescriptorRows(
  rows: readonly FrameworkCorpusExpectedEffectDescriptorRow[],
  inquiry: Inquiry,
): readonly FrameworkCorpusExpectedEffectDescriptorRow[] {
  const filters = frameworkCorpusFilters(inquiry);
  return rows.filter((row) =>
    (filters.effectKind === undefined || row.effectKind === filters.effectKind) &&
    (filters.effectRole === undefined || row.effectRole === filters.effectRole) &&
    (filters.effectSeedPolicy === undefined || row.seedPolicy === filters.effectSeedPolicy) &&
    corpusQueryMatches(filters, [
      row.id,
      row.contractKind,
      row.key,
      row.effectKind ?? "",
      row.effectRole ?? "",
      row.seedPolicy ?? "",
      row.summary,
      "expected-effect",
      "semantic-effect",
      "authoring expected effect",
    ]),
  );
}

function filterFixtureSeedRows(
  rows: readonly FrameworkCorpusFixtureSeedRow[],
  filters: FrameworkCorpusFilters,
): readonly FrameworkCorpusFixtureSeedRow[] {
  return rows.filter((row) =>
    matchesPathAndGroup(row, filters) &&
    matchesAnyFilterValue(row.concepts, filters.concept) &&
    (filters.generated === undefined || row.generated === filters.generated) &&
    (filters.sourceKind === undefined || row.sourceKind === filters.sourceKind) &&
    (filters.seedUse === undefined || row.seedUse === filters.seedUse) &&
    (filters.effectKind === undefined || row.effectHints.some((effect) => effect === filters.effectKind)) &&
    matchesExpectedEffectFilter(row, filters) &&
    (filters.recipeKey === undefined || row.recipeHints.some((recipe) => recipe === filters.recipeKey)) &&
    frameworkCorpusFixtureSeedMatchesClassification(row, filters) &&
    (filters.language === undefined || row.language === filters.language) &&
    (filters.snippetKind === undefined || row.snippetKind === filters.snippetKind) &&
    corpusQueryMatches(filters, [
      row.id,
      row.sourceId,
      row.filePath,
      row.group,
      row.seedUse,
      row.sourceKind,
      row.language ?? "",
      row.snippetKind,
      row.summary,
      row.preview,
      ...row.concepts,
      ...row.effectHints,
      ...row.classificationReasons.flatMap((reason) => [
        reason.kind,
        reason.key,
        `${reason.kind}:${reason.key}`,
        reason.summary,
      ]),
      ...row.expectedEffects.flatMap((effect) => [
        effect.effectKind,
        effect.contractSummary ?? "",
        effect.contractDeclared ? "declared expected-effect" : "undeclared expected-effect",
        "semantic-effect",
        "authoring expected effect",
        ...effect.filters.flatMap((filter) => [
          filter.field,
          String(filter.value ?? ""),
          `${filter.field}=${String(filter.value ?? "")}`,
          filter.summary,
        ]),
      ]),
    ]),
  );
}

function compareFixtureSeedRows(
  left: FrameworkCorpusFixtureSeedRow,
  right: FrameworkCorpusFixtureSeedRow,
  filters: FrameworkCorpusFilters,
): number {
  return frameworkCorpusFixtureSeedQueryScore(right, filters.query) - frameworkCorpusFixtureSeedQueryScore(left, filters.query) ||
    fixtureSeedFilterFocusScore(right, filters) - fixtureSeedFilterFocusScore(left, filters) ||
    compareFixtureSeedPressure(left, right);
}

function fixtureSeedFilterFocusScore(
  row: FrameworkCorpusFixtureSeedRow,
  filters: FrameworkCorpusFilters,
): number {
  let score = 0;
  if (row.effectHints.length === 0) {
    score -= 200;
  } else {
    score += Math.min(row.effectHints.length, 8) * 8;
  }
  if (filters.concept !== undefined) {
    if (pathIncludesToken(row.filePath, filters.concept)) {
      score += 120;
    }
    if (row.group === filters.concept) {
      score += 60;
    }
    if (filters.concept === "forms") {
      score += formFixtureSeedFocusScore(row);
    }
    score -= Math.max(0, row.concepts.length - 1) * 2;
  }
  if (
    filters.expectedEffectFilterField !== undefined &&
    row.expectedEffects.some((effect) =>
      effect.filters.some((filter) =>
        filter.field === filters.expectedEffectFilterField &&
        (
          filters.expectedEffectFilterValue === undefined ||
          String(filter.value ?? "") === filters.expectedEffectFilterValue
        )
      )
    )
  ) {
    score += 40;
  }
  if (filters.effectKind !== undefined && row.effectHints.includes(filters.effectKind as never)) {
    score += 30;
  }
  if (filters.recipeKey !== undefined && row.recipeHints.includes(filters.recipeKey as never)) {
    score += 30;
  }
  if (
    filters.classificationKind !== undefined &&
    row.classificationReasons.some((reason) => reason.kind === filters.classificationKind)
  ) {
    score += 30;
  }
  if (
    filters.classificationKey !== undefined &&
    row.classificationReasons.some((reason) => reason.key === filters.classificationKey)
  ) {
    score += 60;
  }
  return score;
}

function formFixtureSeedFocusScore(row: FrameworkCorpusFixtureSeedRow): number {
  let score = 0;
  if (frameworkCorpusFixtureSeedHasClassificationKey(row, "native-form-control")) {
    score += 100;
  }
  if (frameworkCorpusFixtureSeedHasClassificationKey(row, "native-value-binding")) {
    score += 90;
  }
  if (frameworkCorpusFixtureSeedHasClassificationKey(row, "native-checked-binding")) {
    score += 90;
  }
  if (frameworkCorpusFixtureSeedHasClassificationKey(row, "option-model-binding")) {
    score += 70;
  }
  if (frameworkCorpusFixtureSeedHasClassificationKey(row, "direct-service-form")) {
    score -= 100;
  }
  return score;
}

function pathIncludesToken(
  filePath: string,
  token: string,
): boolean {
  return filePath
    .toLowerCase()
    .split(/[\\/._-]+/u)
    .includes(token.toLowerCase());
}

function compareDocPressure(
  left: FrameworkCorpusDocRow,
  right: FrameworkCorpusDocRow,
): number {
  return docPressureScore(right) - docPressureScore(left) ||
    right.fenceCount - left.fenceCount ||
    left.filePath.localeCompare(right.filePath);
}

function compareTestPressure(
  left: FrameworkCorpusTestRow,
  right: FrameworkCorpusTestRow,
): number {
  return testPressureScore(right) - testPressureScore(left) ||
    right.itCount - left.itCount ||
    left.filePath.localeCompare(right.filePath);
}

function compareDocSnippetPressure(
  left: FrameworkCorpusDocSnippetRow,
  right: FrameworkCorpusDocSnippetRow,
): number {
  return conceptWeight(right.concepts) - conceptWeight(left.concepts) ||
    right.preview.length - left.preview.length ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line;
}

function compareTestSnippetPressure(
  left: FrameworkCorpusTestSnippetRow,
  right: FrameworkCorpusTestSnippetRow,
): number {
  return Number(left.generated) - Number(right.generated) ||
    snippetKindWeight(right.kind) - snippetKindWeight(left.kind) ||
    conceptWeight(right.concepts) - conceptWeight(left.concepts) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line;
}

function docPressureScore(row: FrameworkCorpusDocRow): number {
  return conceptWeight(row.concepts) + row.fenceCount;
}

function testPressureScore(row: FrameworkCorpusTestRow): number {
  return conceptWeight(row.concepts) +
    row.itCount +
    row.createFixtureCount * 4 +
    row.assertHtmlCount * 2;
}

function snippetKindWeight(kind: FrameworkCorpusTestSnippetRow["kind"]): number {
  switch (kind) {
    case "create-fixture-call":
      return 100;
    case "it-call":
      return 50;
    case "describe-call":
      return 0;
  }
}

function conceptWeight(concepts: readonly string[]): number {
  return concepts.length * 10;
}

function compareExpectedEffectDescriptorRows(
  left: FrameworkCorpusExpectedEffectDescriptorRow,
  right: FrameworkCorpusExpectedEffectDescriptorRow,
): number {
  return left.contractKind.localeCompare(right.contractKind) ||
    left.key.localeCompare(right.key);
}

interface FrameworkCorpusFilters {
  readonly query?: string;
  readonly queryMode?: "all" | "partial";
  readonly concept?: string;
  readonly group?: string;
  readonly path?: string;
  readonly language?: string;
  readonly snippetKind?: string;
  readonly generated?: boolean;
  readonly sourceKind?: string;
  readonly seedUse?: string;
  readonly effectKind?: string;
  readonly effectRole?: string;
  readonly effectSeedPolicy?: string;
  readonly recipeKey?: string;
  readonly classificationKind?: string;
  readonly classificationKey?: string;
  readonly expectedEffectFilterField?: string;
  readonly expectedEffectFilterValue?: string;
}

function frameworkCorpusFilters(inquiry: Inquiry): FrameworkCorpusFilters {
  return {
    query: inquiryStringFilter(inquiry, "query"),
    queryMode: frameworkCorpusQueryModeFilter(inquiryLowerStringFilter(inquiry, "queryMode")),
    concept: frameworkCorpusConceptFilter(inquiryLowerStringFilter(inquiry, "concept")),
    group: inquiryStringFilter(inquiry, "group"),
    path: inquiryStringFilter(inquiry, "path"),
    language: inquiryStringFilter(inquiry, "language"),
    snippetKind: inquiryStringFilter(inquiry, "snippetKind"),
    generated: inquiryBooleanFilter(inquiry, "generated"),
    sourceKind: inquiryStringFilter(inquiry, "sourceKind"),
    seedUse: inquiryStringFilter(inquiry, "seedUse"),
    effectKind: inquiryStringFilter(inquiry, "effectKind"),
    effectRole: inquiryStringFilter(inquiry, "effectRole"),
    effectSeedPolicy: inquiryStringFilter(inquiry, "effectSeedPolicy"),
    recipeKey: inquiryStringFilter(inquiry, "recipeKey"),
    classificationKind: inquiryStringFilter(inquiry, "classificationKind"),
    classificationKey: inquiryStringFilter(inquiry, "classificationKey"),
    expectedEffectFilterField: inquiryStringFilter(inquiry, "expectedEffectFilterField"),
    expectedEffectFilterValue: inquiryStringFilter(inquiry, "expectedEffectFilterValue"),
  };
}

function corpusQueryMatches(
  filters: FrameworkCorpusFilters,
  values: readonly string[],
): boolean {
  return filters.queryMode === "partial"
    ? querySignificantPartialMatches(filters.query, values)
    : queryMatches(filters.query, values);
}

function frameworkCorpusQueryModeFilter(
  value: string | undefined,
): "all" | "partial" | undefined {
  switch (value) {
    case "partial":
    case "any":
    case "explore":
      return "partial";
    case "all":
    case "exact":
    case undefined:
      return undefined;
    default:
      return undefined;
  }
}

function frameworkCorpusConceptFilter(
  concept: string | undefined,
): string | undefined {
  switch (concept) {
    case "template":
      return "templates";
    case "expressions":
    case "expr":
      return "expression";
    default:
      return concept;
  }
}

function matchesExpectedEffectFilter(
  row: FrameworkCorpusFixtureSeedRow,
  filters: FrameworkCorpusFilters,
): boolean {
  if (filters.expectedEffectFilterField === undefined && filters.expectedEffectFilterValue === undefined) {
    return true;
  }
  return row.expectedEffects.some((effect) =>
    (filters.effectKind === undefined || effect.effectKind === filters.effectKind) &&
    effect.filters.some((effectFilter) =>
      (filters.expectedEffectFilterField === undefined || effectFilter.field === filters.expectedEffectFilterField) &&
      (filters.expectedEffectFilterValue === undefined || String(effectFilter.value ?? "") === filters.expectedEffectFilterValue)
    )
  );
}

function matchesPathAndGroup(
  row: { readonly filePath: string; readonly group: string },
  filters: FrameworkCorpusFilters,
): boolean {
  return (filters.path === undefined || row.filePath.includes(filters.path)) &&
    (filters.group === undefined || row.group === filters.group);
}

function evidenceForDocRow(row: FrameworkCorpusDocRow): Evidence {
  return sourceEvidence(
    row.id,
    `${row.filePath} is a framework documentation file with ${row.fenceCount} code fence(s) and concepts ${row.concepts.join(", ") || "<none>"}.`,
    row.source,
  );
}

function evidenceForDocSnippetRow(row: FrameworkCorpusDocSnippetRow): Evidence {
  return sourceEvidence(
    row.id,
    `${row.filePath} has a ${row.language} documentation code fence at line ${row.source.start.line + 1}.`,
    row.source,
  );
}

function evidenceForTestRow(row: FrameworkCorpusTestRow): Evidence {
  return sourceEvidence(
    row.id,
    `${row.filePath} has ${row.itCount} test case(s), ${row.createFixtureCount} createFixture reference(s), and concepts ${row.concepts.join(", ") || "<none>"}.`,
    row.source,
  );
}

function evidenceForTestSnippetRow(row: FrameworkCorpusTestSnippetRow): Evidence {
  return sourceEvidence(
    row.id,
    `${row.filePath} has a ${row.kind} at line ${row.source.start.line + 1}: ${row.name ?? "<unnamed>"}.`,
    row.source,
  );
}

function evidenceForLegacyPackageRow(
  row: FrameworkCorpusLegacyPackageRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    data: {
      packagePath: row.packagePath,
      sourceFiles: row.sourceFiles,
      sourceLines: row.sourceLines,
      aureliaDependencies: row.aureliaDependencies,
    },
  };
}

function evidenceForExpectedEffectDescriptorRow(
  row: FrameworkCorpusExpectedEffectDescriptorRow,
): Evidence {
  return sourceEvidence(
    row.id,
    `${row.key} is a semantic-runtime authoring expected-effect ${row.contractKind} contract` +
      `${row.seedPolicy === null ? "" : ` with ${row.seedPolicy} seed policy`}: ${row.summary}`,
    row.source,
  );
}

function evidenceForFixtureSeedRow(row: FrameworkCorpusFixtureSeedRow): Evidence {
  const reasonSummary = row.classificationReasons
    .slice(0, 4)
    .map((reason) => `${reason.kind}:${reason.key}`)
    .join(", ");
  return sourceEvidence(
    row.id,
    `${row.sourceKind} fixture seed at ${row.filePath}:${row.source.start.line + 1} hints expected effects ${row.effectHints.join(", ") || "<none>"} and recipes ${row.recipeHints.join(", ") || "<none>"}; reasons ${reasonSummary || "<none>"}.`,
    row.source,
  );
}

function sourceEvidence(
  id: string,
  summary: string,
  source: FrameworkCorpusDocRow["source"],
): Evidence {
  return {
    id,
    kind: EvidenceKind.SourceSpan,
    role: EvidenceRole.Example,
    confidence: EvidenceConfidence.Heuristic,
    summary,
    source,
  };
}

function frameworkCorpusBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    {
      kind: BasisKind.SourceText,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Contract,
      freshness: BasisFreshness.Live,
      identity: sourceProject.snapshot().identity,
      summary:
        "Scanned the local Aurelia documentation, framework test corpus, and legacy package roots as fixture and authoring pressure seeds.",
      limitations: [
        "Concept tags are lexical steering signals for fixture selection, not proof of framework semantics.",
        "Documentation and framework test files are not all admitted into the TypeScript Program, so source evidence may point at filesystem text rather than checker-backed declarations.",
      ],
    },
  ];
}

function sourceForCorpusRow(
  row: { readonly source: SourceRange },
): SourceRange {
  return row.source;
}

function frameworkCorpusSourceContinuations<TRow>(
  inquiry: Inquiry,
  rows: readonly TRow[],
  sourceForRow: ((row: TRow) => SourceRange) | undefined,
): readonly Continuation[] {
  if (sourceForRow === undefined) {
    return [];
  }
  return rows
    .slice(0, 3)
    .map((row, index) => corpusSourceContinuation(inquiry, index, sourceForRow(row)));
}

function corpusSourceContinuation(
  inquiry: Inquiry,
  index: number,
  source: SourceRange,
): Continuation {
  const id = `framework-corpus-source:${source.filePath}:${source.start.line}:${source.start.character}`;
  const evidence = sourceEvidence(
    id,
    `Framework corpus source at ${source.filePath}:${source.start.line + 1}.`,
    source,
  );
  return {
    id: `framework.corpus:source:${index}`,
    kind: ContinuationKind.InspectEvidence,
    priority: ContinuationPriority.Secondary,
    rationale: "Inspect the exact source text behind this framework corpus row.",
    inquiry: {
      lens: LensId.TsSource,
      locus: {
        kind: LocusKind.SourceRange,
        range: source,
      },
      projection: "text",
      budget: inquiry.budget,
    },
    evidence: [evidence],
    route: navigationRoute(
      NavigationPlane.Inspection,
      NavigationRelation.SourceFor,
      [BasisKind.SourceText],
      "Exact source text for a framework corpus row.",
    ),
  };
}

function frameworkCorpusContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    corpusProjectionContinuation(inquiry, "docs", "Inspect documentation files that can seed authoring and fixture pressure."),
    corpusProjectionContinuation(inquiry, "doc-snippets", "Inspect documentation code fences as fixture recipe seeds."),
    corpusProjectionContinuation(inquiry, "tests", "Inspect framework test files as behavior-grounding pressure."),
    corpusProjectionContinuation(inquiry, "test-snippets", "Inspect framework test call sites and fixture examples."),
    corpusProjectionContinuation(inquiry, "legacy", "Inspect legacy package replacement inventory."),
    corpusProjectionContinuation(inquiry, "expected-effects", "Inspect semantic-runtime expected-effect contracts used to interpret fixture seed hints."),
    corpusProjectionContinuation(inquiry, "fixture-seeds", "Inspect docs/test snippets ranked as authoring fixture seeds with expected-effect hints."),
  ];
}

function corpusProjectionContinuation(
  inquiry: Inquiry,
  projection: FrameworkCorpusProjection,
  rationale: string,
): Continuation {
  return {
    id: `framework.corpus:${projection}`,
    kind: ContinuationKind.SwitchLens,
    priority: projection === inquiry.projection
      ? ContinuationPriority.Secondary
      : ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      lens: LensId.FrameworkCorpus,
      locus: RepoRootLocus,
      projection,
      page: undefined,
    },
    route: navigationRoute(
      NavigationPlane.Semantic,
      NavigationRelation.FrameworkFlowOf,
      [BasisKind.SourceText],
      `Framework corpus ${projection} projection.`,
    ),
  };
}
