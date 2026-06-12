import { customElement } from '@aurelia/runtime-html';
import type { IActionHandler } from '@aurelia/state';
import template from './i18n-translation-binding-errors-app.html';

@customElement({
  name: 'i18n-translation-binding-errors-app',
  template,
})
export class I18nTranslationBindingErrorsApp {
  customerName = 'Ada';
  otherName = 'Grace';
  numericKey = 123;
  objectKey = { viewName: 'greeting' };
  parameterName = 123;
  parameterObject = { viewName: 'VM Ada' };
}

export interface TranslationState {
  readonly numericKey: string;
  readonly objectKey: {
    readonly stateName: string;
  };
  readonly parameterName: string;
  readonly parameterObject: {
    readonly stateName: string;
  };
}

export const initialTranslationState: TranslationState = {
  numericKey: 'greeting',
  objectKey: {
    stateName: 'greeting',
  },
  parameterName: 'State Ada',
  parameterObject: {
    stateName: 'State Ada',
  },
};

export const translationStateHandler: IActionHandler<TranslationState> = (state) => state;
