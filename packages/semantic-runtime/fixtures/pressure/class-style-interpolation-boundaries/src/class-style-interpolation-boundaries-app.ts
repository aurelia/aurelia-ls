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
}
