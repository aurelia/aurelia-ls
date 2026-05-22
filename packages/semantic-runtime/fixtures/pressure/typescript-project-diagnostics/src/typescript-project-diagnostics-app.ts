import { customElement } from '@aurelia/runtime-html';
import { ProjectDiagnosticState } from './typescript-project-diagnostics-state';
import template from './typescript-project-diagnostics-app.html';

@customElement({
  name: 'typescript-project-diagnostics-app',
  template,
})
export class TypeScriptProjectDiagnosticsApp {
  readonly title = 'TypeScript project diagnostics';
  readonly state = new ProjectDiagnosticState();
}
