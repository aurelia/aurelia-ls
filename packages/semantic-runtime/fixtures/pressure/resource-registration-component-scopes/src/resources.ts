import { customElement } from 'aurelia';

@customElement({ name: 'scope-card', template: '<template>global</template>' })
export class GlobalScopeCard {}

@customElement({ name: 'scope-card', template: '<template>owner a</template>' })
export class OwnerAScopeCard {}

@customElement({ name: 'a-only', template: '<template>a only</template>' })
export class AOnly {}

@customElement({ name: 'b-only', template: '<template>b only</template>' })
export class BOnly {}

@customElement({ name: 'deep-only', template: '<template>deep only</template>' })
export class DeepOnly {}
