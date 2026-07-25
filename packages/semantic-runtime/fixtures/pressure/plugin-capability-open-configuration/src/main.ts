import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { ClosedOpenAliasApp } from './closed-open-alias-app';
import { EscapedAliasApp } from './escaped-alias-app';
import { HashAliasApp } from './hash-alias-app';
import { OpenI18nApp } from './open-i18n-app';
import { OpenValidationApp } from './open-validation-app';
import {
  closedEscapedAlias,
  closedHashAlias,
  closedOpenAlias,
  openI18n,
  openValidation,
} from './plugin-options';

new Aurelia()
  .register(
    StandardConfiguration,
    openI18n,
  )
  .app({
    host: document.body,
    component: OpenI18nApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    closedOpenAlias,
  )
  .app({
    host: document.body,
    component: ClosedOpenAliasApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    closedHashAlias,
  )
  .app({
    host: document.body,
    component: HashAliasApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    closedEscapedAlias,
  )
  .app({
    host: document.body,
    component: EscapedAliasApp,
  })
  .start();

new Aurelia()
  .register(
    StandardConfiguration,
    openValidation,
  )
  .app({
    host: document.body,
    component: OpenValidationApp,
  })
  .start();
