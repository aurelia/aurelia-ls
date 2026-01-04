/**
 * SSR Registration Module
 *
 * Registers DI services needed for SSR that aren't automatically discovered.
 * This mirrors what main.ts does on the client side.
 */
import type { IContainer } from "@aurelia/kernel";
import { RouterConfiguration } from "@aurelia/router";
import type { SSRRequestContext } from "@aurelia-ls/ssr";

/**
 * Register services for SSR rendering.
 * Called by the vite-plugin SSR middleware before rendering.
 */
export function register(container: IContainer, _request: SSRRequestContext): void {
  // Register router - provides the 'load' attribute and routing infrastructure
  container.register(RouterConfiguration);
}
