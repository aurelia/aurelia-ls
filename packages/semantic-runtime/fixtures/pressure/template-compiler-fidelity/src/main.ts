import {
  Aurelia,
  customElement,
  StandardConfiguration,
  templateController,
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
  name: 'shadow-containerless-card',
  containerless: true,
  shadowOptions: { mode: 'open' },
  template: '<slot></slot>',
})
class ShadowContainerlessCard {}

@templateController('row-outer')
class RowOuterTemplateController {}

@templateController('row-inner')
class RowInnerTemplateController {}

@customElement({
  name: 'projection-card',
  template: '<au-slot></au-slot><au-slot name="named"></au-slot>',
})
class ProjectionCard {}

@customElement({
  name: 'open-classification-probe',
  template: '<div $bindables></div><div row-outer $bindables><span title.bind="value"></span></div>',
  dependencies: [RowOuterTemplateController],
})
class OpenClassificationProbe {
  value = '';
}

@customElement({
  name: 'template-compiler-fidelity-app',
  dependencies: [
    ContainerlessCard,
    OpenClassificationProbe,
    ProjectionCard,
    RowOuterTemplateController,
    RowInnerTemplateController,
    ShadowContainerlessCard,
  ],
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
