import assert from "node:assert/strict";
import {
  BindingMode,
  itListenerBinding,
  itPropertyBinding,
  itTextBinding,
  type ICompiledElementComponentDefinition,
  type Instruction,
} from "@aurelia/template-compiler";
import type { BatchCase } from "./batch-runner.js";
import type { JitCompilerOracle } from "./jit-compiler-oracle.js";

/** Initial behavior-grounded cases for exercising the scalable JIT oracle runner. */
export const JIT_ORACLE_CASES: readonly BatchCase<JitCompilerOracle>[] = [
  {
    id: "jit.listener-binding",
    family: "listener-binding",
    tags: ["smoke", "binding", "listener"],
    requirement: "A trigger command lowers to one listener-binding instruction.",
    run(oracle) {
      const execution = oracle.compile({
        definition: {
          name: "aot-listener-binding",
          type: "custom-element",
          template: '<template><button click.trigger="submit()">Save</button></template>',
        },
      });
      assertCompiled(execution.compiled, "aot-listener-binding");
      assert.equal(execution.compiled.template?.outerHTML, '<template><!--au--><button>Save</button></template>');
      const instruction = firstInstruction(execution.compiled, itListenerBinding);
      assert.equal(instruction.to, "click");
      assert.equal(instruction.capture, false);
      assert.equal(instruction.modifier, null);
      assert.deepEqual(instruction.from, {
        $kind: "CallScope",
        name: "submit",
        args: [],
        ancestor: 0,
        optional: false,
      });
      return execution;
    },
  },
  {
    id: "jit.property-binding",
    family: "property-binding",
    tags: ["smoke", "binding", "property-binding"],
    requirement: "A .bind command lowers to one property-binding instruction.",
    run(oracle) {
      const execution = oracle.compile({
        definition: {
          name: "aot-property-binding",
          type: "custom-element",
          template: '<template><input value.bind="message"></template>',
        },
      });
      assertCompiled(execution.compiled, "aot-property-binding");
      assert.equal(execution.compiled.template?.outerHTML, "<template><!--au--><input></template>");
      const instruction = firstInstruction(execution.compiled, itPropertyBinding);
      assert.equal(instruction.to, "value");
      assert.equal(instruction.mode, BindingMode.twoWay);
      assert.deepEqual(instruction.from, { $kind: "AccessScope", name: "message", ancestor: 0 });
      return execution;
    },
  },
  {
    id: "jit.static-attribute",
    family: "static-markup",
    tags: ["smoke", "static"],
    requirement: "Static platform markup compiles without a runtime instruction row.",
    run(oracle) {
      const execution = oracle.compile({
        definition: {
          name: "aot-static-attribute",
          type: "custom-element",
          template: '<template><div title="hello"></div></template>',
        },
      });
      assertCompiled(execution.compiled, "aot-static-attribute");
      assert.equal(execution.compiled.instructions.length, 0);
      assert.equal(
        execution.compiled.template?.outerHTML,
        '<template><div title="hello"></div></template>',
      );
      return execution;
    },
  },
  {
    id: "jit.text-interpolation",
    family: "interpolation",
    tags: ["smoke", "binding", "interpolation"],
    requirement: "Text interpolation lowers to one text-binding instruction.",
    run(oracle) {
      const execution = oracle.compile({
        definition: {
          name: "aot-text-interpolation",
          type: "custom-element",
          template: "<template><div>${message}</div></template>",
        },
      });
      assertCompiled(execution.compiled, "aot-text-interpolation");
      assert.equal(execution.compiled.template?.outerHTML, "<template><div><!--au--> </div></template>");
      const instruction = firstInstruction(execution.compiled, itTextBinding);
      assert.deepEqual(instruction.from, { $kind: "AccessScope", name: "message", ancestor: 0 });
      return execution;
    },
  },
];

function assertCompiled(compiled: ICompiledElementComponentDefinition, name: string): void {
  assert.equal(compiled.name, name);
  assert.equal(compiled.type, "custom-element");
  assert.equal(compiled.needsCompile, false);
  assert.equal(compiled.template?.nodeName, "TEMPLATE");
  assert.deepEqual(compiled.surrogates, []);
}

function firstInstruction<TType extends Instruction["type"]>(
  compiled: ICompiledElementComponentDefinition,
  type: TType,
): Extract<Instruction, { readonly type: TType }> {
  assert.equal(compiled.instructions.length, 1);
  const row = compiled.instructions[0];
  assert.equal(row?.length, 1);
  const instruction = row?.[0];
  assert.ok(instruction != null);
  assert.equal(instruction.type, type);
  return instruction as Extract<Instruction, { readonly type: TType }>;
}
