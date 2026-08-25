import type { CompilerCase, CompilerWorld } from "./compiler-case.js";
import {
  compilerAuthority,
  compilerObligation,
  equalJitInvariant,
  includesJitInvariant,
  jitCharacterizationCase,
} from "./compiler-case-builders.js";
import { CUSTOM_ATTRIBUTE_SETUP_ID } from "./jit-oracle-setups.js";

const directCompilerSuite = "packages/__tests__/src/3-runtime-html/template-compiler.spec.ts";
const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const compilerErrorsSource = "packages/template-compiler/src/errors.ts";

/** Public compiler entry points outside ordinary template compilation. */
export const JIT_ORACLE_OPERATION_CASES: readonly CompilerCase[] = [
  jitCharacterizationCase({
    id: "operation.compile-spread.reject-template-controller",
    family: "compile-spread",
    tags: ["operation", "spread", "template-controller", "diagnostic"],
    requirement: "compileSpread rejects a captured template controller with the observed framework error identity.",
    provenance: [
      compilerAuthority(templateCompilerSource, 171, 257, "implementation", {
        symbolName: "TemplateCompiler.compileSpread",
        summary: "The public spread entry builds a dedicated context and rejects template-controller resources.",
      }),
      compilerAuthority(directCompilerSuite, 812, 828, "behavior", {
        suiteName: "3-runtime-html/template-compiler.spec.ts",
        testName: "throws when spreading a template controller",
        summary: "The sole direct compileSpread test supplies one template controller and asserts rejection.",
      }),
      compilerAuthority(compilerErrorsSource, 27, 82, "implementation", {
        symbolName: "ErrorNames",
        summary: "The public AUR0718 entry and observed internal AUR9998 entry conflict for this operation.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.spread.context", "primary", "compileSpread constructs an isolated compiler context."),
      compilerObligation("compiler.spread.custom-attribute", "boundary", "Attribute lookup identifies the template-controller resource."),
      compilerObligation(
        "compiler.diagnostic.template-controller-spread",
        "primary",
        "The observed JIT error remains explicit while AUR0718/AUR9998 authority is unresolved.",
      ),
    ],
    world: compileSpreadWorld(),
    expectedProduct: "compiler-error",
    invariants: [
      equalJitInvariant("error.code", "The pinned JIT currently throws its internal spread-controller code.", {
        kind: "compiler-error-code",
      }, "AUR9998"),
      includesJitInvariant("error.resource", "The rejection identifies the bar template controller.", {
        kind: "compiler-error-message",
      }, "bar"),
    ],
    contrasts: [],
  }),
];

function compileSpreadWorld(): CompilerWorld {
  return {
    configuration: "standard",
    entry: {
      kind: "compile-spread",
      requestor: {
        name: "spread-requestor",
        type: "custom-element",
        template: { kind: "markup", value: "<template></template>" },
      },
      attributes: [{
        command: null,
        target: "bar",
        rawValue: "",
        parts: [],
        rawName: "bar",
      }],
      target: { kind: "element", tagName: "div" },
    },
    compiler: { debug: false, resolveResources: false },
    setups: [{
      symbol: "bar-controller",
      factory: CUSTOM_ATTRIBUTE_SETUP_ID,
      args: {
        name: "bar",
        isTemplateController: true,
      },
    }],
    registrations: [{
      site: "compilation-local",
      value: { setup: "bar-controller", export: "resource" },
      cardinality: "single",
    }],
  };
}
