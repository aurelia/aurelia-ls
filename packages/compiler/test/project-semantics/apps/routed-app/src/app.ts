/**
 * Root application component with route configuration.
 *
 * Tests: @route decorator with routes array, class references
 */
import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
import { HomeComponent } from './pages/home';
import { AboutComponent } from './pages/about';
import { ProductsComponent } from './pages/products';
import { BlogComponent } from './pages/blog';

@route({
  routes: [
    { path: '', component: HomeComponent, title: 'Home' },
    { path: 'about', component: AboutComponent, title: 'About Us' },
    { path: 'products', component: ProductsComponent },
    { path: 'blog', component: BlogComponent },
    { path: 'old-home', redirectTo: '' },
  ]
})
@customElement({ name: 'app', template: '<au-viewport></au-viewport>' })
export class App {}
