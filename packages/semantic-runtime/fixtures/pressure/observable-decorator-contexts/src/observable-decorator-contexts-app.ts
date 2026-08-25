import { observable } from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './observable-decorator-contexts-app.html';

@observable()
export class ClassDecoratorPressure {
  readonly label = 'class decorator pressure';
}

@customElement({ name: 'observable-decorator-contexts-app', template })
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
