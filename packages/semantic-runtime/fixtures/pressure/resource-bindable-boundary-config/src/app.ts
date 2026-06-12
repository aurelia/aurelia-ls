import {
  BindingMode,
  bindable,
  customElement,
} from 'aurelia';
import template from './app.html';

@customElement({
  name: 'boundary-card',
  template: '<span>${label}: ${enabled}</span>',
})
export class BoundaryCard {
  @bindable({ ...import.meta.env, mode: BindingMode.twoWay })
  enabled = false;

  @bindable({ ...import.meta.env })
  label = '';
}

@bindable({ ...import.meta.env, name: 'externalValue' })
@customElement({
  name: 'boundary-panel',
  template: '<boundary-card enabled.two-way="enabled" label.bind="label"></boundary-card>',
  dependencies: [BoundaryCard],
})
export class BoundaryPanel {
  externalValue = '';
  enabled = false;
  label = 'Boundary';
}

@customElement({
  name: 'app-root',
  template,
  dependencies: [BoundaryPanel],
})
export class App {}
