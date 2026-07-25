import { customElement } from '@aurelia/runtime-html';
import { fromState } from '@aurelia/state';
import template from './admitted-plugin-app.html';
import type {
  ActivityState,
  DashboardState,
} from './state';

export class AdmittedEntry {
  constructor(
    readonly id: number,
    readonly label: string,
  ) {}
}

@customElement({
  name: 'admitted-plugin-app',
  template,
})
export class AdmittedPluginApp {
  readonly titleKey = 'dashboard.title';
  readonly entries: readonly AdmittedEntry[] = [
    new AdmittedEntry(1, 'First'),
    new AdmittedEntry(2, 'Second'),
  ];
  readonly errors: readonly unknown[] = [];
  displayName = 'Ada';

  @fromState<DashboardState, boolean>((state) => state.ready)
  readyFromStore = false;

  @fromState<ActivityState, string>('activity', (state) => state.label)
  activityLabel = '';
}
