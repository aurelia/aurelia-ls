import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  countBy,
  countNamedEntriesBy,
  uniqueSortedStrings,
} from "../../collections.js";
import { propertyNameText, SourceProjectMemo, type SourceProject } from "../../source/index.js";
import { escapeRegExp } from "../../text-regex.js";
import type { SourceRange } from "../locus.js";

export const FRAMEWORK_CORPUS_ANALYSIS_VERSION = "framework-corpus-analysis.v26";

const frameworkCorpusAnalysisMemo =
  new SourceProjectMemo<FrameworkCorpusAnalysis>();

export type FrameworkCorpusConcept =
  | "binding"
  | "bindables"
  | "di"
  | "expression"
  | "forms"
  | "i18n"
  | "lifecycle"
  | "observation"
  | "resources"
  | "router"
  | "state"
  | "styles"
  | "templates"
  | "validation";

export type FrameworkCorpusDocSnippetKind = "code-fence";

export type FrameworkCorpusTestSnippetKind =
  | "describe-call"
  | "it-call"
  | "create-fixture-call"
  | "object-test-case";

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
  | "binding-observed-dependency"
  | "binding-behavior-application"
  | "binding-target-access"
  | "binding-value-channel"
  | "component"
  | "component-role"
  | "computed-observation-definition"
  | "computed-observer-observed-dependency"
  | "computed-observer-source"
  | "dependency-injection"
  | "external-template"
  | "i18n-translation-binding"
  | "i18n-translation-key"
  | "open-seam-closure"
  | "resource-definition"
  | "route"
  | "runtime-controller"
  | "runtime-composition"
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
  | "convention-minimal-app"
  | "routed-app-shell"
  | "state-backed-form"
  | "localized-state-backed-form"
  | "validated-state-backed-form"
  | "localized-validated-state-backed-form"
  | "multi-step-state-backed-form"
  | "service-backed-form"
  | "routed-state-backed-form"
  | "routed-service-backed-form"
  | "routed-localized-validated-state-backed-form"
  | "catalog-storefront"
  | "routed-catalog-storefront"
  | "searchable-data-table"
  | "routed-searchable-data-table"
  | "composed-dashboard"
  | "state-store-list"
  | "pressure-fixture";

export type FrameworkCorpusFixtureSeedClassificationKind =
  /** Source corpus concept assigned by docs/test snippet classification. */
  | "concept"
  /** Expected-effect hint assigned from concept, concept-combination, or source-surface evidence. */
  | "effect"
  /** Recipe hint that can seed generated or hand-authored fixture work. */
  | "recipe"
  /** Concrete syntax/surface evidence that affects effect or recipe selection. */
  | "surface"
  /** Useful corpus pressure that is intentionally not the recommendable generated recipe shape. */
  | "contrast";

export interface FrameworkCorpusFixtureSeedClassificationReason {
  readonly kind: FrameworkCorpusFixtureSeedClassificationKind;
  readonly key: string;
  readonly summary: string;
}

/** Source-surface rule that explains why a corpus snippet can seed fixture or expected-effect work. */
interface FixtureSeedSurfaceClassificationRule {
  readonly key: string;
  readonly summary: string;
  readonly applies: (snippetText: string) => boolean;
}

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
  readonly classificationReasons: readonly FrameworkCorpusFixtureSeedClassificationReason[];
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

interface ConceptExtractionContext {
  readonly aureliaInterpolation: "markup" | "mixed-template-host" | "none";
}

interface MarkdownFence {
  readonly language: string;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

interface BindingSurfaceHint {
  readonly targetProperty: string;
  readonly targetAccessProperty?: string;
  readonly valueTargetProperty?: string;
  readonly targetKind?: "node";
  readonly targetAccessStrategy?: string;
  readonly channelKind?: string;
  readonly valueChannelKind?: string;
  readonly valueSiteKind?: string;
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
  { id: "binding", pattern: /\b(?:bind|two-way|from-view|to-view|trigger|delegate|capture|call|value\.bind|model\.bind|checked\.bind|class\.bind|style\.bind)\b/giu },
  // Explicit bindable declaration and component input API pressure.
  { id: "bindables", pattern: /@bindable\b|\bbindable\b|\bBindable\b/giu },
  // Dependency injection, container APIs, registrations, and resolver-style helpers.
  { id: "di", pattern: /\b(?:DI|IContainer|Registration|resolve|inject|singleton|transient|newInstanceForScope|factory)\b/giu },
  // Aurelia expression parser/evaluator semantics and expression-bearing template surfaces.
  { id: "expression", pattern: /\b(?:expression|expressions|interpolation|astEvaluate|IAstEvaluator|ExpressionParser|parseExpression|AccessScope|AccessMember|AccessKeyed|CallScope|CallMember|CallFunction|ForOfStatement|BindingBehavior|ValueConverter|value converter|value-converter|binding behavior|binding-behavior|template expression|arrow function|optional chaining|nullish|\$event)\b|\$\{/giu },
  // Native and Aurelia form controls, select/radio/checkbox semantics, and submit flow.
  { id: "forms", pattern: /\b(?:forms?|checkbox|radio|submit|model\.bind|checked\.bind)\b|<\s*(?:form|input|select|option|textarea|button)\b|\b(?:input|select|option|textarea)\.(?:value|checked)\b/giu },
  // Localization and translation plugin pressure.
  { id: "i18n", pattern: /\b(?:i18n|I18N|translation|translations|t\.bind|t-params)\b/giu },
  // Controller, resource, component, and binding lifecycle phases.
  { id: "lifecycle", pattern: /\b(?:binding|bound|attaching|attached|detaching|detached|hydrating|hydrated|dispose|unbinding)\b/giu },
  // Observer locator, subscriber, accessor, and reactivity concepts.
  { id: "observation", pattern: /\b(?:observe|observer|observation|observable|subscriber|accessor|dirty-check|collection observer|ObserverLocator|NodeObserverLocator|getObserver|ComputedObserver|ControlledComputedObserver|SetterObserver|DirtyCheckProperty|ProxyObservable)\b/giu },
  // Custom elements, custom attributes, value converters, binding behaviors, and resource registries.
  { id: "resources", pattern: /\b(?:custom element|custom-element|custom attribute|custom-attribute|value converter|value-converter|binding behavior|binding-behavior|template controller|resource)\b/giu },
  // Router configuration, routeable components, viewports, and route recognizer pressure.
  { id: "router", pattern: /\b(?:RouterConfiguration|route|routes|routing|router|au-viewport|viewport|RouteableComponent|RouteConfig)\b/giu },
  // State plugin or app state class pressure.
  { id: "state", pattern: /\b(?:state|store|dispatch|reducer|State)\b/gu },
  // Stylesheet resources plus dynamic class/style binding channels.
  { id: "styles", pattern: /\b(?:stylesheet|stylesheets|cssModules|shadowCSS|style\.bind|class\.bind)\b|(?:\b(?:class|style|css)\s*=\s*['"][^'"]*\$\{)|\b[\w-]+\.(?:class|style)\s*=/giu },
  // Template controllers, repeat/if/switch syntax, interpolation, and template compiler pressure.
  { id: "templates", pattern: /\b(?:template|repeat\.for|if\.bind|switch\.bind|with\.bind|promise\.bind)\b/giu },
  // Validation plugin, validation binding behavior, validation rules, and validation result presentation.
  { id: "validation", pattern: /@aurelia\/validation(?:-html|-i18n)?\b|\b(?:validation|ValidationHtml|ValidationConfiguration|IValidationController|IValidationRules|IValidationRule|validationRules|validation-errors|validation-container|validate binding behavior)\b|&\s*validate(?:\b|:)/giu },
];

const TEXT_CONCEPT_CONTEXT: ConceptExtractionContext = {
  aureliaInterpolation: "none",
};

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
      const conceptCounts = conceptCountsFor(text, TEXT_CONCEPT_CONTEXT);
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
        const concepts = conceptsFromCounts(conceptCountsFor(fence.text, conceptContextForDocFence(fence.language)));
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
      const conceptCounts = conceptCountsFor(text, {
        aureliaInterpolation: "mixed-template-host",
      });
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
        if (ts.isObjectLiteralExpression(node) && isFrameworkObjectTestCase(node)) {
          const snippetText = text.slice(node.getStart(sourceFile), node.getEnd());
          const concepts = conceptsFromCounts(conceptCountsFor(snippetText, {
            aureliaInterpolation: "mixed-template-host",
          }));
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
            kind: "object-test-case",
            name: objectTestCaseName(node),
            generated: filePath.includes("/generated/"),
            concepts,
            source,
            preview: compactPreview(snippetText),
            summary: `Framework test object-test-case in ${filePath} at line ${source.start.line + 1} with ${conceptSummary(concepts)}.`,
          });
        }
        if (!ts.isCallExpression(node)) {
          return;
        }
        const kind = testSnippetKind(node.expression);
        if (kind === null) {
          return;
        }
        const snippetText = text.slice(node.getStart(sourceFile), node.getEnd());
        const concepts = conceptsFromCounts(conceptCountsFor(snippetText, {
          aureliaInterpolation: "mixed-template-host",
        }));
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
  const classificationReasons = fixtureSeedClassificationReasons(row.concepts, snippetText, effectHints, recipeHints, true);
  if (effectHints.length === 0 && recipeHints.length === 0) {
    return [];
  }
  const seedUse = docSnippetSeedUse(row.filePath);
  return [{
    id: `framework-fixture-seed:${row.id}`,
    sourceKind: "doc-snippet",
    sourceId: row.id,
    filePath: row.filePath,
    group: row.group,
    seedUse,
    generated: false,
    language: row.language,
    snippetKind: row.kind,
    concepts: row.concepts,
    effectHints,
    expectedEffects: fixtureSeedExpectedEffects(effectHints, descriptors, snippetText),
    recipeHints,
    classificationReasons,
    source: row.source,
    preview: row.preview,
    summary: `Documentation ${seedUse} fixture seed for ${effectHints.join(", ") || "recipe exploration"} from ${row.filePath}.`,
  }];
}

function docSnippetSeedUse(filePath: string): FrameworkCorpusFixtureSeedUse {
  return filePath.includes("/testing/") || filePath.includes("/error-messages/")
    ? "behavior-grounding"
    : "authoring-taste";
}

function fixtureSeedForTestSnippet(
  row: FrameworkCorpusTestSnippetRow,
  descriptors: ReadonlyMap<string, FrameworkCorpusExpectedEffectDescriptorRow>,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedRow[] {
  if (!isConcreteBehaviorSeedSnippetKind(row.kind)) {
    return [];
  }
  const effectHints = expectedEffectHintsForSnippet(row.concepts, snippetText);
  const recipeHints = recipeHintsForConcepts(row.concepts, snippetText);
  const classificationReasons = fixtureSeedClassificationReasons(
    row.concepts,
    snippetText,
    effectHints,
    recipeHints,
    row.kind === "create-fixture-call" || row.kind === "object-test-case",
  );
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
    classificationReasons,
    source: row.source,
    preview: row.preview,
    summary: `Framework-test fixture seed for ${effectHints.join(", ") || "recipe exploration"} from ${row.filePath}.`,
  }];
}

function isConcreteBehaviorSeedSnippetKind(
  kind: FrameworkCorpusTestSnippetKind,
): boolean {
  switch (kind) {
    case "create-fixture-call":
    case "object-test-case":
    case "it-call":
      return true;
    case "describe-call":
      return false;
  }
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
    case "expression":
      return ["binding-data-flow", "template-compilation"];
    case "forms":
      return [];
    case "i18n":
      return ["dependency-injection"];
    case "lifecycle":
      return ["runtime-controller"];
    case "observation":
      return ["binding-target-access"];
    case "resources":
      return ["resource-definition", "component"];
    case "router":
      return [];
    case "state":
      return ["service-class", "service-interaction"];
    case "styles":
      return ["style-resource", "template-compilation", "runtime-controller"];
    case "templates":
      return ["template-compilation", "runtime-controller"];
    case "validation":
      return [];
  }
}

function expectedEffectsForConceptCombination(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): readonly FrameworkCorpusExpectedEffectHint[] {
  const hasBinding = concepts.includes("binding");
  const hasDi = concepts.includes("di");
  const hasAppState = concepts.includes("state") || hasFormDataOrValidationSurface(snippetText);
  return hasBinding && hasDi && hasAppState && hasServiceOrStateSurface(snippetText)
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
  if (hasTemplateObservedDependencySurface(snippetText)) {
    effects.add("binding-observed-dependency");
  }
  if (hasObserverLocatorTargetAccessSurface(snippetText)) {
    effects.add("binding-target-access");
  }
  if (hasComputedDecoratorSurface(snippetText)) {
    effects.add("computed-observation-definition");
  }
  if (hasComputedGetterSurface(snippetText)) {
    effects.add("computed-observer-source");
    effects.add("computed-observer-observed-dependency");
  }
  if (hasBindingBehaviorApplicationSurface(snippetText)) {
    effects.add("binding-behavior-application");
    effects.add("binding-target-access");
    effects.add("binding-data-flow");
    effects.add("binding-observed-dependency");
  }
  if (hasTargetOperationSurface(snippetText)) {
    effects.add("target-operation");
  }
  if (hasRouterAuthoringSurface(snippetText)) {
    effects.add("route");
  }
  if (hasAuComposeSurface(snippetText)) {
    effects.add("runtime-composition");
  }
  if (hasI18nTranslationBindingSurface(snippetText)) {
    effects.add("i18n-translation-binding");
  }
  if (hasI18nTranslationCatalogSurface(snippetText)) {
    effects.add("i18n-translation-key");
  }
  return [...effects].sort();
}

function hasI18nTranslationBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /\bt(?:\.bind)?\s*=/u.test(tagText) ||
    /\bt-params\.(?:bind|one-time|to-view|from-view|two-way)\b/u.test(tagText)
  );
}

function hasI18nTranslationCatalogSurface(snippetText: string): boolean {
  return /\bI18nConfiguration(?:\.customize)?\b/u.test(snippetText) ||
    /\bresources\s*:\s*\{[\s\S]{0,600}\b(?:translation|translations|en|de|fr|nl)\b/u.test(snippetText);
}

function hasValueChannelBindingSurface(snippetText: string): boolean {
  return /\b(?:value|checked|model|class|style)\.(?:bind|two-way|from-view|to-view)\b/u.test(snippetText)
    || /\b[\w-]+\.(?:class|style)\s*=/u.test(snippetText)
    || /(?:\b(?:class|style|css)\s*=\s*['"][^'"]*\$\{)/u.test(snippetText);
}

function hasNativeFormControlSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*(?:form|input|select|option|textarea|button)\b/iu.test(tagText)
  );
}

function hasNativeValueBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*(?:input|select|textarea)\b/iu.test(tagText) &&
    /\bvalue\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
}

function hasNativeSelectBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*select\b/iu.test(tagText) &&
    /\bvalue\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
}

function hasNativeCheckedBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*input\b/iu.test(tagText) &&
    /\bchecked\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
}

function hasCheckedCollectionBindingSurface(snippetText: string): boolean {
  if (!hasNativeCheckedBindingSurface(snippetText)) {
    return false;
  }
  return /\b(?:Set\s*<|new\s+Set\b|selected\s*:\s*Set|\bSet\b)/u.test(snippetText) ||
    /\b(?:selected\s*:\s*(?:any|unknown|string|number|boolean)?\s*\[\]|selected\s*=\s*\[\]|selectedItems\s*[:=]|Array\.from)/u.test(snippetText);
}

function hasCheckedMapBindingSurface(snippetText: string): boolean {
  return hasNativeCheckedBindingSurface(snippetText) &&
    /\b(?:Map\s*<|new\s+Map\b|selected\s*:\s*Map|\bMap\b)/u.test(snippetText);
}

function hasCustomMatcherBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^(?:<\s*input|<\s*select|<\s*option)\b/iu.test(tagText) &&
    /\bmatcher\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
}

function hasSelectMultipleBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*select\b/iu.test(tagText) &&
    /\bmultiple\b/iu.test(tagText) &&
    /\bvalue\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
}

function hasOptionModelBindingSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*option\b/iu.test(tagText) &&
    /\bmodel\.(?:bind|two-way|from-view|to-view)\b/u.test(tagText)
  );
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

function hasMultiStepFormSurface(snippetText: string): boolean {
  const hasStepFlowTerm =
    /\b(?:wizard|multi[-\s]?step|currentStep|nextStep|previousStep)\b/iu.test(snippetText) ||
    /(?:\bsteps?\b[\s\S]{0,240}\bprogress\b|\bprogress\b[\s\S]{0,240}\bsteps?\b)/iu.test(snippetText);
  if (!hasStepFlowTerm) {
    return false;
  }
  return hasNativeDataFormControlSurface(snippetText) ||
    hasValidationBindingBehaviorSurface(snippetText) ||
    htmlLikeTagTexts(snippetText).some((tagText) =>
      /\b(?:if|repeat)\.(?:bind|for)\b/u.test(tagText) ||
      /\b(?:class|style)\s*=\s*['"][^'"]*\$\{/u.test(tagText) ||
      /\b[\w-]+\.(?:class|style)\s*=/u.test(tagText)
    );
}

function hasTemplateObservedDependencySurface(snippetText: string): boolean {
  return bindingExpressionSurfaceTexts(snippetText).length > 0;
}

function hasObserverLocatorTargetAccessSurface(snippetText: string): boolean {
  return /\bgetObserver\s*\(/u.test(snippetText) ||
    hasObserverLocatorDescriptorMatrixSurface(snippetText);
}

function hasObserverLocatorDescriptorMatrixSurface(snippetText: string): boolean {
  return /\bgetObserver\(\)\s*-\s*descriptor=/u.test(snippetText) &&
    /\bhasGetter\b/u.test(snippetText) &&
    /\bhasSetter\b/u.test(snippetText) &&
    /\bconfigurable\b/u.test(snippetText);
}

function hasObserverLocatorSetterOnlyDescriptorCase(snippetText: string): boolean {
  return hasObserverLocatorDescriptorMatrixSurface(snippetText) &&
    /\bhasSetter\s*&&\s*!hasGetter\b/u.test(snippetText) &&
    /\bComputedObserver\b/u.test(snippetText) &&
    /\bDirtyCheckProperty\b/u.test(snippetText);
}

function hasComputedDecoratorSurface(snippetText: string): boolean {
  return /@computed(?:\s*\(|\b)/u.test(snippetText);
}

function hasComputedGetterSurface(snippetText: string): boolean {
  return /\bget\s+[A-Za-z_$][\w$]*\s*\(/u.test(snippetText);
}

function hasBindingSurfaceChannel(
  snippetText: string,
  channelKind: string,
): boolean {
  return bindingValueChannelSurfaceHints(snippetText)
    .some((hint) => hint.channelKind === channelKind);
}

function expectedEffectFiltersForSourceText(
  effectKind: FrameworkCorpusExpectedEffectHint,
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  if (effectKind === "binding-behavior-application") {
    return bindingBehaviorApplicationFilters(snippetText);
  }
  if (effectKind === "binding-observed-dependency") {
    return bindingObservedDependencyFilters(snippetText);
  }
  if (effectKind === "computed-observation-definition") {
    return computedObservationDefinitionFilters(snippetText);
  }
  if (effectKind === "computed-observer-source") {
    return computedObserverSourceFilters(snippetText);
  }
  if (effectKind === "computed-observer-observed-dependency") {
    return computedObserverObservedDependencyFilters(snippetText);
  }
  if (effectKind === "binding-target-access" || effectKind === "binding-value-channel" || effectKind === "binding-data-flow") {
    return [
      ...bindingSurfaceFilters(effectKind, snippetText),
      ...(effectKind === "binding-target-access"
        ? observerLocatorTargetAccessFilters(snippetText)
        : []),
    ];
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

function observerLocatorTargetAccessFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  if (!hasObserverLocatorDescriptorMatrixSurface(snippetText)) {
    return [];
  }
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [{
    field: "observerLocatorCase",
    value: "descriptor-matrix",
    summary: "Snippet is the ObserverLocator descriptor matrix for object target access.",
  }];
  if (hasObserverLocatorSetterOnlyDescriptorCase(snippetText)) {
    filters.push({
      field: "includedDecision",
      value: "setter-only-configurable-computed-observer",
      summary: "Matrix includes the setter-only accessor case where configurable descriptors use ComputedObserver.",
    });
  }
  return filters;
}

function computedObservationDefinitionFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [];
  const memberKind = singleComputedMemberKind(snippetText, true);
  if (memberKind !== null) {
    filters.push({
      field: "memberKind",
      value: memberKind,
      summary: `Snippet has one computed decorator member kind: ${memberKind}.`,
    });
  }
  pushSingleComputedMemberNameFilter(filters, snippetText, true);
  pushComputedDependencyModeFilter(filters, snippetText);
  return filters;
}

function computedObserverSourceFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [];
  const observerKind = singleComputedGetterObserverKind(snippetText);
  if (observerKind !== null) {
    filters.push({
      field: "observerKind",
      value: observerKind,
      summary: "Snippet maps to one framework computed observer family for getter observation.",
    });
  }
  const triggerKind = singleComputedGetterTriggerKind(snippetText);
  if (triggerKind !== null) {
    filters.push({
      field: "triggerKind",
      value: triggerKind,
      summary: triggerKind === "getter-owned-observer"
        ? "Snippet uses a getter-owned @computed observer hook."
        : "Snippet exposes an ordinary getter descriptor that ObserverLocator can observe.",
    });
  }
  pushSingleComputedSourceMemberNameFilter(filters, snippetText);
  pushComputedSourceDependencyModeFilter(filters, snippetText);
  return filters;
}

function computedObserverObservedDependencyFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [];
  const dependencyKind = computedObserverDependencyKind(snippetText);
  if (dependencyKind !== null) {
    filters.push({
      field: "dependencyKind",
      value: dependencyKind,
      summary: `Snippet has one locally-inferred computed observer dependency kind: ${dependencyKind}.`,
    });
  }
  pushSingleComputedSourceMemberNameFilter(filters, snippetText);
  return filters;
}

function pushSingleComputedSourceMemberNameFilter(
  filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[],
  snippetText: string,
): void {
  const memberName = singleHintValue(computedSourceGetterNames(snippetText), (name) => name);
  if (memberName !== null) {
    filters.push({
      field: "memberName",
      value: memberName,
      summary: `Snippet has one computed getter source name: ${memberName}.`,
    });
  }
}

function pushSingleComputedMemberNameFilter(
  filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[],
  snippetText: string,
  decoratedOnly: boolean,
): void {
  const memberName = singleHintValue(computedGetterNames(snippetText, decoratedOnly), (name) => name);
  if (memberName !== null) {
    filters.push({
      field: "memberName",
      value: memberName,
      summary: `Snippet has one computed getter/member name: ${memberName}.`,
    });
  }
}

function pushComputedDependencyModeFilter(
  filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[],
  snippetText: string,
): void {
  filters.push({
    field: "dependencyMode",
    value: computedDependencyMode(snippetText),
    summary: "Snippet has one locally-inferred computed dependency mode.",
  });
}

function pushComputedSourceDependencyModeFilter(
  filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[],
  snippetText: string,
): void {
  const dependencyMode = singleComputedGetterDependencyMode(snippetText);
  if (dependencyMode !== null) {
    filters.push({
      field: "dependencyMode",
      value: dependencyMode,
      summary: "Snippet has one locally-inferred computed getter dependency mode.",
    });
  }
}

function singleComputedMemberKind(
  snippetText: string,
  decoratedOnly: boolean,
): "getter" | "method" | null {
  if (!decoratedOnly || !hasComputedDecoratorSurface(snippetText)) {
    return hasComputedGetterSurface(snippetText) ? "getter" : null;
  }
  const kinds = uniqueSortedStrings([...snippetText.matchAll(/@computed(?:\s*\([^)]*\))?\s+(?:public\s+|protected\s+|private\s+|static\s+|override\s+|readonly\s+|accessor\s+)*((?:get)\s+)?[A-Za-z_$][\w$]*\s*\(/gu)]
    .map((match) => match[1] === undefined ? "method" : "getter"));
  return kinds.length === 1 ? kinds[0] as "getter" | "method" : null;
}

function computedGetterNames(
  snippetText: string,
  decoratedOnly: boolean,
): readonly string[] {
  const pattern = decoratedOnly
    ? /@computed(?:\s*\([^)]*\))?\s+(?:public\s+|protected\s+|private\s+|static\s+|override\s+|readonly\s+|accessor\s+)*get\s+([A-Za-z_$][\w$]*)\s*\(/gu
    : /\bget\s+([A-Za-z_$][\w$]*)\s*\(/gu;
  return uniqueSortedStrings([...snippetText.matchAll(pattern)]
    .map((match) => match[1] ?? "")
    .filter((name) => name.length > 0));
}

function computedSourceGetterNames(
  snippetText: string,
): readonly string[] {
  return uniqueSortedStrings(computedGetterSurfaceHints(snippetText).map((hint) => hint.memberName));
}

function singleComputedGetterObserverKind(
  snippetText: string,
): "computed-observer" | "controlled-computed-observer" | null {
  const dependencyMode = singleComputedGetterDependencyMode(snippetText);
  if (dependencyMode === null) {
    return null;
  }
  return dependencyMode === "proxy-auto-track" ? "computed-observer" : "controlled-computed-observer";
}

function singleComputedGetterTriggerKind(
  snippetText: string,
): "accessor-descriptor" | "getter-owned-observer" | null {
  const hints = computedGetterSurfaceHints(snippetText);
  const triggerKinds = uniqueSortedStrings(hints.map((hint) => hint.decorated ? "getter-owned-observer" : "accessor-descriptor"));
  return triggerKinds.length === 1 ? triggerKinds[0] as "accessor-descriptor" | "getter-owned-observer" : null;
}

function singleComputedGetterDependencyMode(
  snippetText: string,
): "proxy-auto-track" | "explicit-property-keys" | "dependency-function" | "disabled" | "open" | null {
  const hints = computedGetterSurfaceHints(snippetText);
  if (hints.length !== 1) {
    return null;
  }
  const [hint] = hints;
  if (hint === undefined) {
    return null;
  }
  return hint.decorated
    ? computedDependencyModeFromArguments(hint.decoratorArguments)
    : "proxy-auto-track";
}

interface ComputedGetterSurfaceHint {
  readonly memberName: string;
  readonly decorated: boolean;
  readonly decoratorArguments: readonly string[];
}

function computedGetterSurfaceHints(
  snippetText: string,
): readonly ComputedGetterSurfaceHint[] {
  const decoratedByName = new Map<string, string[]>();
  for (const match of snippetText.matchAll(/@computed(?:\s*\(([^)]*)\))?\s+(?:public\s+|protected\s+|private\s+|static\s+|override\s+|readonly\s+|accessor\s+)*get\s+([A-Za-z_$][\w$]*)\s*\(/gu)) {
    const memberName = match[2];
    if (memberName === undefined) {
      continue;
    }
    const args = decoratedByName.get(memberName) ?? [];
    const rawArguments = match[1]?.trim() ?? "";
    if (rawArguments.length > 0) {
      args.push(rawArguments);
    }
    decoratedByName.set(memberName, args);
  }

  return uniqueSortedStrings([...snippetText.matchAll(/\bget\s+([A-Za-z_$][\w$]*)\s*\(/gu)]
    .map((match) => match[1] ?? "")
    .filter((name) => name.length > 0))
    .map((memberName) => {
      const decoratorArguments = decoratedByName.get(memberName);
      return {
        memberName,
        decorated: decoratorArguments !== undefined,
        decoratorArguments: decoratorArguments ?? [],
      };
    });
}

function computedDependencyMode(
  snippetText: string,
): "proxy-auto-track" | "explicit-property-keys" | "dependency-function" | "disabled" | "open" {
  if (!hasComputedDecoratorSurface(snippetText)) {
    return "proxy-auto-track";
  }
  return computedDependencyModeFromArguments(computedDecoratorArguments(snippetText));
}

function computedDependencyModeFromArguments(
  argumentTexts: readonly string[],
): "proxy-auto-track" | "explicit-property-keys" | "dependency-function" | "disabled" | "open" {
  const argumentsText = argumentTexts.join("\n");
  if (argumentsText.length === 0) {
    return "proxy-auto-track";
  }
  if (/\bdeps\s*:\s*\[\s*\]/u.test(argumentsText)) {
    return "disabled";
  }
  if (/\bdeps\s*:\s*(?:\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>|function\b)/u.test(argumentsText)) {
    return "dependency-function";
  }
  if (/\bdeps\s*:\s*\[/u.test(argumentsText) || /(?:^|,)\s*['"`][^'"`]+['"`]/u.test(argumentsText)) {
    return "explicit-property-keys";
  }
  if (/\bdeps\s*:/u.test(argumentsText)) {
    return "open";
  }
  return "proxy-auto-track";
}

function computedDecoratorArguments(snippetText: string): readonly string[] {
  return computedDecoratorOccurrences(snippetText)
    .map((occurrence) => occurrence.argumentsText)
    .filter((argumentsText) => argumentsText.length > 0);
}

interface ComputedDecoratorOccurrence {
  readonly argumentsText: string;
  readonly endOffset: number;
}

function computedDecoratorOccurrences(
  snippetText: string,
): readonly ComputedDecoratorOccurrence[] {
  const occurrences: ComputedDecoratorOccurrence[] = [];
  let searchOffset = 0;
  while (searchOffset < snippetText.length) {
    const startOffset = snippetText.indexOf("@computed", searchOffset);
    if (startOffset < 0) {
      break;
    }
    let offset = startOffset + "@computed".length;
    while (offset < snippetText.length && /\s/u.test(snippetText[offset]!)) {
      offset++;
    }
    if (snippetText[offset] !== "(") {
      occurrences.push({
        argumentsText: "",
        endOffset: offset,
      });
      searchOffset = offset;
      continue;
    }
    const balanced = readBalancedParenthesizedText(snippetText, offset);
    occurrences.push({
      argumentsText: balanced.content.trim(),
      endOffset: balanced.endOffset,
    });
    searchOffset = balanced.endOffset;
  }
  return occurrences;
}

function readBalancedParenthesizedText(
  text: string,
  openOffset: number,
): { readonly content: string; readonly endOffset: number } {
  let depth = 0;
  let quote: "'" | "\"" | "`" | null = null;
  let escaped = false;
  for (let offset = openOffset; offset < text.length; offset++) {
    const char = text[offset]!;
    if (quote !== null) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === "\"" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth++;
      continue;
    }
    if (char === ")") {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(openOffset + 1, offset),
          endOffset: offset + 1,
        };
      }
    }
  }
  return {
    content: text.slice(openOffset + 1),
    endOffset: text.length,
  };
}

function computedObserverDependencyKind(
  snippetText: string,
): "proxy-property-read" | "proxy-collection-read" | "deep-property-read" | "deep-collection-read" | null {
  if (/\bdeep\s*:\s*true/u.test(snippetText)) {
    return /\b(?:Array|Map|Set)\b|\.(?:map|filter|find|values|keys|entries|forEach)\s*\(/u.test(snippetText)
      ? "deep-collection-read"
      : "deep-property-read";
  }
  if (/\b(?:Array|Map|Set)\b|\.(?:map|filter|find|values|keys|entries|forEach)\s*\(/u.test(snippetText)) {
    return "proxy-collection-read";
  }
  return hasComputedGetterSurface(snippetText) ? "proxy-property-read" : null;
}

function bindingObservedDependencyFilters(
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const expressions = bindingExpressionSurfaceTexts(snippetText);
  if (expressions.length === 0) {
    return [];
  }
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [{
    field: "dependencyKind",
    value: observedDependencyKindForExpressions(expressions),
    summary: "Snippet contains template expression reads collected by Aurelia's active connectable.",
  }];
  const sourceName = singleSimpleObservedDependencySourceName(expressions);
  if (sourceName !== null) {
    filters.push({
      field: "sourceName",
      value: sourceName,
      summary: `Snippet has one simple observed dependency source expression: ${sourceName}.`,
    });
  }
  return filters;
}

function observedDependencyKindForExpressions(
  expressions: readonly string[],
): "template-expression-read" | "template-collection-read" {
  return expressions.some((expression) =>
    /\.\s*(?:map|filter|find|findIndex|flatMap|some|every|reduce|reduceRight|sort|reverse|includes|indexOf|lastIndexOf|join|slice|forEach)\s*\(/u.test(expression)
  )
    ? "template-collection-read"
    : "template-expression-read";
}

function singleSimpleObservedDependencySourceName(expressions: readonly string[]): string | null {
  const sourceNames = expressions.map(simpleObservedDependencySourceName);
  if (sourceNames.some((sourceName) => sourceName === undefined)) {
    return null;
  }
  return singleHintValue(sourceNames, (sourceName) => sourceName);
}

function simpleObservedDependencySourceName(expression: string): string | undefined {
  const normalized = expression
    .replace(/&\s*[A-Za-z_$][\w$-]*(?:\s*:\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^&]+))*/gu, "")
    .trim();
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u.test(normalized)
    ? normalized
    : undefined;
}

function bindingExpressionSurfaceTexts(snippetText: string): readonly string[] {
  return uniqueSortedStrings([
    ...bindingCommandExpressionTexts(snippetText),
    ...interpolationExpressionTexts(snippetText),
  ]);
}

function bindingCommandExpressionTexts(snippetText: string): readonly string[] {
  return [...snippetText.matchAll(/\b[\w:-]+\.(?:bind|two-way|from-view|to-view)\s*=\s*(["'`])([\s\S]*?)\1/gu)]
    .map((match) => match[2]?.trim() ?? "")
    .filter((expression) => expression.length > 0);
}

function interpolationExpressionTexts(snippetText: string): readonly string[] {
  return [...snippetText.matchAll(/\$\{([\s\S]*?)\}/gu)]
    .map((match) => match[1]?.trim() ?? "")
    .filter((expression) => expression.length > 0);
}

function bindingSurfaceFilters(
  effectKind: "binding-target-access" | "binding-value-channel" | "binding-data-flow",
  snippetText: string,
): readonly FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] {
  const valueChannelHints = bindingValueChannelSurfaceHints(snippetText);
  const sourceHints = effectKind === "binding-value-channel"
    ? valueChannelHints
    : bindingExpressionSurfaceHints(snippetText, valueChannelHints);
  const singleTargetProperty = singleHintValue(sourceHints, (hint) =>
    bindingEffectTargetProperty(effectKind, hint)
  );
  const singleTargetKind = singleHintValue(sourceHints, (hint) => hint.targetKind);
  const filters: FrameworkCorpusFixtureSeedExpectedEffectFilterRow[] = [];
  if (singleTargetKind !== null) {
    filters.push({
      field: "targetKind",
      value: singleTargetKind,
      summary: `Snippet has one locally-inferred binding target kind: ${singleTargetKind}.`,
    });
  }
  if (singleTargetProperty !== null) {
    filters.push({
      field: "targetProperty",
      value: singleTargetProperty,
      summary: `Snippet has one locally-inferred binding target property: ${singleTargetProperty}.`,
    });
  }
  if (effectKind === "binding-target-access") {
    const strategy = singleHintValue(sourceHints, (hint) => hint.targetAccessStrategy);
    if (strategy !== null) {
      filters.push({
        field: "strategy",
        value: strategy,
        summary: `Snippet maps to one binding target-access strategy: ${strategy}.`,
      });
    }
  }
  if (effectKind === "binding-value-channel") {
    const channelKind = singleHintValue(sourceHints, (hint) => hint.channelKind);
    if (channelKind !== null) {
      filters.push({
        field: "channelKind",
        value: channelKind,
        summary: `Snippet maps to one binding value-channel kind: ${channelKind}.`,
      });
    }
  }
  if (effectKind === "binding-data-flow") {
    const valueChannelKind = singleHintValue(sourceHints, (hint) => hint.valueChannelKind);
    if (valueChannelKind !== null) {
      filters.push({
        field: "valueChannelKind",
        value: valueChannelKind,
        summary: `Snippet maps to one binding data-flow value-channel kind: ${valueChannelKind}.`,
      });
    }
    const valueSiteKind = singleHintValue(sourceHints, (hint) => hint.valueSiteKind);
    if (valueSiteKind !== null) {
      filters.push({
        field: "valueSiteKind",
        value: valueSiteKind,
        summary: `Snippet maps to one binding data-flow value-site kind: ${valueSiteKind}.`,
      });
    }
  }
  return filters;
}

function bindingEffectTargetProperty(
  effectKind: "binding-target-access" | "binding-value-channel" | "binding-data-flow",
  hint: BindingSurfaceHint,
): string {
  return effectKind === "binding-target-access"
    ? hint.targetAccessProperty ?? hint.targetProperty
    : hint.valueTargetProperty ?? hint.targetProperty;
}

function bindingExpressionSurfaceHints(
  snippetText: string,
  valueChannelHints: readonly BindingSurfaceHint[],
): readonly BindingSurfaceHint[] {
  return uniqueBindingSurfaceHints([
    ...bindingCommandSurfaceHints(snippetText),
    ...valueChannelHints,
  ]);
}

function bindingValueChannelSurfaceHints(
  snippetText: string,
): readonly BindingSurfaceHint[] {
  return uniqueBindingSurfaceHints([
    ...bindingCommandSurfaceHints(snippetText).filter((hint) =>
      isValueChannelTargetProperty(hint.targetProperty)
    ),
    ...htmlLikeTagTexts(snippetText).flatMap(classStyleAttributeSurfaceHints),
  ]);
}

function bindingCommandSurfaceHints(snippetText: string): readonly BindingSurfaceHint[] {
  return uniqueBindingSurfaceHints([...snippetText.matchAll(/\b([\w-]+)\.(?:bind|two-way|from-view|to-view)\b/gu)]
    .map((match) => bindingCommandSurfaceHint(match[1] ?? ""))
    .filter((hint): hint is BindingSurfaceHint => hint !== null));
}

function bindingCommandSurfaceHint(targetProperty: string): BindingSurfaceHint | null {
  if (targetProperty.length === 0) {
    return null;
  }
  if (targetProperty === "class") {
    return classTokenBindingSurfaceHint();
  }
  if (targetProperty === "style" || targetProperty === "css") {
    return styleRuleBindingSurfaceHint(targetProperty);
  }
  return { targetProperty };
}

function classStyleAttributeSurfaceHints(tagText: string): readonly BindingSurfaceHint[] {
  const hints: BindingSurfaceHint[] = [];
  for (const match of tagText.matchAll(/\b(class|style|css)\s*=\s*(["'])([\s\S]*?)\2/gu)) {
    const targetProperty = match[1] ?? "";
    const value = match[3] ?? "";
    if (!value.includes("${")) {
      continue;
    }
    if (targetProperty === "class") {
      hints.push({
        ...classTokenBindingSurfaceHint(),
        valueSiteKind: "plain-attribute-interpolation",
      });
      continue;
    }
    if (targetProperty === "style" || targetProperty === "css") {
      hints.push({
        ...styleRuleBindingSurfaceHint(targetProperty),
        valueSiteKind: "plain-attribute-interpolation",
      });
    }
  }
  for (const match of tagText.matchAll(/(?:^|\s)([-\w:]+)\.class\s*=/gu)) {
    const classToken = match[1] ?? "";
    if (classToken.length > 0) {
      hints.push({
        targetKind: "node",
        targetProperty: "class",
        targetAccessProperty: "class",
        valueTargetProperty: classToken,
        targetAccessStrategy: "class-attribute-accessor",
        channelKind: "class-toggle",
        valueChannelKind: "class-toggle",
      });
    }
  }
  for (const match of tagText.matchAll(/(?:^|\s)([-\w]+)\.style\s*=/gu)) {
    const styleProperty = match[1] ?? "";
    if (styleProperty.length > 0) {
      hints.push({
        targetKind: "node",
        targetProperty: "style",
        targetAccessProperty: "style",
        valueTargetProperty: styleProperty,
        targetAccessStrategy: "style-attribute-accessor",
        channelKind: "style-property-value",
        valueChannelKind: "style-property-value",
      });
    }
  }
  for (const match of tagText.matchAll(/\bstyle\.([-\w]+)\s*=/gu)) {
    const styleProperty = match[1] ?? "";
    if (styleProperty.length > 0) {
      hints.push({
        targetKind: "node",
        targetProperty: "style",
        targetAccessProperty: "style",
        valueTargetProperty: styleProperty,
        targetAccessStrategy: "style-attribute-accessor",
        channelKind: "style-property-value",
        valueChannelKind: "style-property-value",
      });
    }
  }
  return uniqueBindingSurfaceHints(hints);
}

function classTokenBindingSurfaceHint(): BindingSurfaceHint {
  return {
    targetKind: "node",
    targetProperty: "class",
    targetAccessStrategy: "class-attribute-accessor",
    channelKind: "class-attribute-tokens",
    valueChannelKind: "class-attribute-tokens",
  };
}

function styleRuleBindingSurfaceHint(targetProperty: "style" | "css"): BindingSurfaceHint {
  return {
    targetKind: "node",
    targetProperty,
    targetAccessStrategy: "style-attribute-accessor",
    channelKind: "style-attribute-rules",
    valueChannelKind: "style-attribute-rules",
  };
}

function isValueChannelTargetProperty(targetProperty: string): boolean {
  switch (targetProperty) {
    case "value":
    case "checked":
    case "model":
    case "class":
    case "style":
    case "css":
      return true;
    default:
      return false;
  }
}

function singleHintValue<THint, TValue extends string>(
  hints: readonly THint[],
  read: (hint: THint) => TValue | undefined,
): TValue | null {
  const values = uniqueSortedStrings(hints
    .map(read)
    .filter((value): value is TValue => value !== undefined && value.length > 0));
  return values.length === 1 ? values[0] as TValue : null;
}

function uniqueBindingSurfaceHints(
  hints: readonly BindingSurfaceHint[],
): readonly BindingSurfaceHint[] {
  const seen = new Set<string>();
  const unique: BindingSurfaceHint[] = [];
  for (const hint of hints) {
    const key = [
      hint.targetProperty,
      hint.targetAccessProperty ?? "",
      hint.valueTargetProperty ?? "",
      hint.targetKind ?? "",
      hint.targetAccessStrategy ?? "",
      hint.channelKind ?? "",
      hint.valueChannelKind ?? "",
      hint.valueSiteKind ?? "",
    ].join("\u0000");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(hint);
  }
  return unique;
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
  const hasI18nSurface = concepts.includes("i18n");
  const hasValidationSurface = hasValidationBindingBehaviorSurface(snippetText);
  const hasRouterSurface = hasRouterAuthoringSurface(snippetText);
  const hasMultiStepSurface = hasMultiStepFormSurface(snippetText);
  const hasCatalogSurface = hasCatalogStorefrontSurface(snippetText);
  const hasSearchableDataTable = hasSearchableDataTableSurface(snippetText);
  const hasAureliaStateStore = hasAureliaStateStoreSurface(snippetText);
  const hasFormServiceSurface =
    concepts.includes("forms") &&
    concepts.includes("di") &&
    hasFormDataOrValidationSurface(snippetText) &&
    hasServiceSurface(snippetText);
  const hasStateOwnedServiceSurface = hasFormServiceSurface && hasStateSurface(snippetText);
  const hasSpecificAppPressure =
    concepts.includes("forms") ||
    concepts.includes("state") ||
    concepts.includes("di") ||
    concepts.includes("validation") ||
    hasRouterSurface ||
    hasValidationSurface;
  if (!hasSpecificAppPressure && (concepts.includes("templates") || concepts.includes("resources") || concepts.includes("styles"))) {
    set.add("minimal-app");
  }
  if (!hasSpecificAppPressure && hasConventionMinimalAppSurface(snippetText)) {
    set.add("convention-minimal-app");
  }
  if (concepts.includes("forms") || concepts.includes("state")) {
    set.add("state-backed-form");
  }
  if (hasI18nSurface && (concepts.includes("forms") || concepts.includes("state") || hasFormDataOrValidationSurface(snippetText))) {
    set.add("localized-state-backed-form");
  }
  if (hasValidationSurface) {
    set.add("validated-state-backed-form");
  }
  if (hasI18nSurface && hasValidationSurface) {
    set.add("localized-validated-state-backed-form");
  }
  if (hasMultiStepSurface && (concepts.includes("forms") || hasFormDataOrValidationSurface(snippetText))) {
    set.add("multi-step-state-backed-form");
  }
  if (hasStateOwnedServiceSurface) {
    set.add("service-backed-form");
  }
  if (hasFormServiceSurface && !hasStateOwnedServiceSurface) {
    set.add("pressure-fixture");
  }
  if (hasRouterSurface) {
    set.add("routed-app-shell");
    set.add("routed-state-backed-form");
  }
  if (hasRouterSurface && hasStateOwnedServiceSurface) {
    set.add("routed-service-backed-form");
  }
  if (hasRouterSurface && hasI18nSurface && hasValidationSurface) {
    set.add("routed-localized-validated-state-backed-form");
  }
  if (hasCatalogSurface) {
    set.add("catalog-storefront");
  }
  if (hasRouterSurface && hasCatalogSurface) {
    set.add("routed-catalog-storefront");
  }
  if (hasSearchableDataTable) {
    set.add("searchable-data-table");
  }
  if (hasRouterSurface && hasSearchableDataTable) {
    set.add("routed-searchable-data-table");
  }
  if (hasAuComposeSurface(snippetText)) {
    set.add("composed-dashboard");
  }
  if (hasAureliaStateStore) {
    set.add("state-store-list");
  }
  if (concepts.includes("observation") || concepts.includes("bindables") || concepts.includes("styles")) {
    set.add("pressure-fixture");
  }
  return [...set].sort();
}

const localFixtureSeedSurfaceClassificationRules: readonly FixtureSeedSurfaceClassificationRule[] = [
  {
    key: "value-channel-binding",
    summary: "Snippet contains an observer-backed binding value channel such as value/model/checked/class/style.",
    applies: hasValueChannelBindingSurface,
  },
  {
    key: "computed-decorator",
    summary: "Snippet declares @computed metadata for getter or trackable method observation.",
    applies: hasComputedDecoratorSurface,
  },
  {
    key: "computed-getter",
    summary: "Snippet declares a getter surface that can enter ObserverLocator computed observation.",
    applies: hasComputedGetterSurface,
  },
  {
    key: "class-token-binding",
    summary: "Snippet contains a whole-class binding channel such as class.bind or class interpolation.",
    applies: (snippetText) => hasBindingSurfaceChannel(snippetText, "class-attribute-tokens"),
  },
  {
    key: "class-toggle-binding",
    summary: "Snippet contains a per-token class binding surface such as name.class.",
    applies: (snippetText) => hasBindingSurfaceChannel(snippetText, "class-toggle"),
  },
  {
    key: "style-rule-binding",
    summary: "Snippet contains a whole-style binding channel such as style.bind or style interpolation.",
    applies: (snippetText) => hasBindingSurfaceChannel(snippetText, "style-attribute-rules"),
  },
  {
    key: "style-property-binding",
    summary: "Snippet contains a per-property style binding surface such as width.style.",
    applies: (snippetText) => hasBindingSurfaceChannel(snippetText, "style-property-value"),
  },
  {
    key: "native-form-control",
    summary: "Snippet contains native form-control markup such as input, select, option, textarea, or form.",
    applies: hasNativeFormControlSurface,
  },
  {
    key: "native-value-binding",
    summary: "Snippet binds the native value property on an input, select, or textarea control.",
    applies: hasNativeValueBindingSurface,
  },
  {
    key: "native-select-binding",
    summary: "Snippet binds the native select value observer channel.",
    applies: hasNativeSelectBindingSurface,
  },
  {
    key: "native-checked-binding",
    summary: "Snippet binds the native checked property on an input control.",
    applies: hasNativeCheckedBindingSurface,
  },
  {
    key: "checked-collection-binding",
    summary: "Snippet combines checked binding with array or Set collection membership semantics.",
    applies: hasCheckedCollectionBindingSurface,
  },
  {
    key: "checked-map-binding",
    summary: "Snippet combines checked binding with Map key/boolean-value semantics.",
    applies: hasCheckedMapBindingSurface,
  },
  {
    key: "custom-matcher-binding",
    summary: "Snippet binds matcher for checked or select value identity.",
    applies: hasCustomMatcherBindingSurface,
  },
  {
    key: "select-multiple-binding",
    summary: "Snippet binds a multiple select value channel.",
    applies: hasSelectMultipleBindingSurface,
  },
  {
    key: "option-model-binding",
    summary: "Snippet binds option.model for select option value identity.",
    applies: hasOptionModelBindingSurface,
  },
  {
    key: "binding-behavior-application",
    summary: "Snippet applies a binding behavior in an Aurelia binding expression.",
    applies: hasBindingBehaviorApplicationSurface,
  },
  {
    key: "direct-target-operation",
    summary: "Snippet contains direct class/style/css target-operation syntax inside an HTML-like tag.",
    applies: hasTargetOperationSurface,
  },
  {
    key: "validation-binding-behavior",
    summary: "Snippet contains validation binding-behavior syntax or validation-behavior prose.",
    applies: hasValidationBindingBehaviorSurface,
  },
  {
    key: "multi-step-form",
    summary: "Snippet contains wizard, step, or progress-shaped form flow surface.",
    applies: hasMultiStepFormSurface,
  },
  {
    key: "router-authoring",
    summary: "Snippet contains concrete Aurelia router API, route config, route decorator, viewport, or router package syntax.",
    applies: hasRouterAuthoringSurface,
  },
  {
    key: "au-compose",
    summary: "Snippet contains concrete Aurelia dynamic composition syntax or AuCompose API usage.",
    applies: hasAuComposeSurface,
  },
  {
    key: "au-compose-component-input",
    summary: "Snippet supplies an AuCompose component input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "component.bind")
      || hasAuComposeAttributeSurface(snippetText, "component"),
  },
  {
    key: "au-compose-model-input",
    summary: "Snippet supplies an AuCompose model input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "model.bind")
      || hasAuComposeAttributeSurface(snippetText, "model"),
  },
  {
    key: "au-compose-template-input",
    summary: "Snippet supplies an AuCompose template input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "template.bind")
      || hasAuComposeAttributeSurface(snippetText, "template"),
  },
  {
    key: "au-compose-scope-behavior",
    summary: "Snippet supplies AuCompose scope-behavior input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "scope-behavior"),
  },
  {
    key: "au-compose-flush-mode",
    summary: "Snippet supplies AuCompose flush-mode input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "flush-mode"),
  },
  {
    key: "au-compose-tag",
    summary: "Snippet supplies AuCompose host tag input.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "tag"),
  },
  {
    key: "au-compose-composition-binding",
    summary: "Snippet binds AuCompose composition from-view output.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "composition.bind"),
  },
  {
    key: "au-compose-composing-binding",
    summary: "Snippet binds AuCompose composing from-view output.",
    applies: (snippetText) => hasAuComposeAttributeSurface(snippetText, "composing.bind"),
  },
  {
    key: "au-compose-object-component",
    summary: "Snippet supplies an object-shaped or non-resource component value to AuCompose.",
    applies: hasAuComposeObjectComponentSurface,
  },
  {
    key: "service",
    summary: "Snippet contains a service-shaped type, import/path, or DI resolution surface.",
    applies: hasServiceSurface,
  },
  {
    key: "state-store",
    summary: "Snippet contains a concrete state/store type, path, API, or DI resolution surface.",
    applies: hasStateSurface,
  },
  {
    key: "catalog-storefront",
    summary: "Snippet contains product/catalog/cart/checkout vocabulary with list, state, or template surface evidence.",
    applies: hasCatalogStorefrontSurface,
  },
  {
    key: "searchable-data-table",
    summary: "Snippet contains table/list management plus search, filter, sort, pagination, or selection surface evidence.",
    applies: hasSearchableDataTableSurface,
  },
  {
    key: "aurelia-state-store",
    summary: "Snippet contains @aurelia/state store configuration, state binding behavior, or dispatch command syntax.",
    applies: hasAureliaStateStoreSurface,
  },
  {
    key: "convention-resource",
    summary: "Snippet contains convention-shaped Aurelia custom element/template resource evidence without requiring decorator syntax.",
    applies: hasConventionMinimalAppSurface,
  },
];

function fixtureSeedClassificationReasons(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
  effectHints: readonly FrameworkCorpusExpectedEffectHint[],
  recipeHints: readonly FrameworkCorpusFixtureRecipeHint[],
  localSurfaceSource: boolean,
): readonly FrameworkCorpusFixtureSeedClassificationReason[] {
  const reasons = new Map<string, FrameworkCorpusFixtureSeedClassificationReason>();
  const add = (
    kind: FrameworkCorpusFixtureSeedClassificationKind,
    key: string,
    summary: string,
  ) => reasons.set(`${kind}:${key}`, { kind, key, summary });

  for (const concept of concepts) {
    add("concept", concept, `Snippet was classified with the ${concept} corpus concept.`);
  }
  if (localSurfaceSource) {
    for (const rule of localFixtureSeedSurfaceClassificationRules) {
      if (rule.applies(snippetText)) {
        add("surface", rule.key, rule.summary);
      }
    }
  }
  if (hasObserverLocatorDescriptorMatrixSurface(snippetText)) {
    add("surface", "observer-locator-descriptor-matrix", "Snippet is the ObserverLocator descriptor matrix that grounds accessor descriptor target-access decisions.");
  }
  if (hasObserverLocatorSetterOnlyDescriptorCase(snippetText)) {
    add("surface", "observer-locator-setter-only-accessor", "Snippet includes the setter-only accessor branch where configurable descriptors select ComputedObserver.");
  }

  for (const effect of effectHints) {
    add("effect", effect, effectHintReason(effect, concepts, snippetText));
  }
  for (const recipe of recipeHints) {
    add("recipe", recipe, recipeHintReason(recipe, concepts, snippetText));
  }
  if (
    recipeHints.includes("pressure-fixture") &&
    concepts.includes("forms") &&
    concepts.includes("di") &&
    hasFormDataOrValidationSurface(snippetText) &&
    hasServiceSurface(snippetText) &&
    !hasStateSurface(snippetText)
  ) {
    add("contrast", "direct-service-form", "Form + DI + service pressure lacks a concrete state/store surface, so it is contrastive rather than a service-backed state recipe seed.");
  }

  return [...reasons.values()].sort((left, right) =>
    left.kind.localeCompare(right.kind) ||
    left.key.localeCompare(right.key)
  );
}

function effectHintReason(
  effect: FrameworkCorpusExpectedEffectHint,
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): string {
  if (expectedEffectsForSourceText(snippetText).includes(effect)) {
    return `Expected-effect hint ${effect} was assigned from concrete snippet syntax.`;
  }
  if (expectedEffectsForConceptCombination(concepts, snippetText).includes(effect)) {
    return `Expected-effect hint ${effect} was assigned from a concept combination plus service/state surface evidence.`;
  }
  const conceptOwners = concepts.filter((concept) => expectedEffectsForConcept(concept).includes(effect));
  return conceptOwners.length === 0
    ? `Expected-effect hint ${effect} was assigned by corpus classification.`
    : `Expected-effect hint ${effect} was assigned from concept(s): ${conceptOwners.join(", ")}.`;
}

function recipeHintReason(
  recipe: FrameworkCorpusFixtureRecipeHint,
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): string {
  switch (recipe) {
    case "minimal-app":
      return "Snippet has template/resource/style pressure without a more specific app, form, DI, state, validation, or router pressure.";
    case "convention-minimal-app":
      return "Snippet has convention-shaped Aurelia custom element/template evidence that can seed convention minimal app fixture work.";
    case "state-backed-form":
      return "Snippet has form or state pressure that can seed state-backed form fixture work.";
    case "localized-state-backed-form":
      return "Snippet has i18n plus form/state pressure that can seed localized form fixture work.";
    case "validated-state-backed-form":
      return "Snippet has validation binding-behavior pressure that can seed validated form fixture work.";
    case "localized-validated-state-backed-form":
      return "Snippet has both i18n and validation binding-behavior pressure that can seed combined plugin form fixture work.";
    case "multi-step-state-backed-form":
      return "Snippet has wizard, step, or progress-shaped form flow pressure that can seed a multi-step state-backed form recipe.";
    case "service-backed-form":
      return "Snippet has form + DI + service surface plus concrete state/store surface, matching the service-backed state recipe.";
    case "routed-app-shell":
      return "Snippet has concrete router authoring/runtime syntax that can seed a routed app shell without importing a form, catalog, or data-table domain model.";
    case "routed-state-backed-form":
      return "Snippet has concrete router authoring/runtime syntax that can seed routed state-backed fixture work.";
    case "routed-service-backed-form":
      return "Snippet combines router pressure with state-owned service form pressure, matching the routed service-backed form recipe.";
    case "routed-localized-validated-state-backed-form":
      return "Snippet has router, i18n, and validation pressure that can seed route-owned plugin form fixture work.";
    case "catalog-storefront":
      return "Snippet has product/catalog/cart/checkout pressure that can seed catalog storefront fixture work.";
    case "routed-catalog-storefront":
      return "Snippet combines router pressure with product/catalog/cart/checkout surface evidence that can seed routed catalog fixture work.";
    case "searchable-data-table":
      return "Snippet has table/list management pressure with search, filter, sort, pagination, or selection evidence.";
    case "routed-searchable-data-table":
      return "Snippet combines router pressure with searchable table/list management evidence.";
    case "composed-dashboard":
      return "Snippet has concrete AuCompose dynamic composition syntax that can seed composed dashboard fixture work.";
    case "state-store-list":
      return "Snippet has @aurelia/state store configuration, state binding behavior, or dispatch command pressure.";
    case "pressure-fixture":
      return pressureFixtureReason(concepts, snippetText);
  }
}

function pressureFixtureReason(
  concepts: readonly FrameworkCorpusConcept[],
  snippetText: string,
): string {
  if (
    concepts.includes("forms") &&
    concepts.includes("di") &&
    hasFormDataOrValidationSurface(snippetText) &&
    hasServiceSurface(snippetText) &&
    !hasStateSurface(snippetText)
  ) {
    return "Snippet has form + DI + service pressure without a concrete state/store surface, so it is useful contrastive fixture pressure.";
  }
  return "Snippet has observation, bindable, or style pressure that should be analyzed without assuming it is a generated authoring ideal.";
}

function hasServiceOrStateSurface(snippetText: string): boolean {
  return hasServiceSurface(snippetText) || hasStateSurface(snippetText);
}

function hasFormDataOrValidationSurface(snippetText: string): boolean {
  return hasNativeDataFormControlSurface(snippetText) ||
    hasNativeValueBindingSurface(snippetText) ||
    hasNativeCheckedBindingSurface(snippetText) ||
    hasOptionModelBindingSurface(snippetText) ||
    hasValidationBindingBehaviorSurface(snippetText);
}

function hasNativeDataFormControlSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*(?:form|input|select|option|textarea)\b/iu.test(tagText)
  );
}

function hasServiceSurface(snippetText: string): boolean {
  return /\b(?:[A-Z][A-Za-z0-9]*Service|I[A-Z][A-Za-z0-9]*Service|service|services\/|resolve\([^)]*(?:Service))/iu.test(snippetText);
}

function hasStateSurface(snippetText: string): boolean {
  return /\b(?:[A-Z][A-Za-z0-9]*State|IStore|Store<|getState\(|\.getState|stores\/|state\/|resolve\([^)]*(?:State|Store))/u.test(snippetText);
}

function hasConventionMinimalAppSurface(snippetText: string): boolean {
  const hasRootComponentClass = /\bexport\s+class\s+(?:App|[A-Z][A-Za-z0-9]*App)\b/u.test(snippetText);
  const hasTemplatePair = /\btemplateUrl\b|from\s+['"][^'"]+\.html['"]|<\s*template\b/iu.test(snippetText);
  const hasConventionElementName = htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*[a-z][\w]*-[\w-]+\b/u.test(tagText)
  );
  return hasRootComponentClass || hasTemplatePair || hasConventionElementName;
}

function hasCatalogStorefrontSurface(snippetText: string): boolean {
  const hasCatalogVocabulary = /\b(?:catalog|storefront|product|products|cart|checkout)\b/iu.test(snippetText);
  if (!hasCatalogVocabulary) {
    return false;
  }
  return /\b(?:Product\s*\{|Product\[\]|filteredProducts|selectedCategories|addToCart|minPrice|maxPrice|inStock|price-low|price-high|product-card|catalog-header)\b/u.test(snippetText) ||
    htmlLikeTagTexts(snippetText).some((tagText) =>
      /\brepeat\.for\s*=\s*["'][^"']*\bproduct\b/u.test(tagText) ||
      /\bclass\s*=\s*["'][^"']*(?:product|catalog|cart|checkout)/iu.test(tagText)
    );
}

function hasSearchableDataTableSurface(snippetText: string): boolean {
  const tagTexts = htmlLikeTagTexts(snippetText);
  const hasTableOrListCarrier =
    /\b(?:data[-\s]?table|DataTable|data[-_]?grid|DataGrid|filteredRows|selectedRows|visibleColumns)\b/iu.test(snippetText) ||
    tagTexts.some((tagText) =>
      /^<\s*(?:table|thead|tbody|tr|th|td)\b/iu.test(tagText) ||
      /\bclass\s*=\s*["'][^"']*(?:data-table|table-|grid|list)/iu.test(tagText)
    ) ||
    tagTexts.some((tagText) => hasManagedRepeatListCarrier(tagText));
  if (!hasTableOrListCarrier) {
    return false;
  }

  const hasListManagementVocabulary = /\b(?:searchQuery|filterText|filtered[A-Z][A-Za-z0-9]*|sort(?:By|Column|Direction)?|currentPage|pageSize|pagination|selectedRows|selectAll|deleteSelected|visibleColumns|currentFilter|setFilter|clearSearch)\b/u.test(snippetText);
  const hasControlSurface =
    hasNativeValueBindingSurface(snippetText) ||
    hasNativeSelectBindingSurface(snippetText) ||
    hasNativeCheckedBindingSurface(snippetText) ||
    hasOptionModelBindingSurface(snippetText) ||
    hasBindingBehaviorApplicationSurface(snippetText);
  return hasListManagementVocabulary && (hasControlSurface || hasComputedGetterSurface(snippetText) || /\bURLSearchParams\b|\bfetch\s*\(/u.test(snippetText));
}

function hasManagedRepeatListCarrier(tagText: string): boolean {
  if (!/\brepeat\.for\s*=/u.test(tagText)) {
    return false;
  }
  if (/^<\s*(?:option|template)\b/iu.test(tagText)) {
    return false;
  }
  return /\brepeat\.for\s*=\s*["'][^"']*(?:filtered[A-Z][A-Za-z0-9]*|row|rows|item|items|user|users|product|products|todo|todos)\b/u.test(tagText) ||
    /\bclass\s*=\s*["'][^"']*(?:row|item|card|list|product|todo|user)/iu.test(tagText);
}

function hasAureliaStateStoreSurface(snippetText: string): boolean {
  if (/from\s+['"]@aurelia\/state['"]/u.test(snippetText) || /\b(?:StateDefaultConfiguration|withStore|IActionHandler)\b/u.test(snippetText)) {
    return true;
  }
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /\b(?:value|checked|textcontent)\.state\s*=/u.test(tagText) ||
    /\b[\w-]+\.dispatch\s*=/u.test(tagText) ||
    /&\s*state(?:\b|:)/u.test(tagText)
  );
}

function hasRouterAuthoringSurface(snippetText: string): boolean {
  return /from\s+['"]@aurelia\/router['"]/u.test(snippetText)
    || /@route\s*\(|\broute\s*\(\s*\{/u.test(snippetText)
    || /\bRouterConfiguration(?:\b|\.|,|\s*\))/u.test(snippetText)
    || /\bI(?:Router|RouteContext|CurrentRoute)\b/u.test(snippetText)
    || /\b(?:Router|RouteContext|RouteConfig|RouteableComponent|ViewportAgent|ViewportInstruction|ViewportInstructionTree|TypedNavigationInstruction|RecognizedRoute|ComponentAgent)\b/u.test(snippetText)
    || /<\s*au-viewport\b|\bau-viewport\b/u.test(snippetText)
    || /\broutes\s*:\s*\[/u.test(snippetText)
    || /\bpath\s*:\s*['"][^'"]+['"][\s\S]{0,160}\bcomponent\s*:/u.test(snippetText);
}

function hasAuComposeSurface(snippetText: string): boolean {
  return /<\s*au-compose\b/iu.test(snippetText)
    || /\bAuCompose\b/u.test(snippetText);
}

function hasAuComposeAttributeSurface(snippetText: string, attributeName: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*au-compose\b/iu.test(tagText)
    && new RegExp(`\\b${escapeRegExp(attributeName)}\\s*=`, "iu").test(tagText)
  );
}

function hasAuComposeObjectComponentSurface(snippetText: string): boolean {
  return htmlLikeTagTexts(snippetText).some((tagText) =>
    /^<\s*au-compose\b/iu.test(tagText)
    && /\bcomponent\.bind\s*=\s*["']\s*(?:\{|new\s+|[A-Za-z_$][\w$]*Class\b)/u.test(tagText)
  );
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

function conceptCountsFor(
  text: string,
  context: ConceptExtractionContext,
): Readonly<Record<FrameworkCorpusConcept, number>> {
  const counts = {} as Record<FrameworkCorpusConcept, number>;
  for (const descriptor of CONCEPT_DESCRIPTORS) {
    descriptor.pattern.lastIndex = 0;
    counts[descriptor.id] = countMatches(text, descriptor.pattern);
  }
  const interpolationCount = aureliaInterpolationCount(text, context);
  counts.binding += interpolationCount;
  counts.expression += aureliaExpressionSurfaceCount(text, context);
  counts.templates += interpolationCount;
  counts.templates += aureliaBareElseTemplateControllerCount(text, context);
  return counts;
}

function conceptContextForDocFence(language: string): ConceptExtractionContext {
  return {
    aureliaInterpolation: isMarkupFenceLanguage(language)
      ? "markup"
      : "mixed-template-host",
  };
}

function isMarkupFenceLanguage(language: string): boolean {
  return /^(?:html|HTML|markup)$/u.test(language);
}

function aureliaInterpolationCount(
  text: string,
  context: ConceptExtractionContext,
): number {
  if (!text.includes("${")) {
    return 0;
  }
  return countAureliaMarkupContexts(text, context, (markup) => countMatches(markup, /\$\{/gu));
}

function aureliaExpressionSurfaceCount(
  text: string,
  context: ConceptExtractionContext,
): number {
  return countAureliaMarkupContexts(text, context, expressionSurfaceCountForMarkup);
}

function expressionSurfaceCountForMarkup(markup: string): number {
  return countMatches(
    markup,
    /\b[\w-]+\.(?:bind|two-way|from-view|to-view|trigger|delegate|capture|call)\s*=/gu,
  )
    + countMatches(markup, /\$\{/gu)
    + countMatches(markup, /\b(?:repeat\.for|if\.bind|switch\.bind|case|with\.bind|promise\.bind|then|catch)\s*=/gu);
}

function stringLiteralsWithMarkup(text: string): readonly string[] {
  return [...text.matchAll(/`[^`]*`|'[^']*'|"[^"]*"/gsu)]
    .map((match) => match[0] ?? "")
    .filter((literal) => /<[A-Za-z]/u.test(literal));
}

function aureliaBareElseTemplateControllerCount(
  text: string,
  context: ConceptExtractionContext,
): number {
  return countAureliaMarkupContexts(text, context, bareElseTemplateControllerCountForMarkup);
}

function countAureliaMarkupContexts(
  text: string,
  context: ConceptExtractionContext,
  countMarkup: (markup: string) => number,
): number {
  switch (context.aureliaInterpolation) {
    case "markup":
      return countMarkup(text);
    case "mixed-template-host":
      return stringLiteralsWithMarkup(text)
        .reduce((count, literal) => count + countMarkup(literal), 0);
    case "none":
      return 0;
  }
}

function bareElseTemplateControllerCountForMarkup(markup: string): number {
  return htmlLikeTagTexts(markup).filter(hasBareElseAttribute).length;
}

function hasBareElseAttribute(tagText: string): boolean {
  return /\selse(?:\s|=|>|$)/u.test(tagText);
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

function isFrameworkObjectTestCase(node: ts.ObjectLiteralExpression): boolean {
  const names = new Set(node.properties
    .filter(ts.isPropertyAssignment)
    .map((property) => propertyNameText(property.name))
    .filter((name): name is string => name !== null));
  return names.has("title") &&
    (names.has("template") || names.has("ViewModel") || names.has("assertFn"));
}

function objectTestCaseName(node: ts.ObjectLiteralExpression): string | null {
  for (const property of node.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      propertyNameText(property.name) !== "title"
    ) {
      continue;
    }
    const initializer = property.initializer;
    return ts.isStringLiteralLike(initializer)
      ? compactPreview(initializer.text).slice(0, 120)
      : null;
  }
  return null;
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
    case "object-test-case":
      return 90;
    case "it-call":
      return 80;
    case "code-fence":
      return 60;
    case "describe-call":
      return 0;
  }
}
