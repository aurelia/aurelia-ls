import { customElement, ICustomElementViewModel } from 'aurelia';
import template from './my-app.html';

// NOTE: Child components (Home, About) are NOT imported here.
// They are registered via the Vite plugin's register callback to ensure
// the same (patched) class instances are used for both DI registration
// and route resolution. See vite.config.ts.

@customElement({ name: 'my-app', template })
export class MyAppCustomElement implements ICustomElementViewModel {
  public message = 'Aurelia Router SSR';

  // Static routes configuration using string component names.
  // String names avoid the module identity problem where Vite's ssrLoadModule
  // creates different class instances than those referenced in routes.
  static routes = [
    { path: '', component: 'home', title: 'Home' },
    { path: 'about', component: 'about', title: 'About' },
  ];
}
