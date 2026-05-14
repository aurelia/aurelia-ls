import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  countBy,
  countNamedEntriesBy,
  uniqueSortedStrings,
} from "../../collections.js";
import { SourceProjectMemo, type SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";

export const FRAMEWORK_CORPUS_ANALYSIS_VERSION = "framework-corpus-analysis.v9";

const frameworkCorpusAnalysisMemo =
  new SourceProjectMemo<FrameworkCorpusAnalysis>();

export type FrameworkCorpusConcept =
  | "binding"
  | "bindables"
  | "di"
  | "forms"
  | "i18n"
  | "lifecycle"
  | "observation"
  | "resources"
  | "router"
  | "state"
  | "styles"
  | "templates";

export type FrameworkCorpusDocSnippetKind = "code-fence";

export type FrameworkCorpusTestSnippetKind =
  | "describe-call"
  | "it-call"
  | "create-fixture-call";

export type FrameworkCorpusFixtureSeedSourceKind =
  | "doc-snippet"
  | "test-snippet";

export type FrameworkCorpusFixtureSeedUse =
  | "authoring-taste"
  | "behavior-grounding";

export type FrameworkCorpusExpectedEffectHint =
  | "app-root"
  | "authoring-capability"
  | "authoring-repair"
  | "authoring-taste"
  | "binding-data-flow"
  | "binding-behavior-application"
  | "binding-target-access"
  | "binding-value-channel"
  | "component"
  | "component-role"
  | "dependency-injection"
  | "external-template"
  | "open-seam-closure"
  | "resource-definition"
  | "route"
  | "runtime-controller"
  | "service-class"
  | "service-interaction"
  | "service-interaction-binding"
  | "style-resource"
  | "target-operation"
  | "template-compilation";

export type FrameworkCorpusExpectedEffectSeedPolicy =
  /** Docs/tests can plausibly supply concrete source snippets for this effect family. */
  | "corpus-pattern"
  /** The effect verifies that an authored project reopened, but does not need its own corpus seed. */
  | "reopen-baseline"
  /** The effect verifies AuthoringOrientation rows, not framework docs/tests source patterns. */
  | "orientation-contract"
  /** The effect verifies absence of open seams after reopen, so source snippets are indirect pressure only. */
  | "closure-contract";

export type FrameworkCorpusFixtureRecipeHint =
  | "minimal-app"
  | "state-backed-form"
  | "validated-state-backed-form"
  | "service-backed-form"
  | "routed-state-backed-form"
  | "pressure-fixture";

export interface FrameworkCorpusSourceState {
  readonly docsRoot: string;
  readonly testsRoot: string;
  readonly docsPresent: boolean;
  readonly testsPresent: boolean;
  readonly summary: string;
}

export interface FrameworkCorpusCountRow {
  readonly name: string;
  readonly count: number;
}

export interface FrameworkCorpusRollup {
  readonly docFileCount: number;
  readonly docSnippetCount: number;
  readonly testFileCount: number;
  readonly testSnippetCount: number;
  readonly legacyPackageCount: number;
  readonly fixtureSeedCount: number;
  readonly expectedEffectDescriptorCount: number;
  readonly legacySourceLineCount: number;
  readonly docFilesByGroup: Readonly<Record<string, number>>;
  readonly testFilesByGroup: Readonly<Record<string, number>>;
  readonly docSnippetsByLanguage: Readonly<Record<string, number>>;
  readonly docRowsByConcept: Readonly<Record<string, number>>;
  readonly docSnippetsByConcept: Readonly<Record<string, number>>;
  readonly testRowsByConcept: Readonly<Record<string, number>>;
  readonly testSnippetsByConcept: Readonly<Record<string, number>>;
  readonly fixtureSeedsByEffect: Readonly<Record<string, number>>;
  readonly fixtureSeedsByRecipe: Readonly<Record<string, number>>;
  readonly fixtureSeedEffectHintsWithoutDescriptor: readonly string[];
  readonly expectedEffectDescriptorsWithoutFixtureSeeds: readonly string[];
  readonly seedableExpectedEffectDescriptorsWithoutFixtureSeeds: readonly string[];
  readonly aureliaPackageImports: Readonly<Record<string, number>>;
}

export interface FrameworkCorpusDocRow {
  readonly id: string;
  readonly filePath: string;
  readonly group: string;
  readonly title: string | null;
  readonly fenceCount: number;
  readonly fenceLanguages: readonly string[];
  readonly concepts: readonly FrameworkCorpusConcept[];
  readonly conceptCounts: Readonly<Record<FrameworkCorpusConcept, number>>;
  readonly aureliaPackageImports: readonly string[];
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkCorpusDocSnippetRow {
  readonly id: string;
  readonly filePath: string;
  readonly group: string;
  readonly kind: FrameworkCorpusDocSnippetKind;
  readonly language: string;
  readonly concepts: readonly FrameworkCorpusConcept[];
  readonly source: SourceRange;
  readonly preview: string;
  readonly summary: string;
}

export interface FrameworkCorpusTestRow {
  readonly id: string;
  readonly filePath: string;
  readonly group: string;
  readonly describeCount: number;
  readonly itCount: number;
  readonly createFixtureCount: number;
  readonly assertHtmlCount: number;
  readonly strictEqualCount: number;
  readonly deepStrictEqualCount: number;
  readonly generated: boolean;
  readonly concepts: readonly FrameworkCorpusConcept[];
  readonly conceptCounts: Readonly<Record<FrameworkCorpusConcept, number>>;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkCorpusTestSnippetRow {
  readonly id: string;
  readonly filePath: string;
  readonly group: string;
  readonly kind: FrameworkCorpusTestSnippetKind;
  readonly name: string | null;
  readonly generated: boolean;
  readonly concepts: readonly FrameworkCorpusConcept[];
  readonly source: SourceRange;
  readonly preview: string;
  readonly summary: string;
}

export interface FrameworkCorpusLegacyPackageRow {
  readonly id: string;
  readonly packagePath: string;
  readonly name: string | null;
  readonly sourceFiles: number;
  readonly testFiles: number;
  readonly sourceLines: number;
  readonly dependsOnSemanticRuntime: boolean;
  readonly dependsOnCompiler: boolean;
  readonly dependsOnSemanticWorkspace: boolean;
  readonly aureliaDependencies: readonly string[];
  readonly topSourceGroups: readonly FrameworkCorpusCountRow[];
  readonly summary: string;
}

export interface FrameworkCorpusExpectedEffectDescriptorRow {
  readonly id: string;
  readonly contractKind: "effect-kind" | "effect-role";
  readonly key: string;
  readonly effectKind: string | null;
  readonly effectRole: string | null;
  readonly seedPolicy: FrameworkCorpusExpectedEffectSeedPolicy | null;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkCorpusFixtureSeedExpectedEffectRow {
  readonly effectKind: FrameworkCorpusExpectedEffectHint;
  readonly filters: readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[];
  readonly contractDeclared: boolean;
  readonly contractSummary: string | null;
  readonly contractSource: SourceRange | null;
}

export interface FrameworkCorpusFixtureSeedExpectedEffectFilterRow {
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly summary: string;
}

export interface FrameworkCorpusFixtureSeedRow {
  readonly id: string;
  readonly sourceKind: FrameworkCorpusFixtureSeedSourceKind;
  readonly sourceId: string;
  readonly filePath: string;
  readonly group: string;
  readonly seedUse: FrameworkCorpusFixtureSeedUse;
  readonly generated: boolean;
  readonly language: string | null;
  readonly snippetKind: FrameworkCorpusDocSnippetKind | FrameworkCorpusTestSnippetKind;
  readonly concepts: readonly FrameworkCorpusConcept[];
  readonly effectHints: readonly FrameworkCorpusExpectedEffectHint[];
  readonly expectedEffects: readonly FrameworkCorpusFixtureSeedExpectedEffectRow[];
  readonly recipeHints: readonly FrameworkCorpusFixtureRecipeHint[];
  readonly source: SourceRange;
  readonly preview: string;
  readonly summary: string;
}

export interface FrameworkCorpusAnalysis {
  readonly version: typeof FRAMEWORK_CORPUS_ANALYSIS_VERSION;
  readonly sourceState: FrameworkCorpusSourceState;
  readonly rollup: FrameworkCorpusRollup;
  readonly docs: readonly FrameworkCorpusDocRow[];
  readonly docSnippets: readonly FrameworkCorpusDocSnippetRow[];
  readonly tests: readonly FrameworkCorpusTestRow[];
  readonly testSnippets: readonly FrameworkCorpusTestSnippetRow[];
  readonly legacyPackages: readonly FrameworkCorpusLegacyPackageRow[];
  readonly expectedEffectDescriptors: readonly FrameworkCorpusExpectedEffectDescriptorRow[];
  readonly fixtureSeeds: readonly FrameworkCorpusFixtureSeedRow[];
}

interface ConceptDescriptor {
  readonly id: FrameworkCorpusConcept;
  readonly pattern: RegExp;
}

interface MarkdownFence {
  readonly language: string;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const FRAMEWORK_DOCS_ROOT = "aurelia/docs/user-docs";
const FRAMEWORK_TESTS_ROOT = "aurelia/packages/__tests__";
const SEMANTIC_RUNTIME_EXPECTED_EFFECT_PATH =
  "packages/semantic-runtime/src/authoring/expected-effect.ts";

const legacyPackages = [
  "packages/compiler",
  "packages/semantic-workspace",
  "packages/ssr",
  "packages/ssg",
  "packages/transform",
  "packages/vite-plugin",
  "packages/language-server",
  "packages/vscode",
] as const;

const CONCEPT_DESCRIPTORS: readonly ConceptDescriptor[] = [
  // Binding syntax and binding commands such as value.bind, model.bind, class.bind, and interpolation.
  { id: "binding", pattern: /\b(?:bind|two-way|from-view|to-view|trigger|delegate|capture|call|value\.bind|model\.bind|checked\.bind|class\.bind|style\.bind)\b|\$\{/giu },
  // Explicit bindable declaration and component input API pressure.
  { id: "bindables", pattern: /@bindable\b|\bbindable\b|\bBindable\b/giu },
  // Dependency injection, container APIs, registrations, and resolver-style helpers.
  { id: "di", pattern: /\b(?:DI|IContainer|Registration|resolve|inject|singleton|transient|newInstanceForScope|factory)\b/giu },
  // Native and Aurelia form controls, select/radio/checkbox semantics, validation, and submit flow.
  { id: "forms", pattern: /\b(?:forms?|checkbox|radio|validation|submit|model\.bind|checked\.bind)\b|<\s*(?:form|input|select|option|textarea|button)\b|\b(?:input|select|option|textarea)\.(?:value|checked)\b/giu },
  // Localization and translation plugin pressure.
  { id: "i18n", pattern: /\b(?:i18n|I18N|translation|translations|t\.bind|t-params)\b/giu },
  // Controller, resource, component, and binding lifecycle phases.
  { id: "lifecycle", pattern: /\b(?:binding|bound|attaching|attached|detaching|detached|hydrating|hydrated|dispose|unbinding)\b/giu },
  // Observer locator, subscriber, accessor, and reactivity concepts.
  { id: "observation", pattern: /\b(?:observe|observer|observation|observable|subscriber|accessor|dirty-check|collection observer)\b/giu },
  // Custom elements, custom attributes, value converters, binding behaviors, and resource registries.
  { id: "resources", pattern: /\b(?:custom element|custom-element|custom attribute|custom-attribute|value converter|value-converter|binding behavior|binding-behavior|template controller|resource)\b/giu },
  // Router configuration, routeable components, viewports, and route recognizer pressure.
  { id: "router", pattern: /\b(?:RouterConfiguration|route|routes|routing|router|au-viewport|viewport|RouteableComponent|RouteConfig)\b/giu },
  // State plugin or app state class pressure.
  { id: "state", pattern: /\b(?:state|store|dispatch|reducer|State)\b/gu },
  // Stylesheet resources plus dynamic class/style binding channels.
  { id: "styles", pattern: /\b(?:stylesheet|stylesheets|cssModules|shadowCSS|style\.bind|class\.bind)\b|(?:\b(?:class|style|css)\s*=\s*['"][^'"]*\$\{)|\b[\w-]+\.(?:class|style)\s*=/giu },
  // Template controllers, repeat/if/switch syntax, interpolation, and template compiler pressure.
  { id: "templates", pattern: /\b(?:template|repeat\.for|if\.bind|else|switch\.bind|with\.bind|promise\.bind)\b|\$\{/giu },
];

export function readFrameworkCorpusAnalysis(
  sourceProject: SourceProject,
): FrameworkCorpusAnalysis {
  return frameworkCorpusAnalysisMemo.read(sourceProject, () =>
    buildFrameworkCorpusAnalysis(sourceProject.repoRoot),
  );
}

function buildFrameworkCorpusAnalysis(repoRoot: string): FrameworkCorpusAnalysis {
  const sourceState = frameworkCorpusSourceState(repoRoot);
  const docs = frameworkDocRows(repoRoot);
  const docSnippets = frameworkDocSnippetRows(repoRoot);
  const tests = frameworkTestRows(repoRoot);
  const testSnippets = frameworkTestSnippetRows(repoRoot);
  const legacy = legacyPackageRows(repoRoot);
  const expectedEffectDescriptors = expectedEffectDescriptorRows(repoRoot);
  const fixtureSeeds = fixtureSeedRows(
    repoRoot,
    docSnippets,
    testSnippets,
    expectedEffectDescriptors,
  );
  return {
    version: FRAMEWORK_CORPUS_ANALYSIS_VERSION,
    sourceState,
    rollup: frameworkCorpusRollup(
      docs,
      docSnippets,
      tests,
      testSnippets,
      legacy,
      expectedEffectDescriptors,
      fixtureSeeds,
    ),
    docs,
    docSnippets,
    tests,
    testSnippets,
    legacyPackages: legacy,
    expectedEffectDescriptors,
    fixtureSeeds,
  };
}

function frameworkCorpusSourceState(repoRoot: string): FrameworkCorpusSourceState {
  const docsPresent = existsSync(path.join(repoRoot, FRAMEWORK_DOCS_ROOT));
  const testsPresent = existsSync(path.join(repoRoot, FRAMEWORK_TESTS_ROOT));
  return {
    docsRoot: FRAMEWORK_DOCS_ROOT,
    testsRoot: FRAMEWORK_TESTS_ROOT,
    docsPresent,
    testsPresent,
    summary: `Framework docs root ${docsPresent ? "is present" : "is missing"} and framework tests root ${testsPresent ? "is present" : "is missing"}.`,
  };
}

function frameworkDocRows(repoRoot: string): readonly FrameworkCorpusDocRow[] {
  return walk(repoRoot, FRAMEWORK_DOCS_ROOT, (file) => file.endsWith(".md"))
    .map((filePath) => {
      const text = read(repoRoot, filePath);
      const fences = markdownFences(text);
      const conceptCounts = conceptCountsFor(text);
      const concepts = conceptsFromCounts(conceptCounts);
      const fenceLanguages = uniqueSortedStrings(fences.map((fence) => fence.language));
      const imports = aureliaPackageImports(text);
      return {
        id: `framework-doc:${filePath}`,
        filePath,
        group: sourceGroup(filePath, `${FRAMEWORK_DOCS_ROOT}/`),
        title: markdownTitle(text),
        fenceCount: fences.length,
        fenceLanguages,
        concepts,
        conceptCounts,
        aureliaPackageImports: imports,
        source: sourceRangeForOffsets(filePath, text, 0, text.length),
        summary: docSummary(filePath, concepts, fences.length),
      };
    });
}

function frameworkDocSnippetRows(repoRoot: string): readonly FrameworkCorpusDocSnippetRow[] {
  return walk(repoRoot, FRAMEWORK_DOCS_ROOT, (file) => file.endsWith(".md"))
    .flatMap((filePath) => {
      const text = read(repoRoot, filePath);
      return markdownFences(text).map((fence, index) => {
        const concepts = conceptsFromCounts(conceptCountsFor(fence.text));
        const source = sourceRangeForOffsets(filePath, text, fence.start, fence.end);
        return {
          id: `framework-doc-snippet:${filePath}:${index}`,
          filePath,
          group: sourceGroup(filePath, `${FRAMEWORK_DOCS_ROOT}/`),
          kind: "code-fence" as const,
          language: fence.language,
          concepts,
          source,
          preview: compactPreview(fence.text),
          summary: `Doc code fence in ${filePath} at line ${source.start.line + 1} (${fence.language}) with ${conceptSummary(concepts)}.`,
        };
      });
    })
    .sort(compareSourceRows);
}

function frameworkTestRows(repoRoot: string): readonly FrameworkCorpusTestRow[] {
  return walk(repoRoot, FRAMEWORK_TESTS_ROOT, (file) => file.endsWith(".ts"))
    .map((filePath) => {
      const text = read(repoRoot, filePath);
      const conceptCounts = conceptCountsFor(text);
      const concepts = conceptsFromCounts(conceptCounts);
      return {
        id: `framework-test:${filePath}`,
        filePath,
        group: sourceGroup(filePath, `${FRAMEWORK_TESTS_ROOT}/src/`),
        describeCount: countMatches(text, /\bdescribe\(/gu),
        itCount: countMatches(text, /(?<!\w)it\(/gu),
        createFixtureCount: countMatches(text, /\bcreateFixture\b/gu),
        assertHtmlCount: countMatches(text, /\bassert\.html\b/gu),
        strictEqualCount: countMatches(text, /\bassert\.strictEqual\b/gu),
        deepStrictEqualCount: countMatches(text, /\bassert\.deepStrictEqual\b/gu),
        generated: filePath.includes("/generated/"),
        concepts,
        conceptCounts,
        source: sourceRangeForOffsets(filePath, text, 0, text.length),
        summary: testSummary(filePath, concepts),
      };
    });
}

function frameworkTestSnippetRows(repoRoot: string): readonly FrameworkCorpusTestSnippetRow[] {
  return walk(repoRoot, FRAMEWORK_TESTS_ROOT, (file) => file.endsWith(".ts"))
    .flatMap((filePath) => {
      const text = read(repoRoot, filePath);
      const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
      const snippets: FrameworkCorpusTestSnippetRow[] = [];
      visit(sourceFile, (node) => {
        if (!ts.isCallExpression(node)) {
          return;
        }
        const kind = testSnippetKind(node.expression);
        if (kind === null) {
          return;
        }
        const snippetText = text.slice(node.getStart(sourceFile), node.getEnd());
        const concepts = conceptsFromCounts(conceptCountsFor(snippetText));
        const source = sourceRangeForOffsets(
          filePath,
          text,
          node.getStart(sourceFile),
          node.getEnd(),
        );
        snippets.push({
          id: `framework-test-snippet:${filePath}:${node.getStart(sourceFile)}`,
          filePath,
          group: sourceGroup(filePath, `${FRAMEWORK_TESTS_ROOT}/src/`),
          kind,
          name: testSnippetName(node),
          generated: filePath.includes("/generated/"),
          concepts,
          source,
          preview: compactPreview(snippetText),
          summary: `Framework test ${kind} in ${filePath} at line ${source.start.line + 1} with ${conceptSummary(concepts)}.`,
        });
      });
      return snippets;
    })
    .sort(compareSourceRows);
}

function legacyPackageRows(repoRoot: string): readonly FrameworkCorpusLegacyPackageRow[] {
  return legacyPackages.map((packagePath) => {
    const manifestPath = `${packagePath}/package.json`;
    const manifest = existsSync(path.join(repoRoot, manifestPath))
      ? readJson(repoRoot, manifestPath)
      : {};
    const sourceFiles = walk(repoRoot, `${packagePath}/src`, (file) =>
      file.endsWith(".ts") || file.endsWith(".tsx"),
    );
    const testFiles = walk(repoRoot, `${packagePath}/test`, (file) =>
      file.endsWith(".ts") || file.endsWith(".tsx"),
    );
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    } as Readonly<Record<string, unknown>>;
    const aureliaDependencies = Object.keys(dependencies)
      .filter((name) => name === "aurelia" || name.startsWith("@aurelia/"))
      .sort();
    const sourceLines = sourceLineCount(repoRoot, sourceFiles);
    return {
      id: `legacy-package:${packagePath}`,
      packagePath,
      name: typeof manifest.name === "string" ? manifest.name : null,
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
      sourceLines,
      dependsOnSemanticRuntime: Object.hasOwn(dependencies, "@aurelia-ls/semantic-runtime"),
      dependsOnCompiler: Object.hasOwn(dependencies, "@aurelia-ls/compiler"),
      dependsOnSemanticWorkspace: Object.hasOwn(dependencies, "@aurelia-ls/semantic-workspace"),
      aureliaDependencies,
      topSourceGroups: countNamedEntriesBy(sourceFiles, (file) =>
        sourceGroup(file, `${packagePath}/src/`),
      ).slice(0, 8),
      summary: `${packagePath} has ${sourceFiles.length} source file(s), ${testFiles.length} test file(s), and ${sourceLines} source line(s).`,
    };
  });
}

function frameworkCorpusRollup(
  docs: readonly FrameworkCorpusDocRow[],
  docSnippets: readonly FrameworkCorpusDocSnippetRow[],
  tests: readonly FrameworkCorpusTestRow[],
  testSnippets: readonly FrameworkCorpusTestSnippetRow[],
  legacy: readonly FrameworkCorpusLegacyPackageRow[],
  expectedEffectDescriptors: readonly FrameworkCorpusExpectedEffectDescriptorRow[],
  fixtureSeeds: readonly FrameworkCorpusFixtureSeedRow[],
): FrameworkCorpusRollup {
  const descriptorKindRows = expectedEffectDescriptors
    .filter((row): row is FrameworkCorpusExpectedEffectDescriptorRow & { readonly effectKind: string } =>
      row.effectKind !== null
    );
  const descriptorKinds = new Set<string>(
    expectedEffectDescriptors
      .map((row) => row.effectKind)
      .filter((effectKind): effectKind is string => effectKind !== null),
  );
  const fixtureSeedEffectKinds = new Set<string>(fixtureSeeds.flatMap((row) => row.effectHints));
  return {
    docFileCount: docs.length,
    docSnippetCount: docSnippets.length,
    testFileCount: tests.length,
    testSnippetCount: testSnippets.length,
    legacyPackageCount: legacy.length,
    fixtureSeedCount: fixtureSeeds.length,
    expectedEffectDescriptorCount: expectedEffectDescriptors.length,
    legacySourceLineCount: legacy.reduce((total, row) => total + row.sourceLines, 0),
    docFilesByGroup: countBy(docs, (row) => row.group),
    testFilesByGroup: countBy(tests, (row) => row.group),
    docSnippetsByLanguage: countBy(docSnippets, (row) => row.language),
    docRowsByConcept: countConceptRows(docs),
    docSnippetsByConcept: countConceptRows(docSnippets),
    testRowsByConcept: countConceptRows(tests),
    testSnippetsByConcept: countConceptRows(testSnippets),
    fixtureSeedsByEffect: countBy(
      fixtureSeeds.flatMap((row) => row.effectHints),
      (effect) => effect,
    ),
    fixtureSeedsByRecipe: countBy(
      fixtureSeeds.flatMap((row) => row.recipeHints),
      (recipe) => recipe,
    ),
    fixtureSeedEffectHintsWithoutDescriptor: uniqueSortedStrings(
      [...fixtureSeedEffectKinds].filter((effect) => !descriptorKinds.has(effect)),
    ),
    expectedEffectDescriptorsWithoutFixtureSeeds: uniqueSortedStrings(
      [...descriptorKinds].filter((effect) => !fixtureSeedEffectKinds.has(effect)),
    ),
    seedableExpectedEffectDescriptorsWithoutFixtureSeeds: uniqueSortedStrings(
      descriptorKindRows
        .filter((row) => row.seedPolicy === "corpus-pattern")
        .map((row) => row.effectKind)
        .filter((effect) => !fixtureSeedEffectKinds.has(effect)),
    ),
    aureliaPackageImports: countBy(
      docs.flatMap((row) => row.aureliaPackageImports),
      (specifier) => specifier,
    ),
  };
}

function fixtureSeedRows(
  repoRoot: string,
  docSnippets: readonly FrameworkCorpusDocSnippetRow[],
  testSnippets: readonly FrameworkCorpusTestSnippetRow[],
  expectedEffectDescriptors: readonly FrameworkCorpusExpectedEffectDescriptorRow[],
): readonly FrameworkCorpusFixtureSeedRow[] {
  const descriptors = expectedEffectDescriptorMap(expectedEffectDescriptors);
  const sourceTextCache = new Map<string, string>();
  const snippetText = (source: SourceRange) =>
    sourceTextForRange(repoRoot, source, sourceTextCache);
  return [
    ...docSnippets.flatMap((row) => fixtureSeedForDocSnippet(row, descriptors, snippetText(row.source))),
    ...testSnippets.flatMap((row) => fixtureSeedForTestSnippet(row, descriptors, snippetText(row.source))),
  ].sort(compareFixtureSeedPressure);
}

function fixtureSeedForDocSnippet(
  row: FrameworkCorpusDocSnippetRow,
  descriptors: ReadonlyMap<string, FrameworkCorpusExpectedEffectDescriptorRow>,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedRow[] {
  const effectHints = expectedEffectHintsForSnippet(row.concepts, snippetText);
  const recipeHints = recipeHintsForConcepts(row.concepts, snippetText);
  if (effectHints.length === 0 && recipeHints.length === 0) {
    return [];
  }
  return [{
    id: `framework-fixture-seed:${row.id}`,
    sourceKind: "doc-snippet",
    sourceId: row.id,
    filePath: row.filePath,
    group: row.group,
    seedUse: "authoring-taste",
    generated: false,
    language: row.language,
    snippetKind: row.kind,
    concepts: row.concepts,
    effectHints,
    expectedEffects: fixtureSeedExpectedEffects(effectHints, descriptors, snippetText),
    recipeHints,
    source: row.source,
    preview: row.preview,
    summary: `Documentation fixture seed for ${effectHints.join(", ") || "recipe exploration"} from ${row.filePath}.`,
  }];
}

function fixtureSeedForTestSnippet(
  row: FrameworkCorpusTestSnippetRow,
  descriptors: ReadonlyMap<string, FrameworkCorpusExpectedEffectDescriptorRow>,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedRow[] {
  const effectHints = expectedEffectHintsForSnippet(row.concepts, snippetText);
  const recipeHints = recipeHintsForConcepts(row.concepts, snippetText);
  if (effectHints.length === 0 && recipeHints.length === 0) {
    return [];
  }
  return [{
    id: `framework-fixture-seed:${row.id}`,
    sourceKind: "test-snippet",
    sourceId: row.id,
    filePath: row.filePath,
    group: row.group,
    seedUse: "behavior-grounding",
    generated: row.generated,
    language: null,
    snippetKind: row.kind,
    concepts: row.concepts,
    effectHints,
    expectedEffects: fixtureSeedExpectedEffects(effectHints, descriptors, snippetText),
    recipeHints,
    source: row.source,
    preview: row.preview,
    summary: `Framework-test fixture seed for ${effectHints.join(", ") || "recipe exploration"} from ${row.filePath}.`,
  }];
}

function expectedEffectDescriptorMap(
  rows: readonly FrameworkCorpusExpectedEffectDescriptorRow[],
): ReadonlyMap<string, FrameworkCorpusExpectedEffectDescriptorRow> {
  return new Map(rows.flatMap((row) =>
    row.effectKind === null
      ? []
      : [[row.effectKind, row] as const]
  ));
}

function fixtureSeedExpectedEffects(
  effectHints: readonly FrameworkCorpusExpectedEffectHint[],
  descriptors: ReadonlyMap<string, FrameworkCorpusExpectedEffectDescriptorRow>,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectRow[] {
  return effectHints.map((effectKind) => {
    const descriptor = descriptors.get(effectKind);
    return {
      effectKind,
      filters: expectedEffectFiltersForSourceText(effectKind, snippetText),
      contractDeclared: descriptor !== undefined,
      contractSummary: descriptor?.summary ?? null,
      contractSource: descriptor?.source ?? null,
    };
  });
}

function expectedEffectDescriptorRows(
  repoRoot: string,
): readonly FrameworkCorpusExpectedEffectDescriptorRow[] {
  const absolute = path.join(repoRoot, SEMANTIC_RUNTIME_EXPECTED_EFFECT_PATH);
  if (!existsSync(absolute)) {
    return [];
  }
  const text = read(repoRoot, SEMANTIC_RUNTIME_EXPECTED_EFFECT_PATH);
  const sourceFile = ts.createSourceFile(
    SEMANTIC_RUNTIME_EXPECTED_EFFECT_PATH,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const rows: FrameworkCorpusExpectedEffectDescriptorRow[] = [];
  visit(sourceFile, (node) => {
    if (
      !ts.isTypeAliasDeclaration(node) ||
      (node.name.text !== "ExpectedSemanticEffectKind" && node.name.text !== "ExpectedSemanticEffectRole") ||
      !ts.isUnionTypeNode(node.type)
    ) {
      return;
    }
    const contractKind = node.name.text === "ExpectedSemanticEffectKind"
      ? "effect-kind"
      : "effect-role";
    for (const member of node.type.types) {
      if (
        !ts.isLiteralTypeNode(member) ||
        !ts.isStringLiteral(member.literal)
      ) {
        continue;
      }
      const key = member.literal.text;
      rows.push({
        id: `semantic-runtime-expected-effect:${contractKind}:${key}`,
        contractKind,
        key,
        effectKind: contractKind === "effect-kind" ? key : null,
        effectRole: contractKind === "effect-role" ? key : null,
        seedPolicy: contractKind === "effect-kind"
          ? expectedEffectSeedPolicy(key)
          : null,
        source: sourceRangeForOffsets(
          SEMANTIC_RUNTIME_EXPECTED_EFFECT_PATH,
          text,
          member.getStart(sourceFile),
          member.getEnd(),
        ),
        summary: expectedEffectCommentSummary(text, member, sourceFile) ??
          `Semantic authoring ${contractKind} ${key}.`,
      });
    }
  });
  return rows.sort((left, right) =>
    left.contractKind.localeCompare(right.contractKind) ||
    left.key.localeCompare(right.key)
  );
}

function expectedEffectCommentSummary(
  text: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  const prefix = text.slice(0, node.getStart(sourceFile));
  const commentEnd = prefix.lastIndexOf("*/");
  if (commentEnd < 0) {
    const lineCommentStart = prefix.lastIndexOf("//");
    const lineBreak = prefix.lastIndexOf("\n");
    return lineCommentStart > lineBreak
      ? cleanCommentText(prefix.slice(lineCommentStart))
      : null;
  }
  const commentStart = prefix.lastIndexOf("/**", commentEnd);
  if (commentStart < 0) {
    return null;
  }
  const cleaned = cleanCommentText(prefix.slice(commentStart, commentEnd + 2));
  return cleaned.length === 0 ? null : cleaned;
}

function cleanCommentText(comment: string): string {
  return comment
    .replace(/^\/\*\*/u, "")
    .replace(/^\/\*/u, "")
    .replace(/\*\/$/u, "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\*\s?/u, "").replace(/^\s*\/\/\/?\s?/u, "").trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

function expectedEffectHintsForSnippet(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): readonly FrameworkCorpusExpectedEffectHint[] {
  const effects = new Set<FrameworkCorpusExpectedEffectHint>();
  for (const concept of concepts) {
    for (const effect of expectedEffectsForConcept(concept)) {
      effects.add(effect);
    }
  }
  for (const effect of expectedEffectsForConceptCombination(concepts, snippetText)) {
    effects.add(effect);
  }
  for (const effect of expectedEffectsForSourceText(snippetText)) {
    effects.add(effect);
  }
  return [...effects].sort();
}

function expectedEffectsForConcept(
  concept: FrameworkCorpusConcept,
): readonly FrameworkCorpusExpectedEffectHint[] {
  switch (concept) {
    case "binding":
      return ["binding-target-access", "binding-data-flow"];
    case "bindables":
      return ["component-role"];
    case "di":
      return ["dependency-injection", "service-class", "service-interaction"];
    case "forms":
      return ["binding-target-access", "binding-value-channel", "binding-data-flow", "component-role"];
    case "i18n":
      return ["dependency-injection"];
    case "lifecycle":
      return ["runtime-controller"];
    case "observation":
      return ["binding-target-access", "binding-value-channel"];
    case "resources":
      return ["resource-definition", "component"];
    case "router":
      return ["route"];
    case "state":
      return ["service-class", "service-interaction"];
    case "styles":
      return ["style-resource", "template-compilation", "runtime-controller"];
    case "templates":
      return ["template-compilation", "runtime-controller"];
  }
}

function expectedEffectsForConceptCombination(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): readonly FrameworkCorpusExpectedEffectHint[] {
  const hasBinding = concepts.includes("binding");
  const hasDi = concepts.includes("di");
  const hasAppState = concepts.includes("forms") || concepts.includes("state");
  const hasServiceOrStateSurface =
    /\b(?:[A-Z][A-Za-z0-9]*Service|I[A-Z][A-Za-z0-9]*Service|service|services\/|State|store|resolve\([^)]*(?:Service|State|Store))/iu.test(snippetText);
  return hasBinding && hasDi && hasAppState && hasServiceOrStateSurface
    ? ["service-interaction-binding"]
    : [];
}

function expectedEffectsForSourceText(
  snippetText: string,
): readonly FrameworkCorpusExpectedEffectHint[] {
  const effects = new Set<FrameworkCorpusExpectedEffectHint>();
  if (/\btemplateUrl\b|\.html['"]|from\s+['"][^'"]+\.html['"]/u.test(snippetText)) {
    effects.add("external-template");
  }
  if (hasValueChannelBindingSurface(snippetText)) {
    effects.add("binding-target-access");
    effects.add("binding-value-channel");
    effects.add("binding-data-flow");
  }
  if (hasBindingBehaviorApplicationSurface(snippetText)) {
    effects.add("binding-behavior-application");
    effects.add("binding-target-access");
    effects.add("binding-data-flow");
  }
  if (hasTargetOperationSurface(snippetText)) {
    effects.add("target-operation");
  }
  return [...effects].sort();
}

function hasValueChannelBindingSurface(snippetText: string): boolean {
  return /\b(?:value|checked|model|class|style)\.(?:bind|two-way|from-view|to-view)\b/u.test(snippetText)
    || /\b[\w-]+\.(?:class|style)\s*=/u.test(snippetText)
    || /(?:\b(?:class|style|css)\s*=\s*['"][^'"]*\$\{)/u.test(snippetText);
}

function hasBindingBehaviorApplicationSurface(snippetText: string): boolean {
  return /(?:\.(?:bind|two-way|from-view|to-view|trigger|delegate)\s*=\s*["'`][^"'`]*&\s*[A-Za-z_$][\w$-]*)/su.test(snippetText)
    || /&\s*validate(?:\b|:)/u.test(snippetText);
}

function hasTargetOperationSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /\b[\w-]+\.(?:class|style)\s*=/u.test(tagText) ||
    /\b(?:class|style|css)\s*=\s*['"][^'"]*(?:\$\{|;|[A-Za-z0-9_-])[^'"]*['"]/u.test(tagText)
  );
}

function hasValidationBindingBehaviorSurface(snippetText: string): boolean {
  return /&\s*validate(?:\b|:)/u.test(snippetText)
    || /\bvalidate binding behavior\b/iu.test(snippetText);
}

function expectedEffectFiltersForSourceText(
  effectKind: FrameworkCorpusExpectedEffectHint,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  if (effectKind === "binding-behavior-application") {
    return bindingBehaviorApplicationFilters(snippetText);
  }
  if (effectKind === "binding-target-access" || effectKind === "binding-value-channel" || effectKind === "binding-data-flow") {
    return bindingTargetPropertyFilters(snippetText);
  }
  if (effectKind === "target-operation") {
    return targetOperationFilters(snippetText);
  }
  return [];
}

function bindingBehaviorApplicationFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const behaviorNames = uniqueSortedStrings([...snippetText.matchAll(/&\s*([A-Za-z_$][\w$-]*)/gu)]
    .map((match) => match[1] ?? "")
    .filter((name) => name.length > 0));
  const staticArgumentValues = uniqueSortedStrings([...snippetText.matchAll(/&\s*[A-Za-z_$][\w$-]*\s*:\s*(['"`])([^'"`]*)\1/gu)]
    .map((match) => match[2] ?? "")
    .filter((value) => value.length > 0));
  return [
    ...(behaviorNames.length === 1
      ? [{
        field: "behaviorName",
        value: behaviorNames[0]!,
        summary: `Snippet has one binding-behavior name: ${behaviorNames[0]}.`,
      }]
      : []),
    ...(staticArgumentValues.length === 1
      ? [{
        field: "staticArgumentValues",
        value: staticArgumentValues[0]!,
        summary: `Snippet has one static binding-behavior argument value: ${staticArgumentValues[0]}.`,
      }]
      : []),
  ];
}

function bindingTargetPropertyFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const targetProperties = uniqueSortedStrings([...snippetText.matchAll(/\b([\w-]+)\.(?:bind|two-way|from-view|to-view)\b/gu)]
    .map((match) => match[1] ?? "")
    .filter((target) => target.length > 0));
  return targetProperties.length === 1
    ? [{
      field: "targetProperty",
      value: targetProperties[0]!,
      summary: `Snippet has one binding command target property: ${targetProperties[0]}.`,
    }]
    : [];
}

function targetOperationFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const targetProperties = uniqueSortedStrings([
    ...htmlLikeTagTexts(snippetText).flatMap((tagText) => [
      ...[...tagText.matchAll(/\b[\w-]+\.(class|style)\s*=/gu)]
        .map((match) => match[1] ?? ""),
      ...[...tagText.matchAll(/\b(class|style|css)\s*=\s*['"][^'"]*(?:\$\{|;|[A-Za-z0-9_-])[^'"]*['"]/gu)]
        .map((match) => match[1] ?? ""),
    ]),
  ].filter((target) => target.length > 0));
  return targetProperties.length === 1
    ? [{
      field: "targetProperty",
      value: targetProperties[0]!,
      summary: `Snippet has one direct target-operation target property: ${targetProperties[0]}.`,
    }]
    : [];
}

function htmlLikeTagTexts(snippetText: string): readonly string[] {
  return [...snippetText.matchAll(/<[A-Za-z][^>]*>/gu)]
    .map((match) => match[0] ?? "");
}

function expectedEffectSeedPolicy(
  effectKind: string,
): FrameworkCorpusExpectedEffectSeedPolicy {
  switch (effectKind) {
    case "project-shape":
    case "app-root":
    case "project-tooling":
      return "reopen-baseline";
    case "authoring-capability":
    case "authoring-taste":
    case "authoring-repair":
      return "orientation-contract";
    case "open-seam-closure":
      return "closure-contract";
    default:
      return "corpus-pattern";
  }
}

function recipeHintsForConcepts(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): readonly FrameworkCorpusFixtureRecipeHint[] {
  const set = new Set<FrameworkCorpusFixtureRecipeHint>();
  const hasValidationSurface = hasValidationBindingBehaviorSurface(snippetText);
  const hasSpecificAppPressure =
    concepts.includes("forms") ||
    concepts.includes("state") ||
    concepts.includes("di") ||
    concepts.includes("router") ||
    hasValidationSurface;
  if (!hasSpecificAppPressure && (concepts.includes("templates") || concepts.includes("resources") || concepts.includes("styles"))) {
    set.add("minimal-app");
  }
  if (concepts.includes("forms") || concepts.includes("state")) {
    set.add("state-backed-form");
  }
  if (hasValidationSurface) {
    set.add("validated-state-backed-form");
  }
  if (concepts.includes("forms") && concepts.includes("di")) {
    set.add("service-backed-form");
  }
  if (concepts.includes("router")) {
    set.add("routed-state-backed-form");
  }
  if (concepts.includes("observation") || concepts.includes("bindables") || concepts.includes("styles")) {
    set.add("pressure-fixture");
  }
  return [...set].sort();
}

function countConceptRows(
  rows: readonly { readonly concepts: readonly FrameworkCorpusConcept[] }[],
): Readonly<Record<string, number>> {
  return countBy(rows.flatMap((row) => row.concepts), (concept) => concept);
}

function markdownFences(text: string): readonly MarkdownFence[] {
  const fences: MarkdownFence[] = [];
  const openPattern = /^```([^\r\n]*)/gmu;
  let open: RegExpExecArray | null;
  while ((open = openPattern.exec(text)) !== null) {
    const openEnd = open.index + open[0].length;
    const closePattern = /^```/gmu;
    closePattern.lastIndex = openEnd;
    const close = closePattern.exec(text);
    if (close === null) {
      break;
    }
    const start = lineBreakEnd(text, openEnd);
    const end = close.index;
    fences.push({
      language: markdownFenceLanguage(open[1] ?? ""),
      text: text.slice(start, end),
      start: open.index,
      end: close.index + close[0].length,
    });
    openPattern.lastIndex = close.index + close[0].length;
  }
  return fences;
}

function lineBreakEnd(text: string, offset: number): number {
  if (text[offset] === "\r" && text[offset + 1] === "\n") {
    return offset + 2;
  }
  if (text[offset] === "\n") {
    return offset + 1;
  }
  return offset;
}

function markdownFenceLanguage(raw: string): string {
  const language = raw.trim().split(/\s+/u)[0] ?? "";
  return language.length === 0 ? "<plain>" : language;
}

function markdownTitle(text: string): string | null {
  const match = /^#\s+(.+)$/mu.exec(text);
  return match?.[1]?.trim() ?? null;
}

function aureliaPackageImports(text: string): readonly string[] {
  return uniqueSortedStrings(
    [...text.matchAll(/from\s+['"](@aurelia\/[^'"]+|aurelia)['"]/gu)]
      .map((match) => match[1] ?? "")
      .filter((specifier) => specifier.length > 0),
  );
}

function conceptCountsFor(text: string): Readonly<Record<FrameworkCorpusConcept, number>> {
  const counts = {} as Record<FrameworkCorpusConcept, number>;
  for (const descriptor of CONCEPT_DESCRIPTORS) {
    descriptor.pattern.lastIndex = 0;
    counts[descriptor.id] = countMatches(text, descriptor.pattern);
  }
  return counts;
}

function conceptsFromCounts(
  counts: Readonly<Record<FrameworkCorpusConcept, number>>,
): readonly FrameworkCorpusConcept[] {
  return CONCEPT_DESCRIPTORS
    .map((descriptor) => descriptor.id)
    .filter((concept) => counts[concept] > 0);
}

function countMatches(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].length;
}

function testSnippetKind(expression: ts.Expression): FrameworkCorpusTestSnippetKind | null {
  if (ts.isIdentifier(expression)) {
    switch (expression.text) {
      case "describe":
        return "describe-call";
      case "it":
        return "it-call";
      case "createFixture":
        return "create-fixture-call";
      default:
        return null;
    }
  }
  if (ts.isPropertyAccessExpression(expression) && expression.name.text === "it") {
    return "it-call";
  }
  return null;
}

function testSnippetName(node: ts.CallExpression): string | null {
  const first = node.arguments[0];
  return first !== undefined && ts.isStringLiteralLike(first)
    ? compactPreview(first.text).slice(0, 120)
    : null;
}

function visit(node: ts.Node, visitor: (node: ts.Node) => void): void {
  visitor(node);
  node.forEachChild((child) => visit(child, visitor));
}

function sourceRangeForOffsets(
  filePath: string,
  text: string,
  start: number,
  end: number,
): SourceRange {
  return {
    filePath,
    start: sourcePositionForOffset(text, start),
    end: sourcePositionForOffset(text, end),
  };
}

function sourcePositionForOffset(
  text: string,
  offset: number,
): SourceRange["start"] {
  const safeOffset = Math.min(Math.max(0, offset), text.length);
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < safeOffset; index += 1) {
    if (text[index] === "\n") {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, character: safeOffset - lineStart };
}

function sourceTextForRange(
  repoRoot: string,
  source: SourceRange,
  cache: Map<string, string>,
): string {
  const text = cachedSourceText(repoRoot, source.filePath, cache);
  return text.slice(
    sourceOffsetForPosition(text, source.start),
    sourceOffsetForPosition(text, source.end),
  );
}

function cachedSourceText(
  repoRoot: string,
  filePath: string,
  cache: Map<string, string>,
): string {
  const cached = cache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  const text = read(repoRoot, filePath);
  cache.set(filePath, text);
  return text;
}

function sourceOffsetForPosition(
  text: string,
  position: SourceRange["start"],
): number {
  let line = 0;
  let lineStart = 0;
  while (line < position.line && lineStart < text.length) {
    const nextLine = text.indexOf("\n", lineStart);
    if (nextLine < 0) {
      return text.length;
    }
    line += 1;
    lineStart = nextLine + 1;
  }
  return Math.min(text.length, lineStart + Math.max(0, position.character));
}

function walk(
  repoRoot: string,
  relativePath: string,
  predicate: (file: string) => boolean,
): readonly string[] {
  const absolute = path.join(repoRoot, relativePath);
  if (!existsSync(absolute)) {
    return [];
  }
  const result: string[] = [];
  const stack = [absolute];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "out" || entry.name === "dist") {
        continue;
      }
      const absoluteEntry = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absoluteEntry);
        continue;
      }
      const relativeEntry = path.relative(repoRoot, absoluteEntry).replace(/\\/g, "/");
      if (predicate(relativeEntry)) {
        result.push(relativeEntry);
      }
    }
  }
  return result.sort();
}

function read(repoRoot: string, relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(
  repoRoot: string,
  relativePath: string,
): {
  readonly name?: unknown;
  readonly dependencies?: Readonly<Record<string, unknown>>;
  readonly devDependencies?: Readonly<Record<string, unknown>>;
  readonly peerDependencies?: Readonly<Record<string, unknown>>;
} {
  return JSON.parse(read(repoRoot, relativePath)) as {
    readonly name?: unknown;
    readonly dependencies?: Readonly<Record<string, unknown>>;
    readonly devDependencies?: Readonly<Record<string, unknown>>;
    readonly peerDependencies?: Readonly<Record<string, unknown>>;
  };
}

function sourceGroup(file: string, prefix: string): string {
  const relative = file.startsWith(prefix) ? file.slice(prefix.length) : file;
  return relative.includes("/") ? relative.split("/")[0]! : relative;
}

function sourceLineCount(repoRoot: string, files: readonly string[]): number {
  return files.reduce((total, file) => total + read(repoRoot, file).split(/\r?\n/u).length, 0);
}

function docSummary(
  filePath: string,
  concepts: readonly FrameworkCorpusConcept[],
  fenceCount: number,
): string {
  return `${filePath} contains ${fenceCount} code fence(s) and ${conceptSummary(concepts)}.`;
}

function testSummary(
  filePath: string,
  concepts: readonly FrameworkCorpusConcept[],
): string {
  return `${filePath} carries framework test pressure for ${conceptSummary(concepts)}.`;
}

function conceptSummary(concepts: readonly FrameworkCorpusConcept[]): string {
  return concepts.length === 0 ? "no classified concept tags" : `concepts ${concepts.join(", ")}`;
}

function compactPreview(text: string): string {
  return text
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 240);
}

function compareSourceRows(
  left: { readonly filePath: string; readonly source: SourceRange },
  right: { readonly filePath: string; readonly source: SourceRange },
): number {
  return left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character;
}

export function compareFixtureSeedPressure(
  left: FrameworkCorpusFixtureSeedRow,
  right: FrameworkCorpusFixtureSeedRow,
): number {
  return Number(left.generated) - Number(right.generated) ||
    fixtureSeedSnippetWeight(right.snippetKind) - fixtureSeedSnippetWeight(left.snippetKind) ||
    right.effectHints.length - left.effectHints.length ||
    right.recipeHints.length - left.recipeHints.length ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line;
}

function fixtureSeedSnippetWeight(
  kind: FrameworkCorpusFixtureSeedRow["snippetKind"],
): number {
  switch (kind) {
    case "create-fixture-call":
      return 100;
    case "it-call":
      return 80;
    case "code-fence":
      return 60;
    case "describe-call":
      return 0;
  }
}
