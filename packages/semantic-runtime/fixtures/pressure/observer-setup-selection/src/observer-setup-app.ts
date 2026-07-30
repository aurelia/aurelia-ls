import { customElement } from 'aurelia';
import template from './observer-setup-app.html';
import {
  ClassObservableObserverTarget,
  ComputedObserverTarget,
  DeclaredCallbackObserverTarget,
  FatalCallbackObserverTarget,
  GetterObserverTarget,
  NullPropertyChangedObserverTarget,
  ObservableObserverTarget,
  PlainObserverTarget,
} from './observer-targets';

@customElement({
  name: 'observer-setup-app',
  template,
  dependencies: [
    ClassObservableObserverTarget,
    ComputedObserverTarget,
    DeclaredCallbackObserverTarget,
    FatalCallbackObserverTarget,
    GetterObserverTarget,
    NullPropertyChangedObserverTarget,
    ObservableObserverTarget,
    PlainObserverTarget,
  ],
})
export class ObserverSetupApp {
  message = 'ready';
}
