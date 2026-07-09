import { customElement, templateController } from 'aurelia';
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

@templateController({
  name: 'surface-gate',
  defaultProperty: 'value',
  bindables: ['value'],
})
export class SurfaceGate {
  value = false;
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
  notIterable = 42;

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

  selectTask(id: string, index: number): void {
    this.selectedTask = this.tasks.find((task) => task.id === id) ?? this.tasks[index] ?? this.selectedTask;
  }

  loadTask(): Promise<ScopeTask> {
    return Promise.resolve(this.selectedTask);
  }
}
