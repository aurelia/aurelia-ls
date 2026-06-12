import {
  AppTask,
  AttrMapper,
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { AttrMapperConfigErrorsApp } from './attr-mapper-config-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    AppTask.creating(AttrMapper, (mapper) => {
      mapper.useMapping({ INPUT: { maxlength: 'maxLength' } });
      mapper.useGlobalMapping({ tabindex: 'tabIndex' });
      mapper.useMapping({ 'MY-ELEMENT': { thing: 'thing' } });
      mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } });
    }),
  )
  .app({
    host: document.body,
    component: AttrMapperConfigErrorsApp,
  })
  .start();
