import { customElement } from '@aurelia/runtime-html';

@customElement({
  name: 'duplicate-entry',
  template: '<template>first duplicate-entry registration</template>',
})
export class DuplicateResourceOne {}

@customElement({
  name: 'duplicate-entry',
  template: '<template>second duplicate-entry registration</template>',
})
export class DuplicateResourceTwo {}

@customElement({
  name: 'di-resource-duplicate-app',
  template: '<template><duplicate-entry></duplicate-entry></template>',
})
export class DiResourceDuplicateApp {}
