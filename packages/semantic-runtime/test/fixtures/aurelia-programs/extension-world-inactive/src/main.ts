import { Aurelia } from "./aurelia.js";
import { I18nConfiguration } from "./i18n.js";

const visibleConfiguration = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = ["t", "tx"];
});

export const unusedConfiguration = visibleConfiguration;
export const app = new Aurelia();
