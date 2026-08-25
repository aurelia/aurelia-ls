import { customElement } from '@aurelia/runtime-html';
import { SharedRouteParameters } from '../route-parameters/shared-route-parameters';

@customElement({
  name: 'account-route',
  template: '<template>Account</template>',
})
export class AccountRoute extends SharedRouteParameters {}
