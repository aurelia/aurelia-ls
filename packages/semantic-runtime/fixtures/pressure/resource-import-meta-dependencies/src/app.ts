import { customElement } from 'aurelia';
import template from './app.html';

@customElement({
  name: 'feature-panel',
  template: '<span>${label}</span>',
})
export class FeaturePanel {
  label = import.meta.env.MODE;
}

@customElement({
  name: 'debug-panel',
  template: '<span>Debug</span>',
})
export class DebugPanel {}

@customElement({
  name: 'app-root',
  template,
  dependencies: [
    FeaturePanel,
    ...(import.meta.env.DEV ? [DebugPanel] : []),
  ],
})
export class App {}
