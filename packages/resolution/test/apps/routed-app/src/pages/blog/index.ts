/**
 * Blog container using static routes property pattern.
 *
 * Tests: static routes property (alternative to @route decorator)
 */
import { customElement } from 'aurelia';
import { BlogListComponent } from './list';
import { BlogPostComponent } from './post';

@customElement({ name: 'blog-component', template: '<au-viewport></au-viewport>' })
export class BlogComponent {
  /**
   * Route configuration via static property.
   * Alternative to @route decorator.
   */
  static routes = [
    { path: '', component: BlogListComponent, title: 'Blog' },
    { path: ':slug', component: BlogPostComponent, title: 'Blog Post' },
  ];
}

// Re-export
export { BlogListComponent, BlogPostComponent };
