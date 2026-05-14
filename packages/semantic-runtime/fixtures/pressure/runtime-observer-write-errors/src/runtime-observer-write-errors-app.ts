import { customElement } from '@aurelia/runtime-html';
import { MapSizeTarget, ReadonlyTarget } from './targets';
import template from './runtime-observer-write-errors-app.html';

@customElement({
  name: 'runtime-observer-write-errors-app',
  template,
  dependencies: [ReadonlyTarget, MapSizeTarget],
})
export class RuntimeObserverWriteErrorsApp {
  label = 'incoming value';
  size = 2;
}
