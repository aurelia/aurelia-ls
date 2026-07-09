import {
  bindingBehavior,
  customAttribute,
  customElement,
  valueConverter,
} from 'aurelia';

@customElement({
  name: 'duplicate-card',
  template: '<template><span>one</span></template>',
})
export class DuplicateCardOne {}

@customElement({
  name: 'duplicate-card',
  template: '<template><span>two</span></template>',
})
export class DuplicateCardTwo {}

@customAttribute('duplicate-flag')
export class DuplicateFlagOne {
  value = '';
}

@customAttribute('duplicate-flag')
export class DuplicateFlagTwo {
  value = '';
}

@valueConverter('duplicateFormat')
export class DuplicateFormatOneValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@valueConverter('duplicateFormat')
export class DuplicateFormatTwoValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@bindingBehavior('duplicateTrack')
export class DuplicateTrackOneBindingBehavior {
  bind(): void {}

  unbind(): void {}
}

@bindingBehavior('duplicateTrack')
export class DuplicateTrackTwoBindingBehavior {
  bind(): void {}

  unbind(): void {}
}
