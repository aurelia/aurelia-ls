import { TemplateCompilerHooks } from 'aurelia';

export const PassiveCompilerHook = TemplateCompilerHooks.define(class {
  // A compiling hook does not use its return value to decide child compilation.
  compiling(): boolean { return false; }
});
