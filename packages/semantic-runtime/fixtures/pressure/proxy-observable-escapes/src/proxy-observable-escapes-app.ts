import { ProxyObservable } from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './proxy-observable-escapes-app.html';

class SchemaModel {
  title = 'Device settings';
  fields = ['name', 'serial'];
}

class SchemaState {
  readonly schema = new SchemaModel();
  readonly selected = new SchemaModel();
}

@customElement({
  name: 'proxy-observable-escapes-app',
  template,
})
export class ProxyObservableEscapesApp {
  readonly state = new SchemaState();

  get rawSchema(): SchemaModel {
    return ProxyObservable.getRaw(this.state.schema) ?? this.state.schema;
  }

  get unwrappedSelected(): SchemaModel {
    return ProxyObservable.unwrap(this.state.selected);
  }
}
