import { bindable, customElement } from '@aurelia/runtime-html';
import template from './runtime-html-spread-renderer-errors-app.html';

@customElement({ name: 'runtime-html-spread-renderer-errors-app', template })
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
