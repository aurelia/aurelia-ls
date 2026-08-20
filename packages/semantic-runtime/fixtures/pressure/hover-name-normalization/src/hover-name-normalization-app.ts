import { customElement } from 'aurelia';
import template from './hover-name-normalization-app.html';
import {
  FocusRing,
  FormatNameValueConverter,
  ProductCard,
  SvgViewBox,
  TrackEditBindingBehavior,
} from './resources';

@customElement({
  name: 'hover-name-normalization-app',
  template,
  dependencies: [
    ProductCard,
    FocusRing,
    SvgViewBox,
    FormatNameValueConverter,
    TrackEditBindingBehavior,
  ],
})
export class HoverNameNormalizationApp {
  title = 'Mixed-case hover';
  productPromise = Promise.resolve(this.title);
}
