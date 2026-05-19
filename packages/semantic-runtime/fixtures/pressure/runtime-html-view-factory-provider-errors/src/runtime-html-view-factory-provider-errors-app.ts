import { resolve } from '@aurelia/kernel';
import {
  customAttribute,
  IViewFactory,
} from '@aurelia/runtime-html';

export class RuntimeHtmlViewFactoryProviderErrorsApp {
  message = 'ViewFactory provider pressure';
}

@customAttribute('needs-view-factory')
export class NeedsViewFactoryAttribute {
  private readonly viewFactory = resolve(IViewFactory);
  private readonly nestedFactoryConsumer = class {
    private readonly viewFactory = resolve(IViewFactory);

    get factoryName(): string {
      return this.viewFactory.name;
    }
  };

  get factoryName(): string {
    void this.nestedFactoryConsumer;
    return this.viewFactory.name;
  }
}

@customAttribute({
  name: 'view-factory-template',
  isTemplateController: true,
})
export class ViewFactoryTemplateController {
  private readonly viewFactory = resolve(IViewFactory);

  createName(): string {
    return this.viewFactory.name;
  }
}
