/** Virtual module id used by carrier transforms and bundler adapters. */
export const AOT_COMPILER_PATCH_RUNTIME_MODULE_ID = 'virtual:aurelia-aot/runtime';

/**
 * Browser-runtime source kept separate from the Node-side AOT compiler graph.
 * The carrier transform invokes this only after Aurelia has defined the resource and before its first render compile.
 */
export const AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE = `
import { CustomElement } from '@aurelia/runtime-html';

export function applyCompiledCustomElement(Type, patch) {
  const definition = CustomElement.getDefinition(Type);
  definition.template = patch.template;
  definition.instructions = patch.instructions;
  definition.surrogates = patch.surrogates;
  definition.hasSlots = patch.hasSlots;
  definition.needsCompile = false;
  definition.dependencies.push(...patch.compilerAddedDependencies);
  return Type;
}
`.trimStart();
