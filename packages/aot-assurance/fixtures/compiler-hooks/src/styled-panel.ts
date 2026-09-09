import { cssModules, customElement } from 'aurelia';
import template from './styled-panel.html';

@customElement({
  name: 'css-child', bindables: ['value'],
  template: '<p class="global local" data-css="child">child:${value}</p>',
})
export class CssChild { value = ''; }

@customElement({
  name: 'styled-panel', template, bindables: ['value', 'active', 'items'],
  dependencies: [CssChild, cssModules({
    local: 'panel-local', step: 'localDone', active: 'panel-active', other: 'panel-other', 'hover:bg': 'panel-hover',
  }), cssModules({ localDone: 'panel-after-local' })],
})
export class StyledPanel {
  value = '';
  active = true;
  items: string[] = [];
}
