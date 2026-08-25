import {
  bindable,
  bindingBehavior,
  customAttribute,
  customElement,
  valueConverter,
} from 'aurelia';

@customElement({
  name: 'product-card',
  template: '<template>${item}</template>',
})
export class ProductCard {
  @bindable item = '';
}

@customAttribute({ name: 'focus-ring', aliases: ['focus'] })
export class FocusRing {}

@customAttribute('viewBox')
export class SvgViewBox {}

@valueConverter({ name: 'formatName', aliases: ['FormatName'] })
export class FormatNameValueConverter {
  toView(value: unknown): string {
    return String(value);
  }
}

@bindingBehavior({ name: 'trackEdit', aliases: ['TrackEdit'] })
export class TrackEditBindingBehavior {
  bind(): void {}
  unbind(): void {}
}
