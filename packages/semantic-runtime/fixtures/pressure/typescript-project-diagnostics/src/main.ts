import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TypeScriptProjectDiagnosticsApp } from './typescript-project-diagnostics-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: TypeScriptProjectDiagnosticsApp,
  })
  .start();
