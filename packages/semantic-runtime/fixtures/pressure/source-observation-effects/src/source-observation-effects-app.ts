import { IContainer, resolve } from '@aurelia/kernel';
import { IObservation, observable } from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './source-observation-effects-app.html';

class MouseTracker {
  @observable()
  coord: [number, number] = [0, 0];
}

class ProfileState {
  readonly profile = {
    name: 'Ada',
    address: {
      city: 'Utrecht',
    },
  };
  readonly tracker = new MouseTracker();
}

@customElement({
  name: 'source-observation-effects-app',
  template,
})
export class SourceObservationEffectsApp {
  private readonly container = resolve(IContainer);
  private readonly observation = resolve(IObservation);
  readonly state = new ProfileState();
  readonly cityExpression = 'address.city';
  latestName = '';
  latestCity = '';
  latestDynamicCity = '';
  latestContainerCity = '';
  latestCoordinateText = '';

  constructor() {
    this.observation.watch(this.state.profile, (profile) => profile.name, (value) => {
      this.latestName = value;
    });
    this.observation.watch(this.state.profile, 'address.city', (value) => {
      this.latestCity = String(value);
    }, { immediate: false });
    this.observation.watch(this.state.profile, this.cityExpression, (value) => {
      this.latestDynamicCity = String(value);
    });
    this.container.get(IObservation).watch(this.state.profile, (profile) => profile.address.city, (value) => {
      this.latestContainerCity = value;
    });
    this.observation.run(() => {
      this.latestCoordinateText = this.state.tracker.coord.join(', ');
    });
  }
}
