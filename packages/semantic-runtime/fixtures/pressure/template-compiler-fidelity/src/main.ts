import {
  Aurelia,
  customElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import {
  bindingCommand,
  type BindingCommandInstance,
  type IAttrMapper,
  type ICommandBuildInfo,
  type IExpressionParser,
  type IInstruction,
} from '@aurelia/template-compiler';
import template from './app.html';

@bindingCommand('open-command')
class OpenCommand implements BindingCommandInstance {
  build(
    _info: ICommandBuildInfo,
    _parser: IExpressionParser,
    _mapper: IAttrMapper,
  ): IInstruction {
    return { type: 999 };
  }
}

@customElement({
  name: 'containerless-card',
  containerless: true,
  template: '<span>card</span>',
})
class ContainerlessCard {}

@customElement({
  name: 'template-compiler-fidelity-app',
  dependencies: [ContainerlessCard],
  template,
})
class TemplateCompilerFidelityApp {
  selection: string[] = [];
  multiple = true;
  checked = false;
  disabled = false;
  model: unknown = null;
  matcher = (left: unknown, right: unknown): boolean => left === right;
  value = '';
  first = '';
  second = '';
}

void new Aurelia()
  .register(StandardConfiguration, OpenCommand)
  .app({
    host: globalThis.document.body,
    component: TemplateCompilerFidelityApp,
  })
  .start();
