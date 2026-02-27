/**
 * About page component.
 *
 * Tests: @route with path aliases (array)
 */
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';

@route(['about', 'about-us'])
@customElement({ name: 'about-component', template: '<h1>About Us</h1>' })
export class AboutComponent {}
