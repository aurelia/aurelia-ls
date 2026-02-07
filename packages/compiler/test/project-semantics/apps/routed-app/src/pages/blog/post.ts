/**
 * Blog post component with slug parameter.
 *
 * Tests: Parameterized route (:slug), getStaticPaths for SSG
 */
import { customElement } from 'aurelia';

@customElement({ name: 'blog-post', template: '<article><h1>${title}</h1></article>' })
export class BlogPostComponent {
  slug: string = '';
  title: string = '';

  /**
   * SSG: Enumerate all blog post slugs at build time.
   */
  static async getStaticPaths(): Promise<string[]> {
    // In real app, would fetch from CMS/filesystem
    return [
      '/blog/hello-world',
      '/blog/getting-started',
      '/blog/advanced-tips',
    ];
  }

  /**
   * SSG: Fetch post data at build time.
   */
  static async getStaticProps(params: { slug: string }): Promise<{ title: string }> {
    // In real app, would fetch post content
    const titles: Record<string, string> = {
      'hello-world': 'Hello World',
      'getting-started': 'Getting Started with Aurelia',
      'advanced-tips': 'Advanced Tips & Tricks',
    };
    return { title: titles[params.slug] ?? params.slug };
  }
}
