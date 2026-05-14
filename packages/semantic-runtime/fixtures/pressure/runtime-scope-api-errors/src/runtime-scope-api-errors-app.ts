import { Scope } from '@aurelia/runtime';
import { customElement } from '@aurelia/runtime-html';
import template from './runtime-scope-api-errors-app.html';

const definitelyNullScope: null = null;
const definitelyUndefinedContext: undefined = undefined;

Scope.getContext(null as unknown as Scope, 'message', 0);
Scope.fromParent(definitelyNullScope, {}, {});
Scope.create(definitelyUndefinedContext);

@customElement({
  name: 'runtime-scope-api-errors-app',
  template,
})
export class RuntimeScopeApiErrorsApp {
  message = 'scope api pressure';
}
