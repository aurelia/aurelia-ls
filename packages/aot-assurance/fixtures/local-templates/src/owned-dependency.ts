import { customElement } from 'aurelia';

@customElement({
  name: 'owned-dependency',
  template: '<small class="owned-dependency">owned</small>',
})
export class OwnedDependency {}
