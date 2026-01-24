/**
 * Home page component.
 *
 * Tests: Simple @route decorator with string path
 */
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';

@route('')
@customElement({ name: 'home-component', template: '<h1>Welcome Home</h1>' })
export class HomeComponent {}
