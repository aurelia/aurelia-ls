import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';

@customElement({
  name: 'spread-shorthand-card',
  template: '<template></template>',
  bindables: ['item'],
})
class SpreadShorthandCard {}

@customElement({
  name: 'spread-shorthand-app',
  template: '<template><spread-shorthand-card ...item></spread-shorthand-card></template>',
  dependencies: [SpreadShorthandCard],
})
class SpreadShorthandApp {}

void new Aurelia()
  .register(StandardConfiguration, SpreadShorthandApp)
  .app({ host: globalThis.document.body, component: SpreadShorthandApp })
  .start();
