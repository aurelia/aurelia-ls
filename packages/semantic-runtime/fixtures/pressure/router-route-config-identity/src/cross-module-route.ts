import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'cross-module-route',
  template: '<template>Cross-module route</template>',
})
export class CrossModuleRoute {
  static path = 'cross-module-static';
  static title = 'Cross-module static title';
}
