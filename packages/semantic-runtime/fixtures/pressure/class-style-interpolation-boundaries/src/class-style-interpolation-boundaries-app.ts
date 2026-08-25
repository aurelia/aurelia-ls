import { customElement } from '@aurelia/runtime-html';
import template from './class-style-interpolation-boundaries-app.html';

type ProductTone = 'calm' | 'alert';

@customElement({
  name: 'class-style-interpolation-boundaries-app',
  template,
})
export class ClassStyleInterpolationBoundariesApp {
  readonly title = 'Boundary-safe jacket';
  readonly summary = 'Multiple interpolation holes share one class/style attribute.';
  readonly availabilityClass = 'available';
  readonly accentColor = '#1f7a8c';
  readonly stockCount = 3;
  readonly featured = true;
  readonly hidden = false;
  readonly tone: ProductTone = 'calm';
  readonly progress = 37;
  readonly offset = 4;
  readonly imageUrl = '/assets/progress.svg';
  readonly itemId = 'item-1';
  readonly styleRules = { color: this.accentColor, width: `${this.progress}%` };
  readonly widthStyle = `${this.progress}%`;
  readonly viewWidth = 100;
  readonly viewHeight = 16;
  readonly iconHref = '#progress-marker';
}
