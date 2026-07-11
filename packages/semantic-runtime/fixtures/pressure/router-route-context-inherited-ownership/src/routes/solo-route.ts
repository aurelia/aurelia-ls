import { customElement } from '@aurelia/runtime-html';
import { SingleRouteParameters } from '../route-parameters/single-route-parameters';

@customElement({
  name: 'solo-route',
  template: '<template>Solo</template>',
})
export class SoloRoute extends SingleRouteParameters {}
