export type TaskDraftOverridesPriority = 'low' | 'normal' | 'urgent';

export type TaskDraftOverridesReviewType = 'manual' | 'automated' | 'peer';

export type TaskDraftOverridesCheckpoint = 'requirements' | 'implementation' | 'review';

export class TaskDraftOverrides {
  readonly priorityOptions: readonly { readonly value: TaskDraftOverridesPriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];

  readonly reviewTypeOptions: readonly { readonly value: TaskDraftOverridesReviewType; readonly title: string }[] = [
    { value: 'manual', title: 'Manual' },
    { value: 'automated', title: 'Automated' },
    { value: 'peer', title: 'Peer' },
  ];

  readonly checkpointOptions: readonly { readonly value: TaskDraftOverridesCheckpoint; readonly title: string }[] = [
    { value: 'requirements', title: 'Requirements' },
    { value: 'implementation', title: 'Implementation' },
    { value: 'review', title: 'Review' },
  ];

  title: string = '';
  priority: TaskDraftOverridesPriority = 'normal';
  reviewType: TaskDraftOverridesReviewType = 'manual';
  checkpoints: TaskDraftOverridesCheckpoint[] = [];

  saveDraft() {
    this.title = this.title.trim();
  }
}