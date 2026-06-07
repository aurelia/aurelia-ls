import Aurelia, { AppTask, IContainer, Registration } from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { StateDefaultConfiguration } from '@aurelia/state';
import { I18nConfiguration } from '@aurelia/i18n';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
import { ISanitizer } from '@aurelia/runtime-html';
import { galleryStateHandler, initialGalleryState, usersGalleryState } from './gallery-state';
import { GallerySanitizer, MyApp } from './my-app';

Aurelia
  .register(
    RouterConfiguration,
    StateDefaultConfiguration.init(initialGalleryState, galleryStateHandler)
      .withStore('users', usersGalleryState, galleryStateHandler),
    I18nConfiguration.customize((options) => {
      options.initOptions = {
          resources: {
            en: {
              translation: {
                app: {
                  title: 'Gallery',
                },
                itemWithCount: '{{count}} item',
              },
            },
          },
        };
    }),
    ValidationHtmlConfiguration,
    DefaultVirtualizationConfiguration,
    Registration.singleton(ISanitizer, GallerySanitizer),
    AppTask.activated(() => undefined),
    AppTask.activated(IContainer, () => undefined)
  )
  .app(MyApp)
  .start();
