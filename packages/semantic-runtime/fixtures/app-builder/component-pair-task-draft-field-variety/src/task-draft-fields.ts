export type TaskDraftFieldsPriority = 'low' | 'normal' | 'urgent';

export type TaskDraftFieldsReviewType = 'manual' | 'automated' | 'peer';

export type TaskDraftFieldsLabel = 'frontend' | 'review' | 'docs';

export type TaskDraftFieldsCheckpoint = 'requirements' | 'implementation' | 'review';

export class TaskDraftFields {
  readonly priorityOptions: readonly { readonly value: TaskDraftFieldsPriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];

  readonly reviewTypeOptions: readonly { readonly value: TaskDraftFieldsReviewType; readonly title: string }[] = [
    { value: 'manual', title: 'Manual' },
    { value: 'automated', title: 'Automated' },
    { value: 'peer', title: 'Peer' },
  ];

  readonly labelOptions: readonly { readonly value: TaskDraftFieldsLabel; readonly title: string }[] = [
    { value: 'frontend', title: 'Frontend' },
    { value: 'review', title: 'Review' },
    { value: 'docs', title: 'Docs' },
  ];

  readonly checkpointOptions: readonly { readonly value: TaskDraftFieldsCheckpoint; readonly title: string }[] = [
    { value: 'requirements', title: 'Requirements' },
    { value: 'implementation', title: 'Implementation' },
    { value: 'review', title: 'Review' },
  ];

  title: string = '';
  description: string = '';
  estimateHours: number = 0;
  progressPercent: number = 0;
  dueDate: Date | null = null;
  done: boolean = false;
  priority: TaskDraftFieldsPriority = 'normal';
  reviewType: TaskDraftFieldsReviewType = 'manual';
  labels: TaskDraftFieldsLabel[] = [];
  checkpoints: TaskDraftFieldsCheckpoint[] = [];

  saveDraft() {
    this.title = this.title.trim();
    this.description = this.description.trim();
  }
}