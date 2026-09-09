/* global document, window */
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { CompilerHooksApp } from './compiler-hooks-app.js';
import { PassiveCompilerHook } from './passive-compiler-hook.js';

const aurelia = new Aurelia()
  .register(StandardConfiguration, PassiveCompilerHook)
  .app({ host: document.querySelector('compiler-hooks-app')!, component: CompilerHooksApp });
await aurelia.start();
window.__compilerHooksAssurance = {
  ready: true,
  async stop() { await aurelia.stop(true); aurelia.dispose(); },
};
