import {
  AppTask,
  Aurelia,
  IObserverLocator,
} from 'aurelia';
import { IContainer } from '@aurelia/kernel';
import type { IObjectObservationAdapter } from '@aurelia/runtime';
import { AdapterApp } from './adapter-app';

const firstAdapter: IObjectObservationAdapter = {
  getObserver() {
    return null;
  },
};

const secondAdapter: IObjectObservationAdapter = {
  getObserver() {
    return null;
  },
};

const hydratingAdapter: IObjectObservationAdapter = {
  getObserver() {
    return null;
  },
};

const activatedAdapter: IObjectObservationAdapter = {
  getObserver() {
    return null;
  },
};

void new Aurelia()
  .register(
    AppTask.hydrating(IObserverLocator, (locator) => {
      locator.addAdapter(hydratingAdapter);
    }),
    AppTask.creating(IObserverLocator, (locator) => {
      locator.addAdapter(firstAdapter);
    }),
    AppTask.creating(IContainer, (container) => {
      container.get(IObserverLocator).addAdapter(secondAdapter);
    }),
    AppTask.activated(IObserverLocator, (locator) => {
      locator.addAdapter(activatedAdapter);
    }),
  )
  .app({
    host: document.querySelector('adapter-app') ?? document.body,
    component: AdapterApp,
  })
  .start();
