import { createHash } from "node:crypto";
import type { BatchCaseDescriptor } from "./batch-contracts.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";

export const BROWSER_TREE_ORACLE_CASE_SCHEMA_VERSION = "aurelia-ls/aot-browser-tree-oracle-cases/v1" as const;

export type BrowserTreeOracleExpectation =
  | {
      readonly kind: "equivalent";
      readonly serialization: string;
    }
  | {
      readonly kind: "expected-divergence";
      readonly reasonCode: "customizable-select-parser-support";
      readonly reason: string;
      readonly authorityVersions: {
        readonly chromium: string;
        readonly semanticRuntimeParser: string;
      };
      readonly chromiumSerialization: string;
      readonly semanticRuntimeSerialization: string;
    };

/** One browser tree-builder burden with a version-scoped expected outcome. */
export interface BrowserTreeOracleCase extends BatchCaseDescriptor {
  readonly markup: string;
  readonly expectation: BrowserTreeOracleExpectation;
}

export const BROWSER_TREE_ORACLE_CASES: readonly BrowserTreeOracleCase[] = [
  {
    id: "browser-tree.ordinary",
    family: "browser-tree",
    tags: ["ordinary", "attributes", "comments", "void-element"],
    requirement: "Preserve ordinary HTML structure while applying browser serialization rules.",
    markup: '<section id="s"><h1>Hello</h1><!--c--><input disabled></section>',
    expectation: {
      kind: "equivalent",
      serialization: '<section id="s"><h1>Hello</h1><!--c--><input disabled=""></section>',
    },
  },
  {
    id: "browser-tree.implied-tbody",
    family: "browser-tree",
    tags: ["table", "implied-node"],
    requirement: "Insert the browser-implied tbody between table and authored tr.",
    markup: "<table><tr><td>x</td></tr></table>",
    expectation: {
      kind: "equivalent",
      serialization: "<table><tbody><tr><td>x</td></tr></tbody></table>",
    },
  },
  {
    id: "browser-tree.paragraph-auto-close",
    family: "browser-tree",
    tags: ["paragraph", "implied-node", "recovery"],
    requirement: "Represent paragraph auto-close and the empty paragraph induced by a stray closing tag.",
    markup: "<p>a<div>b</div>c</p>",
    expectation: {
      kind: "equivalent",
      serialization: "<p>a</p><div>b</div>c<p></p>",
    },
  },
  {
    id: "browser-tree.foster-parenting",
    family: "browser-tree",
    tags: ["table", "foster-parenting", "recovery"],
    requirement: "Move disallowed table children to their browser-effective foster-parented positions.",
    markup: "<table><div>x</div><tr><td>y</td></tr>z</table>",
    expectation: {
      kind: "equivalent",
      serialization: "<div>x</div>z<table><tbody><tr><td>y</td></tr></tbody></table>",
    },
  },
  {
    id: "browser-tree.foster-merged-text",
    family: "browser-tree",
    tags: ["table", "foster-parenting", "text", "source-location"],
    requirement:
      "Merge discontiguous foster-parented text runs structurally without treating their parser envelope as one authored span.",
    markup: "before<table>inside<tr><td>x</td></tr>after</table>",
    expectation: {
      kind: "equivalent",
      serialization: "beforeinsideafter<table><tbody><tr><td>x</td></tr></tbody></table>",
    },
  },
  {
    id: "browser-tree.nested-template",
    family: "browser-tree",
    tags: ["template", "table", "implied-node"],
    requirement: "Traverse nested template content and apply the tree builder inside its document fragment.",
    markup: '<template data-x="1"><table><tr><td>x</td></tr></table><p>y</template>',
    expectation: {
      kind: "equivalent",
      serialization:
        '<template data-x="1"><table><tbody><tr><td>x</td></tr></tbody></table><p>y</p></template>',
    },
  },
  {
    id: "browser-tree.svg-adjustments-and-integration-point",
    family: "browser-tree",
    tags: ["svg", "namespace", "adjusted-name", "foreign-content"],
    requirement: "Retain namespace transitions and browser-adjusted SVG element and attribute names.",
    markup:
      '<svg viewbox="0 0 1 1"><lineargradient id="g"><foreignobject><DIV foo="bar"></DIV></foreignobject></lineargradient><use xlink:href="#g" xml:lang="en"></use></svg>',
    expectation: {
      kind: "equivalent",
      serialization:
        '<svg viewBox="0 0 1 1"><linearGradient id="g"><foreignObject><div foo="bar"></div></foreignObject></linearGradient><use xlink:href="#g" xml:lang="en"></use></svg>',
    },
  },
  {
    id: "browser-tree.mathml-integration-points",
    family: "browser-tree",
    tags: ["mathml", "namespace", "integration-point", "foreign-content"],
    requirement: "Retain MathML namespace rules while re-entering HTML at the defined text integration points.",
    markup: "<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>",
    expectation: {
      kind: "equivalent",
      serialization: "<math><mtext><b>x</b></mtext><mi><mglyph></mglyph><i>y</i></mi></math>",
    },
  },
  {
    id: "browser-tree.crlf-and-entities",
    family: "browser-tree",
    tags: ["text", "crlf", "entities", "recovery"],
    requirement: "Apply newline normalization, character-reference decoding, and browser serialization.",
    markup: '<p title="a&amp;b">A\r\nB\rC &copy; &#x1F600; &notit; &nbsp;</p>',
    expectation: {
      kind: "equivalent",
      serialization: '<p title="a&amp;b">A\nB\nC © 😀 ¬it; &nbsp;</p>',
    },
  },
  {
    id: "browser-tree.rawtext-and-rcdata",
    family: "browser-tree",
    tags: ["text", "rawtext", "rcdata", "entities"],
    requirement: "Distinguish raw-text preservation from RCDATA entity decoding and serialization.",
    markup: "<style>a<b>&amp;</style><textarea>a<b>&amp;</textarea>",
    expectation: {
      kind: "equivalent",
      serialization: "<style>a<b>&amp;</style><textarea>a&lt;b&gt;&amp;</textarea>",
    },
  },
  {
    id: "browser-tree.duplicate-attributes",
    family: "browser-tree",
    tags: ["attributes", "duplicate", "case-folding", "recovery"],
    requirement: "Keep the first case-folded HTML attribute and discard later duplicates.",
    markup: '<div a="1" A="2" a="3" class="x" CLASS="y"></div>',
    expectation: {
      kind: "equivalent",
      serialization: '<div a="1" class="x"></div>',
    },
  },
  {
    id: "browser-tree.numeric-attribute-name-order",
    family: "browser-tree",
    tags: ["attributes", "source-location", "numeric-name", "ordering"],
    requirement: "Preserve effective attribute order even when JavaScript object-key enumeration would move a numeric name.",
    markup: '<div a="x" 0="y" b="z"></div>',
    expectation: {
      kind: "equivalent",
      serialization: '<div a="x" 0="y" b="z"></div>',
    },
  },
  {
    id: "browser-tree.noscript-inert-template-document",
    family: "browser-tree",
    tags: ["template", "noscript", "scripting-profile", "entities"],
    requirement: "Parse noscript structurally under the inert template-contents owner document.",
    markup: "<noscript><b>x&copy;</b><!--c--></noscript><i>y</i>",
    expectation: {
      kind: "equivalent",
      serialization: "<noscript><b>x©</b><!--c--></noscript><i>y</i>",
    },
  },
  {
    id: "browser-tree.noscript-serialization-collision",
    family: "browser-tree",
    tags: ["template", "noscript", "scripting-profile", "structural-oracle"],
    requirement: "Compare structure when raw-text and parsed noscript trees serialize to the same markup.",
    markup: "<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>",
    expectation: {
      kind: "equivalent",
      serialization: "<noscript><b>x&amp;copy;</b><!--c--></noscript><i>y</i>",
    },
  },
  {
    id: "browser-tree.adoption-agency-formatting",
    family: "browser-tree",
    tags: ["formatting", "adoption-agency", "recovery"],
    requirement: "Represent formatting-element reconstruction performed by the adoption agency algorithm.",
    markup: "<p><b>1<i>2</b>3</i>4</p>",
    expectation: {
      kind: "equivalent",
      serialization: "<p><b>1<i>2</i></b><i>3</i>4</p>",
    },
  },
  {
    id: "browser-tree.doctype-comment-and-null-recovery",
    family: "browser-tree",
    tags: ["doctype", "comment", "null", "recovery"],
    requirement: "Drop a fragment doctype, recover the malformed comment, and retain the effective text after a null token.",
    markup: "<!DOCTYPE html><!--a--b--><div>\0x</div>",
    expectation: {
      kind: "equivalent",
      serialization: "<!--a--b--><div>x</div>",
    },
  },
  {
    id: "browser-tree.customizable-select",
    family: "browser-tree",
    tags: ["select", "customizable-select", "expected-divergence"],
    requirement:
      "Keep Chromium's customizable-select support visible while the pinned parse5 profile still applies legacy select parsing.",
    markup: "<select><button><selectedcontent></selectedcontent></button><option>one</option></select>",
    expectation: {
      kind: "expected-divergence",
      reasonCode: "customizable-select-parser-support",
      reason:
        "Chromium admits the customizable-select button and selectedcontent subtree; parse5 8.0.1 still drops it under legacy in-select parsing.",
      authorityVersions: {
        chromium: "143.0.7499.4",
        semanticRuntimeParser: "8.0.1",
      },
      chromiumSerialization:
        "<select><button><selectedcontent></selectedcontent></button><option>one</option></select>",
      semanticRuntimeSerialization: "<select><option>one</option></select>",
    },
  },
];

export function validateBrowserTreeOracleCases(cases: readonly BrowserTreeOracleCase[]): void {
  if (cases.length === 0) {
    throw new Error("Browser-tree oracle requires at least one case.");
  }
  const seenIds = new Set<string>();
  for (const candidate of cases) {
    if (candidate.id.length === 0 || candidate.markup.length === 0) {
      throw new Error("Browser-tree oracle cases require non-empty ids and markup.");
    }
    if (seenIds.has(candidate.id)) {
      throw new Error(`Duplicate browser-tree oracle case id ${candidate.id}.`);
    }
    seenIds.add(candidate.id);
  }
}

/** Stable digest over markup, requirements, and version-scoped expected outcomes. */
export function browserTreeOracleCaseDigest(cases: readonly BrowserTreeOracleCase[]): string {
  validateBrowserTreeOracleCases(cases);
  const hash = createHash("sha256");
  hash.update(canonicalCompilerJson([...cases].sort((left, right) => left.id.localeCompare(right.id))));
  return `sha256:${hash.digest("hex")}`;
}
