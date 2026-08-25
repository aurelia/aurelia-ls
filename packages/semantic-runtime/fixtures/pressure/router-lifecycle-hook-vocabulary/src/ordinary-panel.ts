import { customElement } from '@aurelia/runtime-html';
import template from './ordinary-panel.html';

interface IRouteViewModel {
  loading(): void;
  loaded(): void;
}

@customElement({
  name: 'ordinary-panel',
  template,
})
export class OrdinaryPanel implements IRouteViewModel {
  public readonly binding = 'business-state';

  public loading(): void {}

  public loaded(): void {}

  public hydrating(): void {}

  public attached(): void {}

  public detached(): void {}

  public unbound(): void {}

  public activated(): void {}
}
