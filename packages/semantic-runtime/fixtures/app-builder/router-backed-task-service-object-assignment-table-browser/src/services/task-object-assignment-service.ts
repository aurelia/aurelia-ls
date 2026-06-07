import { TaskItem } from '../task-item';
import { ContactEntry } from '../contact-entry';

export class TaskObjectAssignmentService {
  private readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review the assignment flow', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'ada') ?? null),
    new TaskItem(2, 'Publish the handoff notes', true, this.contacts.find((contactEntry) => contactEntry.contactId === 'grace') ?? null),
  ];

  async loadAssignedTasks(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async loadAssignedTask(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async addAssignedTask(title: string, done: boolean, assignee: ContactEntry | null): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done, assignee));
    return this.taskItems;
  }
}
