import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { IRouteContext } from '@aurelia/router';

@customElement({
  name: 'first-shared-route',
  template: '<template>${firstId}</template>',
})
export class SharedRoute {
  private readonly params = resolve(IRouteContext).getRouteParameters<{ firstId: string }>();

  get firstId(): string {
    return this.params.firstId;
  }
}
