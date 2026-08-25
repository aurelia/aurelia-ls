import {
  IContainer,
  IRenderLocation,
  IRepeatableHandler,
  IViewFactory,
  Registration,
  Scope,
  customElement,
  resolve,
  templateController,
} from 'aurelia';
import type { ICustomAttributeController } from '@aurelia/runtime-html';
import template from './scope-lab-app.html';

export interface ScopeChild {
  readonly id: string;
  readonly name: string;
}

export interface ScopeTask {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
  readonly children: readonly ScopeChild[];
}

export interface TaskWindow {
  readonly entries: readonly ScopeTask[];
}

export class TaskWindowHandler implements IRepeatableHandler<TaskWindow> {
  static register(container: IContainer): void {
    container.register(Registration.singleton(IRepeatableHandler, this));
  }

  handles(value: unknown): boolean {
    return typeof value === 'object' && value !== null && 'entries' in value;
  }

  iterate(value: TaskWindow, callback: (item: unknown, index: number, value: TaskWindow) => void): void {
    value.entries.forEach((item, index) => callback(item, index, value));
  }
}

@templateController({
  name: 'surface-gate',
  defaultProperty: 'value',
  bindables: ['value'],
})
export class SurfaceGate {
  value = false;
}

@templateController({
  name: 'context-scope',
  defaultProperty: 'value',
  bindables: ['value'],
})
export class ContextScope {
  readonly $controller!: ICustomAttributeController<this>;
  value: ScopeTask | undefined;

  private readonly factory = resolve(IViewFactory);
  private readonly location = resolve(IRenderLocation);
  private view: ReturnType<IViewFactory['create']> | undefined;

  attaching(): void | Promise<void> {
    const view = this.view = this.factory.create(this.$controller).setLocation(this.location);
    const scope = Scope.fromParent(this.$controller.scope!, this.value ?? {});
    return view.activate(view, this.$controller, scope);
  }

  detaching(): void | Promise<void> {
    const view = this.view;
    return view?.deactivate(view, this.$controller);
  }

  dispose(): void {
    this.view?.dispose();
    this.view = undefined;
  }
}

@customElement({
  name: 'scope-lab-app',
  template,
})
export class ScopeLabApp {
  hostTitle = 'Scope lab';
  isReady = true;
  contextualRepeat = true;
  status: 'open' | 'closed' = 'open';
  readonly notIterable = { count: 42 };

  readonly tasks: readonly ScopeTask[] = [
    {
      id: 'alpha',
      name: 'Alpha',
      done: false,
      children: [
        { id: 'alpha-child', name: 'Alpha child' },
      ],
    },
    {
      id: 'beta',
      name: 'Beta',
      done: true,
      children: [
        { id: 'beta-child', name: 'Beta child' },
      ],
    },
  ];

  selectedTask: ScopeTask = this.tasks[0]!;
  readonly taskWindow: ArrayLike<ScopeTask> = {
    0: this.tasks[0]!,
    1: this.tasks[1]!,
    length: 2,
  };
  readonly customTaskWindow: TaskWindow = { entries: this.tasks };

  selectTask(id: string, index: number): void {
    this.selectedTask = this.tasks.find((task) => task.id === id) ?? this.tasks[index] ?? this.selectedTask;
  }

  loadTask(): Promise<ScopeTask> {
    return Promise.resolve(this.selectedTask);
  }
}
