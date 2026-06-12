export type TaskPreferencesPriority = 'low' | 'normal' | 'urgent';

export type TaskPreferencesReviewType = 'manual' | 'peer' | 'automated';

export class TaskPreferences {
  readonly priorityOptions: readonly { readonly value: TaskPreferencesPriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];

  readonly reviewTypeOptions: readonly { readonly value: TaskPreferencesReviewType; readonly title: string }[] = [
    { value: 'manual', title: 'Manual' },
    { value: 'peer', title: 'Peer' },
    { value: 'automated', title: 'Automated' },
  ];

  title: string = 'Update onboarding notes';
  priority: TaskPreferencesPriority = 'normal';
  reviewType: TaskPreferencesReviewType = 'manual';

  savePreferences() {
    this.title = this.title.trim();
  }
}