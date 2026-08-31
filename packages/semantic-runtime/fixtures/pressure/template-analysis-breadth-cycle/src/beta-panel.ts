import { bindable, customElement } from '@aurelia/runtime-html';
import { AlphaPanel } from './alpha-panel';

@customElement({
  name: 'beta-panel',
  template: `
    <p>Beta: \${value}</p>
    <alpha-panel value.bind="value"></alpha-panel>
  `,
  dependencies: [AlphaPanel],
})
export class BetaPanel {
  @bindable value: string | number = 0;
}
