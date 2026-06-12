import { TaskItem, ScheduleWindow, CheckpointItem, TaskEffort } from '../task-item';

export class TaskRelationshipSearchCreateCompleteService {
  private readonly taskItems: TaskItem[] = [
    new TaskItem({
      id: 1,
      title: 'Prepare release notes',
      done: false,
      assigneeId: 'ada',
      reviewerIds: ['ada', 'grace'],
      schedule: new ScheduleWindow(101, 'Draft review', true),
      checkpoints: [
        new CheckpointItem(1001, 'Draft summary', true),
        new CheckpointItem(1002, 'Review changes', false),
      ],
      effort: new TaskEffort('Short focused pass', 2),
    }),
    new TaskItem({
      id: 2,
      title: 'Check deployment checklist',
      done: true,
      assigneeId: 'grace',
      reviewerIds: ['ada'],
      schedule: new ScheduleWindow(102, 'Launch readiness', false),
      checkpoints: [
        new CheckpointItem(2001, 'Confirm owners', true),
      ],
      effort: new TaskEffort('Review with owner', 1),
    }),
  ];

  async loadTaskRelationships(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async loadTaskRelationship(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async searchTaskRelationshipsByTitle(query: string): Promise<readonly TaskItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return this.taskItems;
    }
    return this.taskItems.filter((taskItem) => taskItem.title.toLowerCase().includes(normalizedQuery));
  }

  async createTaskRelationship(title: string, done: boolean, assigneeId: string, reviewerIds: string[]): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem({
      id: nextId,
      title: title,
      done: done,
      assigneeId: assigneeId,
      reviewerIds: reviewerIds,
      schedule: null,
      checkpoints: [],
      effort: null,
    }));
    return this.taskItems;
  }

  async completeTaskRelationship(id: number, done: boolean): Promise<readonly TaskItem[]> {
    const taskItem = this.taskItems.find((candidate) => candidate.id === id);
    if (taskItem != null) {
      taskItem.done = done;
    }
    return this.taskItems;
  }
}
