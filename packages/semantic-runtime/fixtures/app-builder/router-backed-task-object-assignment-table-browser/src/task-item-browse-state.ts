import { TaskItem } from './task-item';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review the assignment flow', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'ada') ?? null),
    new TaskItem(2, 'Publish the handoff notes', true, this.contacts.find((contactEntry) => contactEntry.contactId === 'grace') ?? null),
  ];

  findTaskItem(id: string): TaskItem | null {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  createTaskItem(title: string, done: boolean, assignee: ContactEntry | null): void {
    const nextId = this.taskItems.length === 0
      ? 1
      : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done, assignee));
  }

  assigneeForTaskItem(taskItem: TaskItem): ContactEntry | null {
    return taskItem.assignee;
  }

  assigneeLabelForTaskItem(taskItem: TaskItem): string {
    const contactEntry = this.assigneeForTaskItem(taskItem);
    return contactEntry == null ? '' : String(contactEntry.fullName);
  }

  matchContactEntry(left: ContactEntry | null, right: ContactEntry | null): boolean {
    return left?.contactId === right?.contactId;
  }
}
