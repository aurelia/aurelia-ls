import { customElement } from '@aurelia/runtime-html';
import { AlphaPanel } from './alpha-panel';
import { BetaPanel } from './beta-panel';

@customElement({
  name: 'template-analysis-breadth-cycle-app',
  template: `
    <alpha-panel value.bind="textValue"></alpha-panel>
    <beta-panel value.bind="numericValue"></beta-panel>
  `,
  dependencies: [AlphaPanel, BetaPanel],
})
export class TemplateAnalysisBreadthCycleApp {
  readonly textValue = 'root-text';
  readonly numericValue = 7;
}
