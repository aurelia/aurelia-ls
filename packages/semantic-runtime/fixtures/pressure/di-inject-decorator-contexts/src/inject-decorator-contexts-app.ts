import { inject } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import template from './inject-decorator-contexts-app.html';

export class DependencyService {
  readonly label = 'dependency';
}

@inject(DependencyService)
@customElement({ name: 'inject-decorator-contexts-app', template })
export class InjectDecoratorContextsApp {
  @inject(DependencyService)
  fieldDependency: DependencyService | null = null;

  @inject(DependencyService)
  load(): string {
    return 'loaded';
  }

  @inject(DependencyService)
  get label(): string {
    return this.fieldDependency?.label ?? 'none';
  }

  @inject(DependencyService)
  set label(_value: string) {
    return;
  }
}
