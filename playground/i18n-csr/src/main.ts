import Aurelia from "aurelia";
import { I18nConfiguration } from "@aurelia/i18n";
import { MyAppCustomElement } from "./my-app";
import { en } from "./locales/en";

Aurelia
  .register(
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: { translation: en },
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
          escapeValue: false,
        },
      };
    })
  )
  .app(MyAppCustomElement)
  .start();
