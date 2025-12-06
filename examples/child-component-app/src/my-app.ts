// Using static $au instead of decorators for SSR compatibility
import { GreetingCard } from './greeting-card';

export class MyApp {
  appTitle = 'Child Component SSR Test';
  userName = 'World';

  // A getter to test that real class logic works
  get timestamp(): string {
    return new Date().toISOString();
  }

  // Static $au definition with local dependency
  static $au = {
    type: 'custom-element' as const,
    name: 'my-app',
    dependencies: [GreetingCard],
  };
}
