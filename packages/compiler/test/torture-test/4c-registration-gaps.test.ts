/**
 * Tier 4C: Registration Gap Claims (5 entries)
 *
 * Tests dynamic/opaque registrations that prevent scope completeness.
 * These are the scope-level application of gap dimension 3 (T2005).
 *
 * Each entry shows the full chain:
 * 1. Registration site with opaque argument
 * 2. Registration gap recorded on the scope
 * 3. Completeness claim fails for that scope
 * 4. Negative visibility claim becomes ungrounded
 * 5. Diagnostic demotion (L3 §8.2)
 *
 * Gap source: dynamic container.register() with computed arguments.
 * Static mechanisms (dependencies, import, as-custom-element) are
 * always deterministic.
 *
 * The false-closed-world bug (L3 §9 delta #7): gaps MUST be carried.
 * Silently asserting completeness when gaps exist produces false
 * positive diagnostics.
 *
 * Authority: tier-4.md §4C, scope-resolution.md §Gap Sources,
 * §The false closed-world problem.
 */

import { describe, it } from "vitest";
import {
  runInterpreter,
  evaluateVisibility,
  assertVisible,
  assertNotVisible,
  assertNotComplete,
  assertRegistrationGap,
} from "./harness.js";

describe("4C: Registration Gap Claims", () => {
  it("#4C.1 opaque function call in register()", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { getPlugins } from './plugin-loader';
        import { App } from './app';

        Aurelia.register(...getPlugins()).app(App).start();
      `,
      "/src/plugin-loader.ts": `
        import { IRegistry } from 'aurelia';

        export function getPlugins(): IRegistry[] {
          return loadFromConfig();
        }

        function loadFromConfig(): IRegistry[] {
          return [];
        }
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<maybe-plugin-widget></maybe-plugin-widget>'
        })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // 1-2. getPlugins() is opaque → registration gap on root
    assertRegistrationGap(vis, "app", { reason: "opaque" });

    // 3. Completeness fails
    assertNotComplete(vis, "app");

    // 4. Negative assertion exists but is ungrounded
    assertNotVisible(vis, "maybe-plugin-widget", "app");
  });

  it("#4C.2 spread of unknown array", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { App } from './app';

        const registrations = getRegistrations();
        Aurelia.register(...registrations).app(App).start();

        function getRegistrations() {
          return process.env.PLUGINS?.split(',').map(loadPlugin) ?? [];
        }
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<some-element></some-element>'
        })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // registrations is runtime-computed (process.env dependency)
    assertNotComplete(vis, "app");
    assertNotVisible(vis, "some-element", "app");
  });

  it("#4C.3 runtime-conditional registration", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { DevTools } from './dev-tools';
        import { App } from './app';

        const au = Aurelia;
        if (process.env.NODE_ENV === 'development') {
          au.register(DevTools);
        }
        au.app(App).start();
      `,
      "/src/dev-tools.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'dev-tools', template: '<div>dev panel</div>' })
        export class DevTools {}
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<dev-tools></dev-tools>'
        })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Conditional registration → gap (can't determine if branch executes)
    assertNotComplete(vis, "app");
  });

  it("#4C.4 mixed deterministic + opaque registrations", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { NavBar } from './nav-bar';
        import { Footer } from './footer';
        import { loadThemePlugin } from './theme-loader';
        import { App } from './app';

        Aurelia
          .register(NavBar)
          .register(Footer)
          .register(loadThemePlugin())
          .app(App)
          .start();
      `,
      "/src/nav-bar.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'nav-bar', template: '<nav>bar</nav>' })
        export class NavBar {}
      `,
      "/src/footer.ts": `
        import { customElement } from 'aurelia';

        @customElement({ name: 'footer', template: '<footer>ft</footer>' })
        export class Footer {}
      `,
      "/src/theme-loader.ts": `
        import { IRegistry } from 'aurelia';

        export function loadThemePlugin(): IRegistry {
          return detectTheme();
        }
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<nav-bar></nav-bar><theme-button></theme-button><footer></footer>'
        })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // One opaque registration poisons completeness
    assertNotComplete(vis, "app");

    // But positive claims for deterministic registrations still hold
    assertVisible(vis, "nav-bar", "app", "root");
    assertVisible(vis, "footer", "app", "root");

    // Negative assertion for theme-button is ungrounded (might come from loadThemePlugin)
    assertNotVisible(vis, "theme-button", "app");
  });

  it("#4C.5 plugin config gap — known plugin, config-dependent resources", () => {
    const result = runInterpreter({
      "/src/main.ts": `
        import Aurelia from 'aurelia';
        import { I18nConfiguration } from '@aurelia/i18n';
        import { App } from './app';

        Aurelia
          .register(
            I18nConfiguration.customize((options) => {
              options.initOptions = {
                resources: { en: { translation: { greeting: 'Hello' } } },
                lng: 'en',
                fallbackLng: 'en',
              };
            })
          )
          .app(App)
          .start();
      `,
      "/src/app.ts": `
        import { customElement } from 'aurelia';

        @customElement({
          name: 'app',
          template: '<span t="greeting">fallback</span><span custom-t="other">fallback</span>'
        })
        export class App {}
      `,
    });

    const vis = evaluateVisibility(result);

    // Known plugin with customize callback → gap on callback-dependent
    // resources (the callback may create additional BCs/APs).
    // Default i18n resources are product postulates (known).
    assertNotComplete(vis, "app");
  });
});
