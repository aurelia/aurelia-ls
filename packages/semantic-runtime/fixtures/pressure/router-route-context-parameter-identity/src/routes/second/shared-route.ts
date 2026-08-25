import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { IRouteContext } from '@aurelia/router';

@customElement({
  name: 'second-shared-route',
  template: '<template>${secondId}</template>',
})
export class SharedRoute {
  private readonly params = resolve(IRouteContext).getRouteParameters<{ secondId: string }>();

  get secondId(): string {
    return this.params.secondId;
  }
}
