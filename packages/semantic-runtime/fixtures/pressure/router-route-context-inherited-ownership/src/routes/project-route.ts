import { customElement } from '@aurelia/runtime-html';
import { SharedRouteParameters } from '../route-parameters/shared-route-parameters';

@customElement({
  name: 'project-route',
  template: '<template>Project</template>',
})
export class ProjectRoute extends SharedRouteParameters {}
