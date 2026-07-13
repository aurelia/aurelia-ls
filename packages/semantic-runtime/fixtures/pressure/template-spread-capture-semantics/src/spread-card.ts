import {
  bindable,
  customElement,
  valueConverter,
} from '@aurelia/runtime-html';

export interface SpreadCardState {
  title: string;
  count: number;
  tone: string;
  internal: string;
}

@customElement({
  name: 'spread-card',
  template: '<template>${title}:${count}:${tone}:${internal}</template>',
})
export class SpreadCard {
  @bindable title = '';
  @bindable count = 0;
  @bindable({ attribute: 'accent-tone' }) tone = '';
  internal = 'internal';
}

@valueConverter('spreadIdentity')
export class SpreadIdentityValueConverter {
  toView(value: SpreadCardState): SpreadCardState {
    return value;
  }
}
