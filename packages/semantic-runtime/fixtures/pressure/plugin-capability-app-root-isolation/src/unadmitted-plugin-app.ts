import { customElement } from '@aurelia/runtime-html';
import template from './unadmitted-plugin-app.html';

export class UnadmittedEntry {
  constructor(readonly label: string) {}
}

@customElement({
  name: 'unadmitted-plugin-app',
  template,
})
export class UnadmittedPluginApp {
  readonly titleKey = 'dashboard.title';
  readonly entries: readonly UnadmittedEntry[] = [
    new UnadmittedEntry('Only'),
  ];
  readonly errors: readonly unknown[] = [];
  displayName = 'Grace';
  ready = false;
}
