/**
 * SSR Module - Server-Side Rendering for Aurelia templates
 *
 * Uses the actual Aurelia runtime for rendering to ensure perfect parity
 * with client-side behavior.
 */

export {
  renderToString,
  renderComponent,
  type RenderOptions,
  type RenderResult,
  type ComponentDefinition,
} from "./render.js";

export {
  createServerPlatform,
  getDocument,
  type ServerPlatformOptions,
} from "./platform.js";
