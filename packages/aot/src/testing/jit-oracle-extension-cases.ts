import {
  BindingMode,
  itHydrateElement,
  itPropertyBinding,
} from "@aurelia/template-compiler";
import {
  compilerAuthority,
  compiledDefinitionEnvelope,
  compilerObligation,
  equalJitInvariant,
  instructionFieldSelector,
  jitCharacterizationCase,
  type JitCharacterizationCaseInput,
} from "./compiler-case-builders.js";
import {
  BASELINE_CHARACTERIZATION_CLOSURE,
  type CompilerCase,
  type CompilerEffectPosture,
} from "./compiler-case.js";
import {
  PROCESS_CONTENT_ELEMENT_SETUP_ID,
  TEMPLATE_COMPILER_HOOK_SETUP_ID,
} from "./jit-oracle-extension-setups.js";

const templateCompilerSource = "packages/template-compiler/src/template-compiler.ts";
const hooksSuite = "packages/__tests__/src/3-runtime-html/template-compiler.hooks.spec.ts";
const processContentSuite = "packages/__tests__/src/3-runtime-html/process-content.spec.ts";
const auSlotSource = "packages/runtime-html/src/resources/custom-elements/au-slot.ts";

const childHookRef = { setup: "child-hook", export: "registration" } as const;
const rootHookRef = { setup: "root-hook", export: "registration" } as const;
const processContentResourceRef = { setup: "process-content-element", export: "resource" } as const;

/** Isolated JIT cases which deliberately execute arbitrary compiler extension code. */
export const JIT_ORACLE_EXTENSION_CASES: readonly CompilerCase[] = [
  extensionCase({
    id: "extension.hooks.child-before-root",
    family: "compiler-extension",
    tags: ["extension", "hook", "dangerous", "ordering"],
    requirement: "A compilation-local compiler hook mutates the template before the root hook observes and extends it.",
    provenance: [
      compilerAuthority(templateCompilerSource, 126, 134, "implementation", {
        symbolName: "TemplateCompiler.compile",
        summary: "The compiler resolves all hooks from the active compilation container and invokes them before traversal.",
      }),
      compilerAuthority(hooksSuite, 223, 258, "behavior", {
        suiteName: "3-runtime-html/template-compiler.hooks.spec.ts",
        testName: "calls hooks in child before root",
        summary: "The framework test proves a child-container hook mutates the template before a root hook observes it.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.extension.hooks", "primary", "Hook scope and child-before-root order are executed."),
      compilerObligation("compiler.entry.context", "interaction", "The compilation child and root resource scopes remain distinct."),
      compilerObligation("compiler.attribute.stable-order", "interaction", "Hook-authored bindings lower in mutation order."),
      compilerObligation("compiler.instruction.property-binding", "interaction", "Both hook mutations become complete property bindings."),
    ],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "extension-hook-order",
          type: "custom-element",
          template: { kind: "markup", value: "<template><input></template>" },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [
        {
          symbol: "child-hook",
          factory: TEMPLATE_COMPILER_HOOK_SETUP_ID,
          args: {
            role: "child",
            attribute: "data-child.bind",
            expression: "childValue",
            requiresAttribute: null,
            requiresValue: null,
          },
        },
        {
          symbol: "root-hook",
          factory: TEMPLATE_COMPILER_HOOK_SETUP_ID,
          args: {
            role: "root",
            attribute: "data-root.bind",
            expression: "rootValue",
            requiresAttribute: "data-child.bind",
            requiresValue: "childValue",
          },
        },
      ],
      registrations: [
        { site: "compilation-local", value: childHookRef, cardinality: "single" },
        { site: "root-after-standard-configuration", value: rootHookRef, cardinality: "single" },
      ],
    },
    invariants: [
      ...compiledDefinitionEnvelope("extension-hook-order", 1),
      equalJitInvariant("hooks.template", "Both hook-authored binding attributes are consumed from one marked input.", {
        kind: "template-outer-html",
      }, "<template><!--au--><input></template>"),
      equalJitInvariant("hooks.row-width", "The input owns the two hook-authored instructions.", {
        kind: "instruction-row-width",
        row: 0,
      }, 2),
      equalJitInvariant("hooks.child.type", "The child hook emits a property binding first.", instructionFieldSelector(0, 0, "type"), itPropertyBinding),
      equalJitInvariant("hooks.child.to", "The child mutation retains its data-child target.", instructionFieldSelector(0, 0, "to"), "data-child"),
      equalJitInvariant("hooks.child.mode", "The child binding uses the ordinary to-view default.", instructionFieldSelector(0, 0, "mode"), BindingMode.toView),
      equalJitInvariant("hooks.child.from", "The child expression is parsed after hook execution.", instructionFieldSelector(0, 0, "from"), {
        $kind: "AccessScope",
        name: "childValue",
        ancestor: 0,
      }),
      equalJitInvariant("hooks.root.type", "The root hook emits a property binding second.", instructionFieldSelector(0, 1, "type"), itPropertyBinding),
      equalJitInvariant("hooks.root.to", "The root mutation retains its data-root target.", instructionFieldSelector(0, 1, "to"), "data-root"),
      equalJitInvariant("hooks.root.mode", "The root binding uses the ordinary to-view default.", instructionFieldSelector(0, 1, "mode"), BindingMode.toView),
      equalJitInvariant("hooks.root.from", "The root expression is parsed after observing the child mutation.", instructionFieldSelector(0, 1, "from"), {
        $kind: "AccessScope",
        name: "rootValue",
        ancestor: 0,
      }),
    ],
    contrasts: [],
  }, [
    {
      id: "effect.template-compiler-hook.child",
      kind: "template-compiler-hook",
      introducedBy: childHookRef,
      oracle: "executed-by-framework",
      conservation: "open",
      affectedProducts: ["compiler-input-template", "compiled-template", "compiled-definition.instructions"],
      summary: "The compilation-local hook executes arbitrary DOM mutation before root hooks and lowering.",
    },
    {
      id: "effect.template-compiler-hook.root",
      kind: "template-compiler-hook",
      introducedBy: rootHookRef,
      oracle: "executed-by-framework",
      conservation: "open",
      affectedProducts: ["compiler-input-template", "compiled-template", "compiled-definition.instructions"],
      summary: "The root hook observes child mutation and executes another arbitrary DOM mutation.",
    },
  ]),
  extensionCase({
    id: "extension.process-content.host-binding-skip-children",
    family: "compiler-extension",
    tags: ["extension", "process-content", "dangerous", "metadata"],
    requirement: "processContent mutates host binding syntax and instruction data while false preserves uncompiled children.",
    provenance: [
      compilerAuthority(templateCompilerSource, 498, 535, "implementation", {
        symbolName: "TemplateCompiler._compileElement",
        summary: "processContent runs before attribute classification and its metadata becomes HydrateElementInstruction.data.",
      }),
      compilerAuthority(templateCompilerSource, 647, 677, "implementation", {
        symbolName: "TemplateCompiler._compileElement",
        summary: "A false result suppresses projection extraction and child compilation without suppressing host lowering.",
      }),
      compilerAuthority(processContentSuite, 395, 439, "behavior", {
        suiteName: "3-runtime-html/process-content.spec.ts",
        testName: "host compilation cannot be skipped",
        summary: "The corpus proves processContent-authored host binding syntax still lowers when the hook returns false.",
      }),
      compilerAuthority(processContentSuite, 459, 480, "behavior", {
        suiteName: "3-runtime-html/process-content.spec.ts",
        testName: "compilation can be instructed to be skipped - children - with additional host binding",
        summary: "The corpus combines host mutation with a false child-compilation gate.",
      }),
      compilerAuthority(auSlotSource, 20, 35, "runtime-consequence", {
        symbolName: "AuSlot.processContent",
        summary: "A built-in runtime resource demonstrates that processContent instruction data is behaviorally consumed.",
      }),
    ],
    obligations: [
      compilerObligation("compiler.extension.process-content", "primary", "DOM mutation, false return, and metadata are executed together."),
      compilerObligation("compiler.element.content-gate", "primary", "A false return suppresses only child and projection compilation."),
      compilerObligation("compiler.element.metadata", "primary", "Canonical processContent metadata remains on the element instruction."),
      compilerObligation("compiler.element.hydration", "interaction", "The custom element still emits its complete hydration instruction."),
      compilerObligation("compiler.instruction.property-binding", "interaction", "The hook-authored host binding lowers into the element props."),
      compilerObligation("compiler.tree.marker.element-target", "interaction", "The custom element host remains a marked hydration target."),
    ],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "extension-process-content",
          type: "custom-element",
          template: {
            kind: "markup",
            value: "<template><extension-content normal=foo><span value.bind=childValue>child</span></extension-content></template>",
          },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [{
        symbol: "process-content-element",
        factory: PROCESS_CONTENT_ELEMENT_SETUP_ID,
        args: {
          name: "extension-content",
          bindable: "textLength",
          sourceAttribute: "normal",
          bindingAttribute: "text-length.bind",
          bindingExpression: "hostValue",
          dataKey: "extension",
        },
      }],
      registrations: [{
        site: "definition-dependency",
        value: processContentResourceRef,
        cardinality: "single",
      }],
    },
    invariants: [
      ...compiledDefinitionEnvelope("extension-process-content", 1),
      equalJitInvariant("process.template", "The host binding is consumed while the skipped child syntax stays authored.", {
        kind: "template-outer-html",
      }, '<template><!--au--><extension-content><span value.bind="childValue">child</span></extension-content></template>'),
      equalJitInvariant("process.row-width", "The marked host owns one element hydration instruction.", {
        kind: "instruction-row-width",
        row: 0,
      }, 1),
      equalJitInvariant("process.type", "The host remains a custom-element hydration target.", instructionFieldSelector(0, 0, "type"), itHydrateElement),
      equalJitInvariant("process.resource", "Resource representation remains name-valued in this compiler world.", instructionFieldSelector(0, 0, "res"), "extension-content"),
      equalJitInvariant("process.projections", "Returning false suppresses projection extraction.", instructionFieldSelector(0, 0, "projections"), null),
      equalJitInvariant("process.props.count", "The processContent-authored host binding becomes one element prop.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["props", "length"],
      }, 1),
      equalJitInvariant("process.props.type", "The host prop is a property binding.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["props", 0, "type"],
      }, itPropertyBinding),
      equalJitInvariant("process.props.to", "The host prop targets the declared textLength bindable.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["props", 0, "to"],
      }, "textLength"),
      equalJitInvariant("process.props.mode", "The host prop uses the bindable's to-view default.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["props", 0, "mode"],
      }, BindingMode.toView),
      equalJitInvariant("process.props.from", "The host expression is parsed after processContent mutation.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["props", 0, "from"],
      }, {
        $kind: "AccessScope",
        name: "hostValue",
        ancestor: 0,
      }),
      equalJitInvariant("process.data", "Canonical hook metadata is retained on the hydration instruction.", {
        kind: "instruction-path",
        row: 0,
        instruction: 0,
        path: ["data", "extension"],
      }, {
        kind: "process-content",
        source: "foo",
        childCompilation: "skipped",
      }),
    ],
    contrasts: [],
  }, [{
    id: "effect.process-content.host-mutation-skip-children",
    kind: "process-content",
    introducedBy: processContentResourceRef,
    oracle: "executed-by-framework",
    conservation: "open",
    affectedProducts: [
      "compiled-template",
      "compiled-definition.instructions",
      "compiled-definition.instruction-data",
      "child-compilation",
    ],
    summary: "The custom element executes arbitrary host mutation, metadata production, and child-compilation control.",
  }]),
];

function extensionCase(
  input: JitCharacterizationCaseInput,
  effects: readonly CompilerEffectPosture[],
): CompilerCase {
  const base = jitCharacterizationCase(input);
  const blockers = effects.map((effect) => effect.id);
  return {
    ...base,
    effects,
    closure: [
      ...BASELINE_CHARACTERIZATION_CLOSURE.map((claim) => claim.dimension === "compiler-extensions"
        ? {
            dimension: "compiler-extensions" as const,
            state: "open" as const,
            reason: "The JIT executes declared extension code, but no shared static emulation or hermetic build policy is closed.",
            blockerEffectIds: blockers,
          }
        : claim),
      {
        dimension: "extern-execution",
        state: "open",
        reason: "The setup is source-reviewed but arbitrary extension execution is not yet admitted as hermetic build input.",
        blockerEffectIds: blockers,
      },
    ],
  };
}
