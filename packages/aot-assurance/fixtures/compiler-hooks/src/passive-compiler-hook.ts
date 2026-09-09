import { TemplateCompilerHooks } from 'aurelia';

export const PassiveCompilerHook = TemplateCompilerHooks.define(class {
  // Unlike processContent, the compiling hook's return value does not decide child compilation.
  compiling(): boolean { return false; }
});
