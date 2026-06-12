import { alias, customElement } from '@aurelia/runtime-html';

@alias('routeable-alias')
@customElement({
  name: 'aliased-route',
  template: '<template>Aliased route</template>',
})
export class AliasedRoute {}
