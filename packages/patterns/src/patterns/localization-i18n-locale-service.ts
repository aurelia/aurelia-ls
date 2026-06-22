import type { AureliaPatternExample } from '../pattern-contract.js';

export const localizationI18nLocaleServicePattern: AureliaPatternExample = {
  patternId: 'localization.i18n-locale-service',
  title: 'I18n locale service',
  guidance: {
    summary: 'Use @aurelia/i18n with stable translation keys and a small locale service when text and attributes must change with the active locale.',
    whenToUse: [
      'The app needs translated text, labels, placeholders, titles, or alt text.',
      'Users can switch locale at runtime and the choice should be stored.',
      'Programmatic strings should use the same translation resources as templates.'
    ],
    whenNotToUse: [
      'The app only needs local display formatting in one component.',
      'Translation resources are not stable enough to reference by key.',
      'Validation localization or route-level lazy namespaces are the actual problem.'
    ]
  },
  source: {
    files: [
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { I18nConfiguration } from '@aurelia/i18n';
import { App } from './app';
import { en } from './locales/en';
import { nl } from './locales/nl';

void Aurelia
  .register(I18nConfiguration.customize((options) => {
    options.initOptions = {
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: en },
        nl: { translation: nl }
      }
    };
  }))
  .app(App)
  .start();
`
      },
      {
        path: 'locale-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import { I18N } from '@aurelia/i18n';

export interface LocaleOption {
  code: string;
  labelKey: string;
}

export class LocaleService {
  private readonly i18n = resolve(I18N);
  currentLocale = this.i18n.getLocale();
  readonly locales: readonly LocaleOption[] = [
    { code: 'en', labelKey: 'locale.en' },
    { code: 'nl', labelKey: 'locale.nl' }
  ];

  tr(key: string, options?: Record<string, unknown>): string {
    return this.i18n.tr(key, options);
  }

  async changeLocale(locale: string): Promise<void> {
    if (!this.locales.some((option) => option.code === locale)) {
      return;
    }

    await this.i18n.setLocale(locale);
    this.currentLocale = locale;
    localStorage.setItem('app-locale', locale);
  }

  async restoreSavedLocale(): Promise<void> {
    const saved = localStorage.getItem('app-locale');
    if (saved !== null) {
      await this.changeLocale(saved);
    }
  }
}

export interface ILocaleService extends LocaleService {}

export const ILocaleService = DI.createInterface<ILocaleService>(
  'ILocaleService',
  (x) => x.singleton(LocaleService)
);
`
      },
      {
        path: 'app.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { ILocaleService } from './locale-service';

export class App {
  readonly localeService = resolve(ILocaleService);
  userName = 'Ada';

  async binding(): Promise<void> {
    await this.localeService.restoreSavedLocale();
  }

  get signedInMessage(): string {
    return this.localeService.tr('dashboard.signedInAs', { name: this.userName });
  }
}
`
      },
      {
        path: 'app.html',
        language: 'html',
        contents: `<main>
  <label for="locale" t="locale.choose">Choose language</label>
  <select id="locale" value.bind="localeService.currentLocale" change.trigger="localeService.changeLocale(localeService.currentLocale)">
    <option repeat.for="locale of localeService.locales" value.bind="locale.code" t.bind="locale.labelKey"></option>
  </select>

  <h1 t="dashboard.title">Dashboard</h1>
  <p t="[title]dashboard.helpTitle;dashboard.intro">Use the dashboard to review current work.</p>
  <p>\${signedInMessage}</p>
</main>
`
      },
      {
        path: 'locales/en.ts',
        language: 'ts',
        contents: `export const en = {
  locale: {
    choose: 'Choose language',
    en: 'English',
    nl: 'Dutch'
  },
  dashboard: {
    title: 'Dashboard',
    intro: 'Use the dashboard to review current work.',
    helpTitle: 'Dashboard help',
    signedInAs: 'Signed in as {{name}}'
  }
} as const;
`
      },
      {
        path: 'locales/nl.ts',
        language: 'ts',
        contents: `export const nl = {
  locale: {
    choose: 'Kies taal',
    en: 'Engels',
    nl: 'Nederlands'
  },
  dashboard: {
    title: 'Dashboard',
    intro: 'Gebruik het dashboard om huidig werk te bekijken.',
    helpTitle: 'Dashboard hulp',
    signedInAs: 'Ingelogd als {{name}}'
  }
} as const;
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Translation keys are stable application contracts and should be reviewed like route ids.'
      },
      {
        summary: 'Locale persistence is a local preference and not the source of translation resources.'
      },
      {
        summary: 'The i18n plugin updates translated template bindings when the active locale changes.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep resources close to the feature until they need extraction.',
        action: 'Start with typed local resource objects or bundled JSON, then move to async namespace loading when bundle size demands it.'
      },
      {
        summary: 'Translate attributes deliberately.',
        action: 'Use `[title]`, `[alt]`, and `[placeholder]` targets for user-facing attributes instead of leaving English literals in markup.'
      },
      {
        summary: 'Separate validation localization from basic UI text.',
        action: 'Use validation-i18n only after the validation pattern exists in the app and error messages must localize too.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Internationalization',
        url: 'https://docs.aurelia.io/aurelia-packages/internationalization'
      },
      {
        title: 'Internationalization Outcome Recipes',
        url: 'https://docs.aurelia.io/aurelia-packages/internationalization-outcome-recipes'
      },
      {
        title: 'Extended Tutorial Internationalization',
        url: 'https://docs.aurelia.io/getting-started/extended-tutorial/step-7-internationalization'
      }
    ]
  }
};
