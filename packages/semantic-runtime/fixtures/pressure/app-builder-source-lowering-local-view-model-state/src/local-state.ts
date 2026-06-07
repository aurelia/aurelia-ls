export type LocalStatePriority = 'low' | 'normal' | 'urgent';
export type LocalStateTag = 'frontend' | 'backend' | 'docs';

export class LocalState {
  readonly priorityOptions: readonly { readonly value: LocalStatePriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];

  readonly tagOptions: readonly { readonly value: LocalStateTag; readonly title: string }[] = [
    { value: 'frontend', title: 'Frontend' },
    { value: 'backend', title: 'Backend' },
    { value: 'docs', title: 'Docs' },
  ];

  title: string = '';
  enabled: boolean = false;
  priority: LocalStatePriority = 'low';
  tags: LocalStateTag[] = [];
}
