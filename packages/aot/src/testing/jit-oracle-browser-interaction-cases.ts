import {
  itHydrateTemplateController,
  itPropertyBinding,
} from "@aurelia/template-compiler";
import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  inlineCompilerWorld,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerAuthorityReference,
  CompilerCase,
  CompilerCaseData,
  CompilerEffectPosture,
  CompilerFocusedInvariant,
} from "./compiler-case.js";

const browserSubstrateRevision = "b1a646c7bef0c2e6a4b3578ebb601ed8b01d8546";
const templateFactorySource = "packages/template-compiler/src/template-element-factory.ts";
const templateFactorySuite = "packages/__tests__/src/3-runtime-html/template-element-factory.spec.ts";
const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const browserCasesSource = "packages/aot/src/testing/browser-tree-oracle-cases.ts";
const browserDraftSuite = "packages/semantic-runtime/test/browser-template-draft.test.ts";
const browserSelectionSource = "packages/semantic-runtime/src/template/browser-template-selection.ts";

const fosterTargetOrderCase = jitCharacterizationCase({
  id: "interaction.browser.foster-target-order",
  family: "browser-compiler-interaction",
  tags: ["interaction", "browser-recovery", "foster-parenting", "target-order"],
  requirement:
    "Framework JIT rows follow foster-parented effective DOM order rather than the authored table-token order.",
  provenance: [
    workspaceAuthority(browserCasesSource, 65, 85, "regression", {
      testName: "browser-tree.foster-parenting and browser-tree.foster-merged-text",
      summary: "The independent Chromium batch fixes the effective foster-parented root and text order.",
    }),
    workspaceAuthority(browserDraftSuite, 106, 126, "behavior", {
      testName: "characterizes the parse5 template-fragment candidate in one fast batch",
      summary: "The semantic browser draft retains fostered paths, implied tbody, and ambiguous merged-text pressure.",
    }),
    compilerAuthority(templateFactorySource, 28, 50, "implementation", {
      symbolName: "TemplateElementFactory.createTemplate",
      summary: "String compiler input enters the platform HTML template-fragment parser before traversal.",
    }),
    compilerAuthority(templateCompilerSource, 369, 681, "implementation", {
      symbolName: "TemplateCompiler._compileNode/_compileElement",
      summary: "The compiler walks the materialized tree and publishes rows in its effective document order.",
    }),
    compilerAuthority(directCompilerSuite, 589, 615, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "many elements and mixed targets preserve implicit ordering",
      summary: "The direct suite establishes ordinary document-order target rows but does not cover foster parenting.",
    }),
  ],
  obligations: [
    compilerObligation(
      "compiler.interaction.browser-foster-target-order",
      "primary",
      "The fostered elements and table descendant produce rows in browser-effective order.",
    ),
    compilerObligation("compiler.browser-tree.recovery", "boundary", "The platform moves invalid table children before compilation."),
    compilerObligation("compiler.browser-tree.authored-disposition", "boundary", "Moved and implied structure requires explicit authored disposition."),
    compilerObligation("compiler.node.fragment-walk", "interaction", "The JIT traverses the resulting fragment in effective order."),
    compilerObligation("compiler.node.row-target-alignment", "interaction", "Every final marker remains aligned to its row."),
    compilerObligation("compiler.tree.marker.element-target", "runtime-consequence", "Each bound effective element receives one marker."),
    compilerObligation("compiler.browser-tree.compiler-lineage", "boundary", "No cross-lane compiler lineage is claimed by this JIT witness."),
  ],
  world: inlineCompilerWorld(
    "browser-foster-target-order",
    '<table><div title.bind="outside">z</div><tr><td textcontent.bind="inside"></td></tr>'
      + '<div class.bind="after">q</div></table>',
  ),
  effects: [browserRecoveryEffect(
    "effect.browser.foster-parenting",
    "The browser tree builder moves two bound div targets ahead of the table before framework traversal.",
  )],
  invariants: [
    ...compiledDefinitionEnvelope("browser-foster-target-order", 3),
    templateHtml(
      "foster.template",
      "<template><!--au--><div>z</div><!--au--><div>q</div><table><tbody><tr><!--au--><td></td></tr></tbody></table></template>",
    ),
    ...propertyBindingRow("foster.outside", 0, "title", "outside"),
    ...propertyBindingRow("foster.after", 1, "class", "after"),
    ...propertyBindingRow("foster.inside", 2, "textContent", "inside"),
  ],
  contrasts: [],
});

const paragraphControllerTopologyCase = jitCharacterizationCase({
  id: "interaction.browser.paragraph-controller-topology",
  family: "browser-compiler-interaction",
  tags: ["interaction", "browser-recovery", "paragraph", "template-controller", "topology"],
  requirement:
    "Paragraph auto-close turns syntactically nested controller hosts into independent root controller rows.",
  provenance: [
    workspaceAuthority(browserCasesSource, 54, 62, "regression", {
      testName: "browser-tree.paragraph-auto-close",
      summary: "Chromium fixes the closed paragraph, sibling div, trailing text, and generated empty paragraph shape.",
    }),
    workspaceAuthority(browserDraftSuite, 96, 104, "behavior", {
      testName: "characterizes the parse5 template-fragment candidate in one fast batch",
      summary: "The semantic draft records the auto-closed paragraph extent and effective sibling structure.",
    }),
    compilerAuthority(templateFactorySource, 28, 50, "implementation", {
      symbolName: "TemplateElementFactory.createTemplate",
      summary: "The platform closes the paragraph before the JIT sees controller hosts.",
    }),
    compilerAuthority(templateCompilerSource, 557, 645, "implementation", {
      symbolName: "TemplateCompiler._compileElement",
      summary: "Each effective controller host is wrapped into its own nested definition and parent row.",
    }),
    compilerAuthority(directCompilerSuite, 1263, 1640, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "TemplateCompiler combinations -- nested template controllers",
      summary: "The direct suite grounds controller-definition topology without paragraph recovery pressure.",
    }),
  ],
  obligations: [
    compilerObligation(
      "compiler.interaction.browser-paragraph-controller-topology",
      "primary",
      "The recovered p and div hosts become two sibling controller rows rather than one nested chain.",
    ),
    compilerObligation("compiler.browser-tree.recovery", "boundary", "Browser paragraph closure changes the physical owner graph."),
    compilerObligation("compiler.browser-tree.authored-disposition", "boundary", "The generated empty paragraph and split siblings require explicit disposition."),
    compilerObligation("compiler.template-controller.siblings", "interaction", "The two recovered hosts retain independent root rows."),
    compilerObligation("compiler.template-controller.child-context", "interaction", "The div binding remains inside only the div controller definition."),
    compilerObligation("compiler.template-controller.nested-definition", "interaction", "Each controller receives one closed nested definition."),
    compilerObligation("compiler.node.row-target-alignment", "interaction", "Root render locations remain aligned with the two controller rows."),
    compilerObligation("compiler.browser-tree.compiler-lineage", "boundary", "This JIT result does not close browser-to-compiler ancestry."),
  ],
  world: inlineCompilerWorld(
    "browser-paragraph-controller-topology",
    '<p if.bind="outer">a<div if.bind="inner" title.bind="leaf">b</div>c</p>',
  ),
  effects: [browserRecoveryEffect(
    "effect.browser.paragraph-auto-close",
    "The browser closes p before div and creates the trailing empty p before controller lowering.",
  )],
  invariants: [
    ...compiledDefinitionEnvelope("browser-paragraph-controller-topology", 2),
    templateHtml(
      "paragraph.template",
      "<template><!--au--><!--au-start--><!--au-end--><!--au--><!--au-start--><!--au-end-->c<p></p></template>",
    ),
    rowWidth("paragraph.outer-width", 0, 1),
    instructionField("paragraph.outer-type", 0, 0, "type", itHydrateTemplateController),
    instructionField("paragraph.outer-resource", 0, 0, "res", "if"),
    instructionPath("paragraph.outer-source", 0, 0, ["props", 0, "from", "name"], "outer"),
    instructionPath("paragraph.outer-child-rows", 0, 0, ["def", "instructions", "length"], 0),
    rowWidth("paragraph.inner-width", 1, 1),
    instructionField("paragraph.inner-type", 1, 0, "type", itHydrateTemplateController),
    instructionField("paragraph.inner-resource", 1, 0, "res", "if"),
    instructionPath("paragraph.inner-source", 1, 0, ["props", 0, "from", "name"], "inner"),
    instructionPath("paragraph.leaf-type", 1, 0, ["def", "instructions", 0, 0, "type"], itPropertyBinding),
    instructionPath("paragraph.leaf-target", 1, 0, ["def", "instructions", 0, 0, "to"], "title"),
    instructionPath("paragraph.leaf-source", 1, 0, ["def", "instructions", 0, 0, "from", "name"], "leaf"),
  ],
  contrasts: [],
});

const duplicateBindingElisionCase = jitCharacterizationCase({
  id: "interaction.browser.duplicate-binding-elision",
  family: "browser-compiler-interaction",
  tags: ["interaction", "browser-recovery", "attribute", "binding", "duplicate"],
  requirement: "Case-folded duplicate binding attributes reach the JIT as one first-wins binding instruction.",
  provenance: [
    workspaceAuthority(browserCasesSource, 146, 154, "regression", {
      testName: "browser-tree.duplicate-attributes",
      summary: "Chromium and parse5 retain only the first case-folded HTML attribute.",
    }),
    workspaceAuthority(browserDraftSuite, 227, 246, "behavior", {
      testName: "characterizes the parse5 template-fragment candidate in one fast batch",
      summary: "The semantic draft records the surviving attribute and duplicate-attribute parser issue.",
    }),
    compilerAuthority(templateFactorySource, 28, 50, "implementation", {
      symbolName: "TemplateElementFactory.createTemplate",
      summary: "Duplicate attributes are removed by platform parsing before classification.",
    }),
    compilerAuthority(templateCompilerSource, 754, 979, "implementation", {
      symbolName: "TemplateCompiler._classifyAttributes",
      summary: "The classifier lowers only the effective surviving attribute supplied by the DOM.",
    }),
    compilerAuthority(directCompilerSuite, 227, 358, "behavior", {
      suiteName: "3-runtime-html/template-compiler.spec.ts",
      testName: "ordinary element binding classification",
      summary: "The direct suite grounds ordinary binding lowering but does not cover browser duplicate elision.",
    }),
  ],
  obligations: [
    compilerObligation(
      "compiler.interaction.browser-duplicate-binding-elision",
      "primary",
      "Only the first case-folded binding attribute becomes a property-binding instruction.",
    ),
    compilerObligation("compiler.browser-tree.recovery", "boundary", "The browser drops duplicate attribute tokens before classification."),
    compilerObligation("compiler.browser-tree.authored-disposition", "primary", "The dropped second binding needs an explicit authored disposition."),
    compilerObligation("compiler.attribute.syntax", "interaction", "The surviving raw syntax enters ordinary attribute parsing."),
    compilerObligation("compiler.attribute.plain-binding-command", "interaction", "The surviving .bind syntax emits one DOM property binding."),
    compilerObligation("compiler.instruction.property-binding", "runtime-consequence", "The instruction preserves the first source and title target."),
  ],
  world: inlineCompilerWorld(
    "browser-duplicate-binding-elision",
    '<div title.bind="first" TITLE.BIND="second"></div>',
  ),
  effects: [browserRecoveryEffect(
    "effect.browser.duplicate-attribute",
    "The browser case-folds both attribute names and discards the second binding before the JIT classifier.",
  )],
  invariants: [
    ...compiledDefinitionEnvelope("browser-duplicate-binding-elision", 1),
    templateHtml("duplicate.template", "<template><!--au--><div></div></template>"),
    ...propertyBindingRow("duplicate.binding", 0, "title", "first"),
  ],
  contrasts: [],
});

const carrierCommentShieldCase = jitCharacterizationCase({
  id: "interaction.browser.carrier-comment-shield",
  family: "browser-compiler-interaction",
  tags: ["interaction", "materialization", "root-wrapper", "comment", "policy-open"],
  requirement:
    "Current TemplateElementFactory selection ignores meaningful text shielded from the sole template by comments.",
  provenance: [
    workspaceAuthority(browserSelectionSource, 42, 75, "implementation", {
      symbolName: "selectBrowserTemplateCompilerCarrier",
      summary: "The semantic selection draft mirrors the immediate-sibling rule and records discarded input nodes.",
    }),
    workspaceAuthority(browserDraftSuite, 339, 382, "behavior", {
      testName: "reproduces Aurelia string-template carrier selection without confusing it with parsing",
      summary: "The regression test fixes current comment-shield selection and all discarded sibling labels.",
    }),
    compilerAuthority(templateFactorySource, 28, 95, "implementation", {
      symbolName: "TemplateElementFactory.createTemplate/needsWrapping",
      summary: "The framework checks only immediate text siblings around the first template element.",
    }),
    compilerAuthority(templateFactorySuite, 14, 47, "behavior", {
      suiteName: "3-runtime-html/template-element-factory.spec.ts",
      testName: "template-wrapped and double-root markup strings",
      summary: "The framework suite covers ordinary wrapper selection but has no comment-shield case.",
    }),
  ],
  obligations: [
    compilerObligation(
      "compiler.interaction.browser-carrier-comment-shield",
      "primary",
      "The current factory selects the authored template and discards comment-shielded meaningful text.",
    ),
    compilerObligation("compiler.entry.materialization", "interaction", "String input passes through framework carrier selection."),
    compilerObligation("compiler.browser-tree.root-wrapper", "boundary", "The current selection conflicts with the idealized sole-meaningful-root wording."),
    compilerObligation("compiler.browser-tree.compiler-lineage", "boundary", "Discarded wrapper siblings remain an open lineage effect."),
  ],
  world: inlineCompilerWorld(
    "browser-carrier-comment-shield",
    'x<!--c--><template><div title.bind="inside"></div></template><!--d-->z',
  ),
  effects: [compilerBuiltInEffect(
    "effect.compiler.carrier-comment-shield",
    "Framework carrier selection discards meaningful text and comments outside the selected authored template.",
  )],
  invariants: [
    ...compiledDefinitionEnvelope("browser-carrier-comment-shield", 1),
    templateHtml("comment-shield.template", "<template><!--au--><div></div></template>"),
    ...propertyBindingRow("comment-shield.binding", 0, "title", "inside"),
  ],
  contrasts: [],
});

export const JIT_ORACLE_BROWSER_INTERACTION_CASES: readonly CompilerCase[] = [
  fosterTargetOrderCase,
  paragraphControllerTopologyCase,
  duplicateBindingElisionCase,
  carrierCommentShieldCase,
];

function browserRecoveryEffect(id: `effect.${string}`, summary: string): CompilerEffectPosture {
  return {
    id,
    kind: "browser-recovery",
    oracle: "observed",
    conservation: "open",
    affectedProducts: ["browser-effective-tree", "compiled-definition"],
    summary,
  };
}

function compilerBuiltInEffect(id: `effect.${string}`, summary: string): CompilerEffectPosture {
  return {
    id,
    kind: "compiler-built-in",
    oracle: "executed-by-framework",
    conservation: "open",
    affectedProducts: ["compiler-carrier-selection", "compiled-definition"],
    summary,
  };
}

function workspaceAuthority(
  filePath: string,
  startLine: number,
  endLine: number,
  role: CompilerAuthorityReference["role"],
  detail: Omit<CompilerAuthorityReference, "repository" | "revision" | "role" | "filePath" | "startLine" | "endLine">,
): CompilerAuthorityReference {
  return {
    repository: "aurelia-ls2",
    revision: browserSubstrateRevision,
    role,
    filePath,
    startLine,
    endLine,
    ...detail,
  };
}

function templateHtml(id: string, expected: string): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The final JIT template has the exact browser-interaction consequence.", {
    kind: "template-outer-html",
  }, expected);
}

function rowWidth(id: string, row: number, expected: number): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The effective target has the exact instruction width.", {
    kind: "instruction-row-width",
    row,
  }, expected);
}

function instructionField(
  id: string,
  row: number,
  instruction: number,
  field: string,
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return equalJitInvariant(id, `The interaction instruction retains ${field}.`,
    instructionFieldSelector(row, instruction, field), expected);
}

function instructionPath(
  id: string,
  row: number,
  instruction: number,
  path: readonly (string | number)[],
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return equalJitInvariant(id, `The interaction product retains ${path.join(".")}.`, {
    kind: "instruction-path",
    row,
    instruction,
    path,
  }, expected);
}

function propertyBindingRow(
  id: string,
  row: number,
  target: string,
  source: string,
): readonly CompilerFocusedInvariant[] {
  return [
    rowWidth(`${id}.width`, row, 1),
    instructionField(`${id}.type`, row, 0, "type", itPropertyBinding),
    instructionField(`${id}.target`, row, 0, "to", target),
    instructionPath(`${id}.source`, row, 0, ["from", "name"], source),
  ];
}
