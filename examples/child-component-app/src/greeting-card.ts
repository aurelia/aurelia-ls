// Using static $au instead of decorators for SSR compatibility
// Decorators have metadata issues when loaded via ssrLoadModule

export class GreetingCard {
  // Declare bindable as a regular property
  name = 'Guest';

  // A getter to test that real class logic works in child components
  get greeting(): string {
    return `Hello, ${this.name}!`;
  }

  // Another getter with more complex logic
  get nameLength(): number {
    return this.name.length;
  }

  // Static $au definition (no decorator needed)
  static $au = {
    type: 'custom-element' as const,
    name: 'greeting-card',
    bindables: {
      name: { mode: 2 }, // toView binding mode
    },
  };
}
