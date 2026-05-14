import { inject } from '@aurelia/kernel';

export class DependencyService {
  readonly label = 'dependency';
}

@inject(DependencyService)
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
