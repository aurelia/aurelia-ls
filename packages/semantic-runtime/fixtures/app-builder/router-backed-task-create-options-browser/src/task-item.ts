export type TaskItemPriority = 'low' | 'normal' | 'urgent';
export type TaskItemLabel = 'frontend' | 'review' | 'docs';

const taskItemPriorityTitles: Record<TaskItemPriority, string> = {
  'low': 'Low',
  'normal': 'Normal',
  'urgent': 'Urgent',
};

const taskItemLabelsTitles: Record<TaskItemLabel, string> = {
  'frontend': 'Frontend',
  'review': 'Review',
  'docs': 'Docs',
};

export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly priority: TaskItemPriority,
    readonly labels: TaskItemLabel[],
  ) {}

  get priorityLabel(): string {
    return taskItemPriorityTitles[this.priority];
  }

  get labelsLabel(): string {
    return this.labels.length === 0 ? 'None' : this.labels.map((value) => taskItemLabelsTitles[value]).join(', ');
  }
}
