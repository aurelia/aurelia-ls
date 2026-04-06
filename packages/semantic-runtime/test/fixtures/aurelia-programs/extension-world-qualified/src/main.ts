import { Aurelia } from "./aurelia.js";
import { I18nConfiguration } from "./i18n.js";

function readRuntimeAliases(): readonly string[] {
  return JSON.parse(process.env.I18N_ALIASES ?? "[]") as readonly string[];
}

function configureAliases(options: { translationAttributeAliases?: readonly string[] }): void {
  options.translationAttributeAliases = readRuntimeAliases();
}

new Aurelia().register(I18nConfiguration.customize(configureAliases));
