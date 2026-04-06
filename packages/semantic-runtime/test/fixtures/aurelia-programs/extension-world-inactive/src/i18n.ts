export interface I18nConfigurationOptions {
  translationAttributeAliases?: readonly string[];
}

export type I18nOptionsProvider = (options: I18nConfigurationOptions) => void;

export interface I18nConfigurationCarrier {
  readonly family: "i18n";
  customize(provider?: I18nOptionsProvider): I18nConfigurationCarrier;
  register(): void;
}

function createI18nConfiguration(
  _provider: I18nOptionsProvider
): I18nConfigurationCarrier {
  return {
    family: "i18n",
    customize(provider?: I18nOptionsProvider) {
      return createI18nConfiguration(provider ?? (() => {}));
    },
    register() {}
  };
}

export const I18nConfiguration = createI18nConfiguration(() => {});
