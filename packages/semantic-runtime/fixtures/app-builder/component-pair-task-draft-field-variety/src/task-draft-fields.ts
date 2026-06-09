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
  contactEmail: string = 'owner@example.com';
  websiteUrl: string = 'https://example.com/task';
  supportPhone: string = '+31 20 000 0000';
  accessCode: string = '';
  filterText: string = '';
  appointmentTime: string = '09:30';
  scheduledAtLocal: string = '2026-06-07T09:30';
  billingMonth: string = '2026-06';
  reviewWeek: string = '2026-W24';
  estimateHours: number = 0;
  progressPercent: number = 0;
  dueDate: string = '';
  done: boolean = false;
  priority: TaskDraftFieldsPriority = 'normal';
  reviewType: TaskDraftFieldsReviewType = 'manual';
  labels: TaskDraftFieldsLabel[] = [];
  checkpoints: TaskDraftFieldsCheckpoint[] = [];

  saveDraft() {
    this.title = this.title.trim();
    this.description = this.description.trim();
    this.contactEmail = this.contactEmail.trim();
    this.websiteUrl = this.websiteUrl.trim();
    this.supportPhone = this.supportPhone.trim();
    this.appointmentTime = this.appointmentTime.trim();
    this.scheduledAtLocal = this.scheduledAtLocal.trim();
    this.billingMonth = this.billingMonth.trim();
    this.reviewWeek = this.reviewWeek.trim();
    this.filterText = this.filterText.trim();
  }
}