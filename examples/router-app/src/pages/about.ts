import { customElement, ICustomElementViewModel } from 'aurelia';
import template from './about.html';

@customElement({ name: 'about', template })
export class About implements ICustomElementViewModel {
  public title = 'About Page';
  public items = ['Server-side rendering', 'Client hydration', 'Router integration'];
}
