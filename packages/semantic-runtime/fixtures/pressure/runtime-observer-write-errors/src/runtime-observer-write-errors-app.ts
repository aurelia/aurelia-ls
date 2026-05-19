import { customElement } from '@aurelia/runtime-html';
import { MapSizeTarget, ReadonlyFieldTarget, ReadonlyTarget, SetterOnlyTarget } from './targets';
import template from './runtime-observer-write-errors-app.html';

@customElement({
  name: 'runtime-observer-write-errors-app',
  template,
  dependencies: [ReadonlyTarget, SetterOnlyTarget, ReadonlyFieldTarget, MapSizeTarget],
})
export class RuntimeObserverWriteErrorsApp {
  label = 'incoming value';
  size = 2;
  iconHref = '#status';
  language = 'en';
  xmlBase = '/assets/';
}
