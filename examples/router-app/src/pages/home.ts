import { customElement, ICustomElementViewModel } from 'aurelia';
import template from './home.html';

@customElement({ name: 'home', template })
export class Home implements ICustomElementViewModel {
  public title = 'Home Page';
  public description = 'Welcome to the Aurelia Router SSR example.';
}
