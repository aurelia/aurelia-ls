/**
 * Issue Tracker - Main Entry Point
 *
 * Bootstrap Aurelia 2 with:
 * - Router for page navigation
 * - i18n for internationalization
 * - AOT-compiled components
 */

import { DI, Registration } from "@aurelia/kernel";
import { DirtyChecker } from "@aurelia/runtime";
import { ExpressionParser } from "@aurelia/expression-parser";
import { TemplateCompiler } from "@aurelia/template-compiler";
import {
  Aurelia,
  IPlatform,
  NodeObserverLocator,
  DefaultResources,
  DefaultBindingSyntax,
  DefaultBindingLanguage,
  DefaultRenderers,
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { RouterConfiguration } from "@aurelia/router";
import { I18nConfiguration } from "@aurelia/i18n";

import { MyApp } from "./my-app";
import { en } from "./locales/en";

// =============================================================================
// AOT Configuration
// =============================================================================

/**
 * Configuration for AOT-compiled applications.
 * Registers core runtime services without JIT compiler overhead.
 */
const AotConfiguration = {
  register(container: ReturnType<typeof DI.createContainer>) {
    return container.register(
      DirtyChecker,
      NodeObserverLocator,
      ExpressionParser,
      TemplateCompiler,
      ...DefaultResources,
      ...DefaultBindingSyntax,
      ...DefaultBindingLanguage,
      ...DefaultRenderers
    );
  },
};

// =============================================================================
// Application Bootstrap
// =============================================================================

/**
 * Create an Aurelia instance configured for AOT compilation.
 */
function createAotAurelia(): Aurelia {
  const platform = BrowserPlatform.getOrCreate(globalThis);
  const container = DI.createContainer().register(
    Registration.instance(IPlatform, platform),
    AotConfiguration
  );
  return new Aurelia(container);
}

// Start the application
createAotAurelia()
  // Register Router
  .register(RouterConfiguration)
  // Register i18n with English translations
  .register(
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: { translation: en },
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
          escapeValue: false, // Not needed for Aurelia (handles escaping)
        },
      };
    })
  )
  // Mount and start
  .app({
    host: document.body,
    component: MyApp,
  })
  .start();
