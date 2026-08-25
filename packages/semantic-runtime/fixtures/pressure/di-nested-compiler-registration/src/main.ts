import { IContainer } from '@aurelia/kernel';
import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './nested-compiler-registration-app.html';

const CompilerRegistry = {
  register(container: IContainer): void {
    container.register(StandardConfiguration);
  },
};

const OuterRegistry = {
  register(container: IContainer): void {
    container.register(CompilerRegistry);
  },
};

@customElement({
  name: 'nested-compiler-registration-app',
  template,
})
export class NestedCompilerRegistrationApp {
  message = 'Nested compiler registration';
}

new Aurelia()
  .register(OuterRegistry)
  .app({
    host: document.body,
    component: NestedCompilerRegistrationApp,
  })
  .start();
