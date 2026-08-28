import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  instructionFieldSelector,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerFocusedInvariant,
  CompilerRegistration,
  CompilerSetupInvocation,
  CompilerWorld,
} from "./compiler-case.js";
import { CUSTOM_ELEMENT_SETUP_ID } from "./jit-oracle-setups.js";

const localElementsSuite = "packages/__tests__/src/3-runtime-html/template-compiler.local-templates.spec.ts";
const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const renderingSource = "packages/runtime-html/src/templating/rendering.ts";

const hoistedBindablesCase = jitCharacterizationCase({
  id: "local.hoisted-bindables",
  family: "local-element",
  tags: ["local-element", "hoisting", "bindables", "modes", "recursive-compile"],
  requirement: "A local declaration is hoisted after repeated uses and preserves raw plus normalized bindable metadata.",
  provenance: [
    compilerAuthority(localElementsSuite, 240, 338, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "local template unit matrix",
      summary: "The framework matrix covers declaration order, repeated use, bindable modes, and explicit attributes.",
    }),
    compilerAuthority(templateCompilerSource, 1115, 1203, "implementation", {
      symbolName: "TemplateCompiler._compileLocalElement",
      summary: "Extraction creates generated Types before ordinary traversal and wires their dependency cohort.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.local-element.discovery", "primary", "The direct declaration is discovered before use-site traversal."),
    compilerObligation("compiler.local-element.extraction", "primary", "The declaration and bindable metadata are removed from owner output."),
    compilerObligation("compiler.local-element.definition", "primary", "One generated local Type retains the detached template."),
    compilerObligation("compiler.local-element.bindables", "primary", "Implicit and explicit bindable attributes remain distinct."),
    compilerObligation("compiler.local-element.modes", "primary", "Every authored local bindable mode survives raw and normalized layers."),
  ],
  world: localElementWorld(
    "aot-local-hoisted-bindables",
    '<local-card value="first" camel-value="camel" explicit-name.bind="message"></local-card>'
      + '<template as-custom-element="local-card">'
      + '<bindable name="value"></bindable>'
      + '<bindable name="camelValue" mode="default"></bindable>'
      + '<bindable name="twoWayValue" attribute="explicit-name" mode="twoWay"></bindable>'
      + '<bindable name="oneTimeValue" mode="oneTime"></bindable>'
      + '<bindable name="toViewValue" mode="toView"></bindable>'
      + '<bindable name="fromViewValue" mode="fromView"></bindable>'
      + '${value}${camelValue}${twoWayValue}${oneTimeValue}${toViewValue}${fromViewValue}'
      + '</template>'
      + '<local-card value="second"></local-card>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-local-hoisted-bindables", 2),
    definitionDependencies("local-hoisted.dependencies", 1),
    templateHtml(
      "local-hoisted.template",
      "<template><!--au--><local-card></local-card><!--au--><local-card></local-card></template>",
    ),
    instructionResource("local-hoisted.first-resource", 0, "local-card"),
    instructionResource("local-hoisted.second-resource", 1, "local-card"),
    instructionPath(
      "local-hoisted.explicit-mode",
      "Normalized local bindable mode controls the emitted use-site property binding.",
      0,
      ["props", 2, "mode"],
      6,
    ),
  ],
  contrasts: [{
    caseId: "local.peer-owner-closure",
    relation: "interaction-control",
    difference: "This case isolates hoisting and bindable layers; the peer case stresses cyclic Type visibility.",
  }],
});

const peerOwnerClosureCase = jitCharacterizationCase({
  id: "local.peer-owner-closure",
  family: "local-element",
  tags: ["local-element", "dependencies", "owner", "siblings", "cycles"],
  requirement: "Every top-level local sees authored dependencies, the owner Type, and every sibling local except itself.",
  provenance: [
    compilerAuthority(localElementsSuite, 577, 605, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "works with non-global dependencies in owning template",
      summary: "Owner-local dependency propagation is observable at runtime.",
    }),
    compilerAuthority(localElementsSuite, 668, 743, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "recognizes owning element / all local elements recognize each other",
      summary: "Owner and peer visibility require the generated cyclic dependency arrays.",
    }),
    compilerAuthority(templateCompilerSource, 1176, 1203, "implementation", {
      symbolName: "TemplateCompiler._compileLocalElement",
      summary: "The compiler allocates all Types before assigning owner and sibling dependencies in order.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.local-element.cohort-dependencies", "primary", "All three sibling Types form the exact ordered peer graph."),
    compilerObligation("compiler.local-element.owner-dependency", "primary", "Each local Type retains the source dependency and owner Type."),
    compilerObligation("compiler.local-element.definition", "interaction", "Each declaration remains one distinct local Type."),
  ],
  world: localElementWorld(
    "aot-local-peer-owner",
    '<owned-dep></owned-dep><local-a></local-a><local-b></local-b>'
      + '<template as-custom-element="local-a">'
      + '<local-b></local-b><owned-dep></owned-dep><aot-local-peer-owner if.bind="false"></aot-local-peer-owner>'
      + '</template>'
      + '<template as-custom-element="local-b"><local-c></local-c></template>'
      + '<template as-custom-element="local-c">local-c</template>',
    customElementDependency("owned-dependency", "owned-dep", "owned"),
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-local-peer-owner", 3),
    definitionDependencies("local-peer.dependencies", 4),
    templateHtml(
      "local-peer.template",
      "<template><!--au--><owned-dep></owned-dep><!--au--><local-a></local-a><!--au--><local-b></local-b></template>",
    ),
  ],
  contrasts: [{
    caseId: "local.recursive-nesting",
    relation: "nearest-neighbor",
    difference: "This case forms one sibling SCC; the nested case adds recursively discovered child cohorts.",
  }],
});

const recursiveNestingCase = jitCharacterizationCase({
  id: "local.recursive-nesting",
  family: "local-element",
  tags: ["local-element", "nested", "recursive-compile", "scope"],
  requirement: "Nested local declarations are discovered only when their owning generated local Type re-enters compilation.",
  provenance: [
    compilerAuthority(localElementsSuite, 541, 575, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "works with nested templates - 2",
      summary: "Two top-level local scopes recursively discover and render their own nested declarations.",
    }),
    compilerAuthority(renderingSource, 92, 109, "runtime-consequence", {
      symbolName: "Rendering.compile",
      summary: "Generated local definitions start uncompiled and re-enter the ordinary compiler on demand.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.local-element.discovery", "primary", "Root discovery stops at local template-content boundaries."),
    compilerObligation("compiler.local-element.definition", "primary", "Each nested declaration becomes a scoped generated Type."),
    compilerObligation("compiler.local-element.cohort-dependencies", "interaction", "Nested cohorts accumulate their owner dependency prefix."),
  ],
  world: localElementWorld(
    "aot-local-recursive-nesting",
    '<outer-local></outer-local><peer-local></peer-local>'
      + '<template as-custom-element="outer-local">'
      + '<template as-custom-element="inner-local">'
      + '<template as-custom-element="leaf-local">leaf</template><leaf-local></leaf-local>'
      + '</template><inner-local></inner-local>'
      + '</template>'
      + '<template as-custom-element="peer-local">peer</template>',
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-local-recursive-nesting", 2),
    definitionDependencies("local-recursive.dependencies", 2),
    templateHtml(
      "local-recursive.template",
      "<template><!--au--><outer-local></outer-local><!--au--><peer-local></peer-local></template>",
    ),
  ],
  contrasts: [{
    caseId: "local.peer-owner-closure",
    relation: "nearest-neighbor",
    difference: "Both have top-level peers; this case proves that nested declarations remain behind recursive compilation boundaries.",
  }],
});

const useSiteControllerChainCase = jitCharacterizationCase({
  id: "local.use-site-controller-chain",
  family: "local-element",
  tags: ["local-element", "repeat", "if", "template-controller", "dependencies"],
  requirement: "A local use under repeat and if retains controller nesting while its body resolves an owner dependency.",
  provenance: [
    compilerAuthority(localElementsSuite, 637, 665, "behavior", {
      suiteName: "3-runtime-html/template-compiler.local-templates.spec.ts",
      testName: "works with non-global dependencies - nested-template-controllers - [repeat.for]>[if]",
      summary: "The framework runtime renders only even iterations and resolves the non-global dependency in the local body.",
    }),
    compilerAuthority(templateCompilerSource, 136, 145, "implementation", {
      symbolName: "TemplateCompiler.compile",
      summary: "Local extraction precedes ordinary template-controller traversal and definition generation.",
    }),
  ],
  obligations: [
    compilerObligation("compiler.local-element.extraction", "primary", "The declaration never enters the use-site controller chain."),
    compilerObligation("compiler.local-element.owner-dependency", "interaction", "The local body retains its non-global owner dependency."),
    compilerObligation("compiler.template-controller.same-element", "interaction", "Repeat and if create distinct nested definitions around the local use."),
  ],
  world: localElementWorld(
    "aot-local-controller-chain",
    '<local-row repeat.for="prop of 5" if.bind="prop % 2 === 0" prop.bind></local-row>'
      + '<template as-custom-element="local-row">'
      + '<bindable name="prop"></bindable>${prop}<owned-dep></owned-dep>'
      + '</template>',
    customElementDependency("controller-owned-dependency", "owned-dep", "owned"),
  ),
  invariants: [
    ...compiledDefinitionEnvelope("aot-local-controller-chain", 1),
    definitionDependencies("local-controller.dependencies", 2),
    templateHtml("local-controller.template", "<template><!--au--><!--au-start--><!--au-end--></template>"),
    instructionPath(
      "local-controller.inner-if",
      "Repeat owns an inner if definition around the local-element use.",
      0,
      ["def", "instructions", 0, 0, "res"],
      "if",
    ),
    instructionPath(
      "local-controller.local-leaf",
      "The innermost controller definition hydrates the generated local resource.",
      0,
      ["def", "instructions", 0, 0, "def", "instructions", 0, 0, "res"],
      "local-row",
    ),
  ],
  contrasts: [{
    caseId: "local.hoisted-bindables",
    relation: "interaction-control",
    difference: "Both resolve a generated local Type; this case adds a same-node controller chain and an owner dependency.",
  }],
});

/** Broad positive local-element pressure; recursive Type closure is observed by a dedicated cycle-safe oracle. */
export const JIT_ORACLE_LOCAL_ELEMENT_CASES: readonly CompilerCase[] = [
  hoistedBindablesCase,
  peerOwnerClosureCase,
  recursiveNestingCase,
  useSiteControllerChainCase,
];

function localElementWorld(
  name: string,
  markup: string,
  dependency: { readonly setup: CompilerSetupInvocation; readonly registration: CompilerRegistration } | null = null,
): CompilerWorld {
  return {
    configuration: "standard",
    entry: {
      kind: "compile",
      entryType: { kind: "entry-custom-element-type" },
      definition: {
        name,
        type: "custom-element",
        template: { kind: "markup", value: markup },
      },
    },
    compiler: { debug: false, resolveResources: false },
    setups: dependency == null ? [] : [dependency.setup],
    registrations: dependency == null ? [] : [dependency.registration],
  };
}

function customElementDependency(
  symbol: string,
  name: string,
  template: string,
): { readonly setup: CompilerSetupInvocation; readonly registration: CompilerRegistration } {
  return {
    setup: {
      symbol,
      factory: CUSTOM_ELEMENT_SETUP_ID,
      args: {
        name,
        template,
        bindables: [],
        capture: false,
        containerless: false,
        shadowMode: null,
      },
    },
    registration: {
      site: "definition-dependency",
      value: { setup: symbol, export: "resource" },
      cardinality: "single",
    },
  };
}

function definitionDependencies(id: string, expected: number): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The owner retains source dependencies followed by its local-Type cohort.", {
    kind: "definition-dependencies-count",
  }, expected);
}

function templateHtml(id: string, expected: string): CompilerFocusedInvariant {
  return equalJitInvariant(id, "Local declarations are absent from the exact owner compiler output.", {
    kind: "template-outer-html",
  }, expected);
}

function instructionResource(id: string, row: number, expected: string): CompilerFocusedInvariant {
  return equalJitInvariant(id, "The local use resolves by its canonical resource name.", instructionFieldSelector(
    row,
    0,
    "res",
  ), expected);
}

function instructionPath(
  id: string,
  description: string,
  row: number,
  path: readonly (string | number)[],
  expected: CompilerCaseData,
): CompilerFocusedInvariant {
  return equalJitInvariant(id, description, {
    kind: "instruction-path",
    row,
    instruction: 0,
    path,
  }, expected);
}
