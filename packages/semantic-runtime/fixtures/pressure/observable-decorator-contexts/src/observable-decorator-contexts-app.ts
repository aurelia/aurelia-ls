import { observable } from '@aurelia/runtime';

@observable()
export class ClassDecoratorPressure {
  readonly label = 'class decorator pressure';
}

export class ObservableDecoratorContextsApp {
  @observable
  bareField = 'ok';

  @observable()
  configuredField = 'ok';

  @observable()
  load(): string {
    return this.bareField;
  }

  @observable({ name: 'label' })
  get label(): string {
    return this.configuredField;
  }

  @observable({ name: 'count' })
  accessor count = 0;
}
