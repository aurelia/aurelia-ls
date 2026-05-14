import { customElement } from '@aurelia/runtime-html';
import template from './repeat-keyed-iterables-app.html';

type AlertLane = 'primary' | 'secondary';

interface AlertAction {
  readonly label: string;
  readonly tone: 'neutral' | 'danger';
}

interface AlertItem {
  readonly id: string;
  readonly title: string;
  readonly lane: AlertLane;
  readonly active: boolean;
  readonly actions: readonly AlertAction[];
}

interface BreadcrumbItem {
  readonly title: string;
  readonly path: string;
  readonly active: boolean;
}

@customElement({
  name: 'repeat-keyed-iterables-app',
  template,
})
export class RepeatKeyedIterablesApp {
  readonly lanes: AlertLane[] = ['primary', 'secondary'];

  readonly alertsByLane: Record<AlertLane, AlertItem[]> = {
    primary: [
      {
        id: 'a-1',
        title: 'Primary alert',
        lane: 'primary',
        active: true,
        actions: [
          { label: 'Acknowledge', tone: 'neutral' },
          { label: 'Escalate', tone: 'danger' },
        ],
      },
    ],
    secondary: [
      {
        id: 'a-2',
        title: 'Secondary alert',
        lane: 'secondary',
        active: false,
        actions: [
          { label: 'Ignore', tone: 'neutral' },
        ],
      },
    ],
  };

  readonly crumbs: BreadcrumbItem[] | null = [
    { title: 'Inbox', path: '/inbox', active: false },
    { title: 'Alerts', path: '/alerts', active: true },
  ];
}
