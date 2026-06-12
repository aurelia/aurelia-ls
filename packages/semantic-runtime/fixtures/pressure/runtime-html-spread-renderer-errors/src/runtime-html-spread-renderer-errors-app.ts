import { bindable, customElement } from '@aurelia/runtime-html';

export class RuntimeHtmlSpreadRendererErrorsApp {
  cardBindings = { title: 'Valid bindable spread' };
  elementBindings = { title: 'Invalid element spread' };
}

@customElement({
  name: 'spread-target-card',
  template: '<template>${title}</template>',
})
export class SpreadTargetCard {
  @bindable title = '';
}
