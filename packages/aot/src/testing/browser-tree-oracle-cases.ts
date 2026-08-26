import { createHash } from "node:crypto";
import type { BatchCaseDescriptor } from "./batch-contracts.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import {
  COMPILER_CASE_SCHEMA_VERSION,
  COMPILER_CORPUS_FRAMEWORK_REVISION,
  type CompilerAuthorityReference,
  type CompilerCaseContrast,
  type CompilerConservationCase,
  type CompilerFocusedInvariant,
  type CompilerInvariantAssertion,
  type CompilerInvariantSelector,
} from "./compiler-case.js";
import { validateCompilerConservationCases } from "./compiler-case-catalog.js";

export const BROWSER_TREE_ORACLE_CASE_SCHEMA_VERSION =
  "aurelia-ls/aot-browser-tree-oracle-cases/v2" as const;
export const BROWSER_TREE_ORACLE_COMPARATOR_ID = "browser-tree-structure" as const;
export const BROWSER_TREE_ORACLE_AURELIA_LS2_REVISION =
  "b1a646c7bef0c2e6a4b3578ebb601ed8b01d8546" as const;

const browserTreeProvenance: readonly CompilerAuthorityReference[] = [
  {
    repository: "aurelia",
    revision: COMPILER_CORPUS_FRAMEWORK_REVISION,
    role: "behavior",
    filePath: "packages/template-compiler/src/template-element-factory.ts",
    startLine: 24,
    endLine: 34,
    symbolName: "TemplateElementFactory.createTemplate",
    summary: "Aurelia creates an inert HTML template and assigns string markup through template.innerHTML.",
  },
  {
    repository: "aurelia-ls2",
    revision: BROWSER_TREE_ORACLE_AURELIA_LS2_REVISION,
    role: "implementation",
    filePath: "packages/semantic-runtime/src/template/browser-template-parser.ts",
    startLine: 28,
    endLine: 52,
    symbolName: "parseBrowserTemplateFragmentDraft",
    summary: "Semantic-runtime pins parse5 to the HTML-template fragment context with scripting disabled.",
  },
  {
    repository: "aurelia-ls2",
    revision: BROWSER_TREE_ORACLE_AURELIA_LS2_REVISION,
    role: "regression",
    filePath: "packages/aot/scripts/run-browser-tree-oracle.mjs",
    startLine: 137,
    endLine: 196,
    symbolName: "observeChromiumBrowserTrees",
    summary: "One real Chromium template.innerHTML batch supplies the independent structural oracle.",
  },
];

type BrowserTreeOracleExpectation =
  | { readonly kind: "equivalent"; readonly serialization: string }
  | {
      readonly kind: "expected-divergence";
      readonly reasonCode: "customizable-select-parser-support";
      readonly reason: string;
      readonly authorityVersions: { readonly chromium: string; readonly semanticRuntimeParser: string };
      readonly chromiumSerialization: string;
      readonly semanticRuntimeSerialization: string;
    };

/** Validated browser evidence. It intentionally has no executable compiler world. */
export interface BrowserTreeOracleCase extends CompilerConservationCase {
  readonly caseKind: "browser-tree";
  readonly markup: string;
}

interface BrowserInvariantInput {
  readonly id: string;
  readonly description: string;
  readonly lanes?: CompilerFocusedInvariant["lanes"];
  readonly selector: CompilerInvariantSelector;
  readonly assertion: CompilerInvariantAssertion;
}

interface BrowserCaseInput extends BatchCaseDescriptor {
  readonly markup: string;
  readonly expectation: BrowserTreeOracleExpectation;
  readonly recovery: boolean;
  readonly invariants: readonly BrowserInvariantInput[];
  readonly contrasts: readonly CompilerCaseContrast[];
}

const caseInputs: readonly BrowserCaseInput[] = [
  {
    id: "browser-tree.ordinary",
    family: "browser-tree",
    tags: ["ordinary", "attributes", "comments", "void-element"],
    requirement: "Preserve ordinary HTML structure while applying browser serialization rules.",
    markup: '<section id="s"><h1>Hello</h1><!--c--><input disabled></section>',
    expectation: { kind: "equivalent", serialization: '<section id="s"><h1>Hello</h1><!--c--><input disabled=""></section>' },
    recovery: false,
    invariants: [treePath("root-element", [0, "tagName"], "section", "The ordinary root remains a section element.")],
    contrasts: [contrast("browser-tree.implied-tbody", "nearest-neighbor", "No tree-builder insertion is required.")],
  },
  {
    id: "browser-tree.implied-tbody",
    family: "browser-tree",
    tags: ["table", "implied-node"],
    requirement: "Insert the browser-implied tbody between table and authored tr.",
    markup: "<table><tr><td>x</td></tr></table>",
    expectation: { kind: "equivalent", serialization: "<table><tbody><tr><td>x</td></tr></tbody></table>" },
    recovery: true,
    invariants: [treePath("implied-tbody", [0, "children", 0, "tagName"], "tbody", "The effective table owns an implied tbody.")],
    contrasts: [contrast("browser-tree.ordinary", "nearest-neighbor", "The table insertion mode creates structure absent from source.")],
  },
  {
    id: "browser-tree.paragraph-auto-close",
    family: "browser-tree",
    tags: ["paragraph", "implied-node", "recovery"],
    requirement: "Represent paragraph auto-close and the empty paragraph induced by a stray closing tag.",
    markup: "<p>a<div>b</div>c</p>",
    expectation: { kind: "equivalent", serialization: "<p>a</p><div>b</div>c<p></p>" },
    recovery: true,
    invariants: [treePath("reopened-paragraph", [3, "tagName"], "p", "The stray end tag creates the final empty paragraph.")],
    contrasts: [contrast("browser-tree.adoption-agency-formatting", "nearest-neighbor", "Paragraph repair differs from formatting reconstruction.")],
  },
  {
    id: "browser-tree.foster-parenting",
    family: "browser-tree",
    tags: ["table", "foster-parenting", "recovery"],
    requirement: "Move disallowed table children to their browser-effective foster-parented positions.",
    markup: "<table><div>x</div><tr><td>y</td></tr>z</table>",
    expectation: { kind: "equivalent", serialization: "<div>x</div>z<table><tbody><tr><td>y</td></tr></tbody></table>" },
    recovery: true,
    invariants: [treePath("fostered-element", [0, "tagName"], "div", "The disallowed div moves before the table.")],
    contrasts: [contrast("browser-tree.foster-merged-text", "nearest-neighbor", "This case moves an element while its neighbor merges text.")],
  },
  {
    id: "browser-tree.foster-merged-text",
    family: "browser-tree",
    tags: ["table", "foster-parenting", "text", "source-location"],
    requirement: "Merge discontiguous foster-parented text runs without treating their envelope as one authored span.",
    markup: "before<table>inside<tr><td>x</td></tr>after</table>",
    expectation: { kind: "equivalent", serialization: "beforeinsideafter<table><tbody><tr><td>x</td></tr></tbody></table>" },
    recovery: true,
    invariants: [treePath("merged-text", [0, "value"], "beforeinsideafter", "The root text joins three discontiguous runs in order.")],
    contrasts: [contrast("browser-tree.foster-parenting", "nearest-neighbor", "The neighboring case exposes element movement.")],
  },
  {
    id: "browser-tree.nested-template",
    family: "browser-tree",
    tags: ["template", "table", "implied-node"],
    requirement: "Traverse nested template content and apply the tree builder inside its document fragment.",
    markup: '<template data-x="1"><table><tr><td>x</td></tr></table><p>y</template>',
    expectation: { kind: "equivalent", serialization: '<template data-x="1"><table><tbody><tr><td>x</td></tr></tbody></table><p>y</p></template>' },
    recovery: true,
    invariants: [treePath("content-tbody", [0, "content", 0, "children", 0, "tagName"], "tbody", "Tree building continues across template content.")],
    contrasts: [contrast("browser-tree.implied-tbody", "metamorphic", "The same table rule runs inside template content.")],
  },
  {
    id: "browser-tree.svg-adjustments-and-integration-point",
    family: "browser-tree",
    tags: ["svg", "namespace", "adjusted-name", "foreign-content"],
    requirement: "Retain namespace transitions and browser-adjusted SVG element and attribute names.",
    markup: '<svg viewbox="0 0 1 1"><lineargradient id="g"><foreignobject><DIV foo="bar"></DIV></foreignobject></lineargradient><use xlink:href="#g" xml:lang="en"></use></svg>',
    expectation: { kind: "equivalent", serialization: '<svg viewBox="0 0 1 1"><linearGradient id="g"><foreignObject><div foo="bar"></div></foreignObject></linearGradient><use xlink:href="#g" xml:lang="en"></use></svg>' },
    recovery: true,
    invariants: [treePath("adjusted-viewbox", [0, "attributes", 0, "name"], "viewBox", "The SVG attribute uses its adjusted effective name.")],
    contrasts: [contrast("browser-tree.mathml-integration-points", "nearest-neighbor", "SVG and MathML use distinct foreign-content rules.")],
  },
  {
    id: "browser-tree.mathml-integration-points",
    family: "browser-tree",
    tags: ["mathml", "namespace", "integration-point", "foreign-content"],
    requirement: "Retain MathML namespace rules while re-entering HTML at defined text integration points.",
    markup: "<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>",
    expectation: { kind: "equivalent", serialization: "<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>" },
    recovery: true,
    invariants: [treePath("html-integration", [0, "children", 0, "children", 0, "namespaceUri"], "http://www.w3.org/1999/xhtml", "The mtext child re-enters HTML.")],
    contrasts: [contrast("browser-tree.svg-adjustments-and-integration-point", "nearest-neighbor", "MathML integration differs from SVG adjustment.")],
  },
  {
    id: "browser-tree.crlf-and-entities",
    family: "browser-tree",
    tags: ["text", "crlf", "entities", "normalization"],
    requirement: "Apply newline normalization, character-reference decoding, and browser serialization.",
    markup: '<p title="a&amp;b">A\r\nB\rC &copy; &#x1F600; &notit; &nbsp;</p>',
    expectation: { kind: "equivalent", serialization: '<p title="a&amp;b">A\nB\nC © 😀 ¬it; &nbsp;</p>' },
    recovery: true,
    invariants: [treePathIncludes("normalized-text", [0, "children", 0, "value"], "A\nB\nC © 😀", "Text values decode entities and normalize CRLF.")],
    contrasts: [contrast("browser-tree.rawtext-and-rcdata", "nearest-neighbor", "Normal text decodes entities unlike raw text.")],
  },
  {
    id: "browser-tree.rawtext-and-rcdata",
    family: "browser-tree",
    tags: ["text", "rawtext", "rcdata", "entities"],
    requirement: "Distinguish raw-text preservation from RCDATA entity decoding and serialization.",
    markup: "<style>a<b>&amp;</style><textarea>a<b>&amp;</textarea>",
    expectation: { kind: "equivalent", serialization: "<style>a<b>&amp;</style><textarea>a&lt;b&gt;&amp;</textarea>" },
    recovery: true,
    invariants: [treePath("rawtext-value", [0, "children", 0, "value"], "a<b>&amp;", "Style raw text preserves character-reference spelling.")],
    contrasts: [contrast("browser-tree.crlf-and-entities", "nearest-neighbor", "Normal text follows a different tokenizer mode.")],
  },
  {
    id: "browser-tree.duplicate-attributes",
    family: "browser-tree",
    tags: ["attributes", "duplicate", "case-folding", "recovery"],
    requirement: "Keep the first case-folded HTML attribute and discard later duplicates.",
    markup: '<div a="1" A="2" a="3" class="x" CLASS="y"></div>',
    expectation: { kind: "equivalent", serialization: '<div a="1" class="x"></div>' },
    recovery: true,
    invariants: [treePath("surviving-second-attribute", [0, "attributes", 1, "name"], "class", "Only the first member of each duplicate group survives.")],
    contrasts: [contrast("browser-tree.numeric-attribute-name-order", "nearest-neighbor", "Filtering must not disturb surviving order.")],
  },
  {
    id: "browser-tree.numeric-attribute-name-order",
    family: "browser-tree",
    tags: ["attributes", "source-location", "numeric-name", "ordering"],
    requirement: "Preserve attribute order when object-key enumeration would move a numeric name.",
    markup: '<div a="x" 0="y" b="z"></div>',
    expectation: { kind: "equivalent", serialization: '<div a="x" 0="y" b="z"></div>' },
    recovery: true,
    invariants: [treePath("numeric-middle-attribute", [0, "attributes", 1, "name"], "0", "The numeric attribute remains between a and b.")],
    contrasts: [contrast("browser-tree.duplicate-attributes", "nearest-neighbor", "This case retains every attribute.")],
  },
  {
    id: "browser-tree.noscript-inert-template-document",
    family: "browser-tree",
    tags: ["template", "noscript", "scripting-profile", "entities"],
    requirement: "Parse noscript structurally under the inert template-contents owner document.",
    markup: "<noscript><b>x&copy;</b><!--c--></noscript><i>y</i>",
    expectation: { kind: "equivalent", serialization: "<noscript><b>x©</b><!--c--></noscript><i>y</i>" },
    recovery: true,
    invariants: [treePath("noscript-element-child", [0, "children", 0, "tagName"], "b", "Noscript owns a parsed b element.")],
    contrasts: [contrast("browser-tree.noscript-serialization-collision", "metamorphic", "The pair proves structure cannot be inferred from serialization.")],
  },
  {
    id: "browser-tree.noscript-serialization-collision",
    family: "browser-tree",
    tags: ["template", "noscript", "scripting-profile", "structural-oracle"],
    requirement: "Compare structure when raw-text and parsed noscript trees serialize to the same markup.",
    markup: "<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>",
    expectation: { kind: "equivalent", serialization: "<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>" },
    recovery: true,
    invariants: [treePath("structural-noscript-child", [0, "children", 0, "tagName"], "b", "Structural comparison observes the b node.")],
    contrasts: [contrast("browser-tree.noscript-inert-template-document", "metamorphic", "Only the text payload changes.")],
  },
  {
    id: "browser-tree.adoption-agency-formatting",
    family: "browser-tree",
    tags: ["formatting", "adoption-agency", "recovery"],
    requirement: "Represent formatting-element reconstruction performed by the adoption agency algorithm.",
    markup: "<p><b>1<i>2</b>3</i>4</p>",
    expectation: { kind: "equivalent", serialization: "<p><b>1<i>2</i></b><i>3</i>4</p>" },
    recovery: true,
    invariants: [treePath("reconstructed-italic", [0, "children", 1, "tagName"], "i", "The reconstructed italic is a second effective child.")],
    contrasts: [contrast("browser-tree.paragraph-auto-close", "nearest-neighbor", "Formatting reconstruction differs from paragraph repair.")],
  },
  {
    id: "browser-tree.doctype-comment-and-null-recovery",
    family: "browser-tree",
    tags: ["doctype", "comment", "null", "recovery"],
    requirement: "Drop a fragment doctype, recover the malformed comment, and retain effective text after a null token.",
    markup: "<!DOCTYPE html><!--a--b--><div>\0x</div>",
    expectation: { kind: "equivalent", serialization: "<!--a--b--><div>x</div>" },
    recovery: true,
    invariants: [treePath("recovered-comment", [0, "value"], "a--b", "The malformed comment remains without the fragment doctype.")],
    contrasts: [contrast("browser-tree.ordinary", "interaction-control", "The ordinary case has none of these tokenizer recoveries.")],
  },
  {
    id: "browser-tree.customizable-select",
    family: "browser-tree",
    tags: ["select", "customizable-select", "expected-divergence"],
    requirement: "Keep Chromium customizable-select support visible while pinned parse5 applies legacy select parsing.",
    markup: "<select><button><selectedcontent></selectedcontent></button><option>one</option></select>",
    expectation: {
      kind: "expected-divergence",
      reasonCode: "customizable-select-parser-support",
      reason: "Chromium admits the customizable-select subtree; parse5 8.0.1 drops it under legacy in-select parsing.",
      authorityVersions: { chromium: "143.0.7499.4", semanticRuntimeParser: "8.0.1" },
      chromiumSerialization: "<select><button><selectedcontent></selectedcontent></button><option>one</option></select>",
      semanticRuntimeSerialization: "<select><option>one</option></select>",
    },
    recovery: true,
    invariants: [
      laneSerialization("chromium-serialization", "chromium-parser", "<select><button><selectedcontent></selectedcontent></button><option>one</option></select>", "Chromium retains the customizable subtree."),
      laneSerialization("semantic-serialization", "semantic-runtime", "<select><option>one</option></select>", "Pinned parse5 exposes its legacy result."),
      { id: "chromium-button", description: "Chromium's first select child is the button.", lanes: ["chromium-parser"], selector: { kind: "browser-tree-path", path: [0, "children", 0, "tagName"] }, assertion: { kind: "equal", expected: "button" } },
      { id: "semantic-option", description: "Pinned parse5's first surviving child is the option.", lanes: ["semantic-runtime"], selector: { kind: "browser-tree-path", path: [0, "children", 0, "tagName"] }, assertion: { kind: "equal", expected: "option" } },
    ],
    contrasts: [contrast("browser-tree.ordinary", "interaction-control", "This is a pinned divergence, not an equivalence witness.")],
  },
];

export const BROWSER_TREE_ORACLE_CASES: readonly BrowserTreeOracleCase[] = caseInputs.map(browserCase);

function browserCase(input: BrowserCaseInput): BrowserTreeOracleCase {
  const effectId = `effect.${input.id}.${input.recovery ? "recovery" : "construction"}` as const;
  const claimId = `${input.id}.browser-tree-oracle`;
  const equivalent = input.expectation.kind === "equivalent";
  const claims = equivalent
    ? [{
        id: claimId,
        description: "Chromium and semantic-runtime produce the same structural browser-tree normal form.",
        kind: "equivalent" as const,
        left: { lane: "chromium-parser" as const, product: "browser-tree" as const },
        right: { lane: "semantic-runtime" as const, product: "browser-tree" as const },
        comparator: BROWSER_TREE_ORACLE_COMPARATOR_ID,
      }]
    : [{
        id: claimId,
        description: "The parser authorities retain one explicit version-scoped structural divergence.",
        kind: "expected-divergence" as const,
        left: { lane: "chromium-parser" as const, product: "browser-tree" as const },
        right: { lane: "semantic-runtime" as const, product: "browser-tree" as const },
        comparator: BROWSER_TREE_ORACLE_COMPARATOR_ID,
        reasonCode: input.expectation.reasonCode,
        reason: input.expectation.reason,
        authorityVersions: input.expectation.authorityVersions,
      }];
  const invariants = input.invariants.map((invariant): CompilerFocusedInvariant => ({
    ...invariant,
    id: `${input.id}.${invariant.id}`,
    lanes: invariant.lanes ?? ["chromium-parser", "semantic-runtime"],
  }));
  if (equivalent) {
    invariants.unshift({
      id: `${input.id}.serialization`,
      description: "Both parser authorities retain the characterized serialization witness.",
      lanes: ["chromium-parser", "semantic-runtime"],
      selector: { kind: "browser-serialization" },
      assertion: { kind: "equal", expected: input.expectation.serialization },
    });
  }
  return {
    caseKind: "browser-tree",
    id: input.id,
    family: input.family,
    tags: input.tags,
    requirement: input.requirement,
    schemaVersion: COMPILER_CASE_SCHEMA_VERSION,
    provenance: browserTreeProvenance,
    obligations: [
      {
        id: "compiler.browser-tree.fragment-context",
        role: "primary",
        summary: "Independent HTML-template fragment parsers run with scripting disabled.",
        ...(equivalent ? {
          closureEvidence: {
            dimension: "browser-tree" as const,
            claimIds: [claimId],
          },
        } : {}),
      },
      ...(input.recovery ? [{
        id: "compiler.browser-tree.recovery" as const,
        role: "interaction" as const,
        summary: "The case witnesses browser repair, insertion, movement, reconstruction, drop, normalization, or a parser-profile boundary.",
      }] : []),
    ],
    effects: [{
      id: effectId,
      kind: input.recovery ? "browser-recovery" : "browser-tree-construction",
      oracle: "observed",
      conservation: equivalent ? "statically-modeled" : "open",
      affectedProducts: ["browser-tree"],
      summary: equivalent
        ? "Chromium and the pinned semantic-runtime parser agree structurally for this effect."
        : "Pinned parse5 does not reproduce Chromium's customizable-select structure.",
    }],
    closure: browserClosure(equivalent, claimId, effectId),
    oracles: {
      lanes: [
        { id: "chromium-parser", expectedProduct: "browser-tree" },
        { id: "semantic-runtime", expectedProduct: "browser-tree" },
      ],
      claims,
    },
    invariants,
    contrasts: input.contrasts,
    markup: input.markup,
  };
}

function browserClosure(
  equivalent: boolean,
  claimId: string,
  effectId: `effect.${string}`,
): BrowserTreeOracleCase["closure"] {
  return [
    equivalent
      ? { dimension: "browser-tree", state: "closed", reason: "Independent structural parser observations agree for this pinned input.", evidenceClaimIds: [claimId] }
      : { dimension: "browser-tree", state: "open", reason: "The pinned parser authorities retain an expected divergence.", blockerEffectIds: [effectId] },
    { dimension: "compiler-world", state: "not-claimed", reason: "This evidence case constructs no Aurelia compiler or DI world." },
    { dimension: "syntax-lowering", state: "not-claimed", reason: "Browser parsing does not execute Aurelia syntax lowering." },
    { dimension: "dom-tree-effects", state: "not-claimed", reason: "No Aurelia compiler mutation or authored/compiler lineage is claimed." },
    { dimension: "compiler-extensions", state: "not-claimed", reason: "No compiler extension executes in the parser lanes." },
    { dimension: "compiled-output", state: "not-claimed", reason: "No compiled definition is produced." },
    { dimension: "runtime-dynamic-compilation", state: "not-claimed", reason: "No runtime compiler entry point is exercised." },
    { dimension: "runtime-expression-strings", state: "not-claimed", reason: "No runtime expression string is parsed." },
    { dimension: "extern-execution", state: "not-claimed", reason: "Pinned authority versions are not a hermetic execution claim." },
  ];
}

function treePath(
  id: string,
  path: readonly (string | number)[],
  expected: string,
  description: string,
): BrowserInvariantInput {
  return { id, description, selector: { kind: "browser-tree-path", path }, assertion: { kind: "equal", expected } };
}

function treePathIncludes(
  id: string,
  path: readonly (string | number)[],
  expected: string,
  description: string,
): BrowserInvariantInput {
  return { id, description, selector: { kind: "browser-tree-path", path }, assertion: { kind: "includes", expected } };
}

function laneSerialization(
  id: string,
  lane: "chromium-parser" | "semantic-runtime",
  expected: string,
  description: string,
): BrowserInvariantInput {
  return { id, description, lanes: [lane], selector: { kind: "browser-serialization" }, assertion: { kind: "equal", expected } };
}

function contrast(
  caseId: string,
  relation: CompilerCaseContrast["relation"],
  difference: string,
): CompilerCaseContrast {
  return { caseId, relation, difference };
}

export function validateBrowserTreeOracleCases(cases: readonly BrowserTreeOracleCase[]): void {
  if (cases.length === 0) {
    throw new Error("Browser-tree oracle requires at least one case.");
  }
  const caseIds = new Set(cases.map((candidate) => candidate.id));
  if (caseIds.size !== cases.length) {
    throw new Error("Duplicate browser-tree oracle case id.");
  }
  for (const candidate of cases) {
    if (candidate.caseKind !== "browser-tree") {
      throw new Error(`Browser-tree oracle case ${candidate.id} must declare caseKind='browser-tree'.`);
    }
    if (candidate.markup.length === 0) {
      throw new Error(`Browser-tree oracle case ${candidate.id} requires non-empty markup.`);
    }
    if (candidate.oracles.claims.length !== 1) {
      throw new Error(`Browser-tree oracle case ${candidate.id} requires exactly one comparison claim.`);
    }
    for (const row of candidate.contrasts) {
      if (!caseIds.has(row.caseId)) {
        throw new Error(`Browser-tree oracle case ${candidate.id} contrasts unknown case ${row.caseId}.`);
      }
      if (row.caseId === candidate.id) {
        throw new Error(`Browser-tree oracle case ${candidate.id} cannot contrast itself.`);
      }
    }
  }
  validateCompilerConservationCases(cases, new Set([BROWSER_TREE_ORACLE_COMPARATOR_ID]));
}

/** Stable digest over common evidence, markup, and version-scoped expected outcomes. */
export function browserTreeOracleCaseDigest(cases: readonly BrowserTreeOracleCase[]): string {
  validateBrowserTreeOracleCases(cases);
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson([...cases].sort((left, right) => left.id.localeCompare(right.id))));
  return `sha256:${hash.digest("hex")}`;
}
