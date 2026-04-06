import { Aurelia } from "./aurelia.js";
import { I18nConfiguration } from "./i18n.js";

const explicitAliases = ["t", "tx"] as const;

function configureAliases(options: { translationAttributeAliases?: readonly string[] }): void {
  options.translationAttributeAliases = explicitAliases;
}

const localizedConfiguration = I18nConfiguration.customize(configureAliases);

new Aurelia().register(localizedConfiguration);
