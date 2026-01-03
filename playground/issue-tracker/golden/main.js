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
  DefaultRenderers
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { RouterConfiguration } from "@aurelia/router";
import { I18nConfiguration } from "@aurelia/i18n";
import { MyApp } from "./my-app.js";
import { en } from "./locales/en.js";
const AotConfiguration = {
  register(container) {
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
  }
};
function createAotAurelia() {
  const platform = BrowserPlatform.getOrCreate(globalThis);
  const container = DI.createContainer().register(
    Registration.instance(IPlatform, platform),
    AotConfiguration
  );
  return new Aurelia(container);
}
createAotAurelia().register(RouterConfiguration).register(
  I18nConfiguration.customize((options) => {
    options.initOptions = {
      resources: {
        en: { translation: en }
      },
      lng: "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false
        // Not needed for Aurelia (handles escaping)
      }
    };
  })
).app({
  host: document.body,
  component: MyApp
}).start();
