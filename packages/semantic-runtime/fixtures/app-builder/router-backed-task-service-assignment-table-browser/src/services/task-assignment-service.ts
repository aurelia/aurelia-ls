import { TaskItem } from '../task-item';

export class TaskAssignmentService {
  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review the assignment flow', false, 'ada', ['ada', 'grace']),
    new TaskItem(2, 'Publish the handoff notes', true, 'grace', ['ada']),
  ];

  async loadAssignedTasks(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async loadAssignedTask(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async addAssignedTask(title: string, assigneeId: string, reviewerIds: string[]): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, false, assigneeId, reviewerIds));
    return this.taskItems;
  }
}
