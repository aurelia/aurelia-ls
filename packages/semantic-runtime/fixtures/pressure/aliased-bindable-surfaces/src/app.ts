import { customElement } from 'aurelia';
import { DisplayHint } from './display-hint';
import { ProductCard } from './product-card';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ProductCard, DisplayHint],
})
export class App {
  titleText = 'Featured';
  aliasLabel = 'Roadside Lamp';
  accentTone = 'warm';
}
