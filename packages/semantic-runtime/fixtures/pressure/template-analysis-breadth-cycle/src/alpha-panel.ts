import { bindable, customElement } from '@aurelia/runtime-html';
import { BetaPanel } from './beta-panel';

@customElement({
  name: 'alpha-panel',
  template: `
    <p>Alpha: \${value}</p>
    <beta-panel value.bind="value"></beta-panel>
  `,
  dependencies: [BetaPanel],
})
export class AlphaPanel {
  @bindable value: string | number = '';
}
