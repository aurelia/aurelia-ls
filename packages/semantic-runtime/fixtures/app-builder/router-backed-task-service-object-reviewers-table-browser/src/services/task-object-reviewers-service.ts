import { TaskItem } from '../task-item';
import { ContactEntry } from '../contact-entry';

export class TaskObjectReviewersService {
  private readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review the assignment flow', false, this.contacts.filter((contactEntry) => ['ada', 'grace'].includes(contactEntry.contactId))),
    new TaskItem(2, 'Publish the handoff notes', true, this.contacts.filter((contactEntry) => ['grace'].includes(contactEntry.contactId))),
  ];

  async loadReviewedTasks(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async loadReviewedTask(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async addReviewedTask(title: string, done: boolean, reviewers: ContactEntry[]): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done, reviewers));
    return this.taskItems;
  }
}
