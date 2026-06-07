import { TaskItem } from './task-item';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Plan the release checklist', false, 'ada'),
    new TaskItem(2, 'Publish the onboarding guide', true, 'grace'),
  ];

  findTaskItem(id: string): TaskItem | null {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  assigneeForTaskItem(taskItem: TaskItem): ContactEntry | null {
    return this.contacts.find((contactEntry) => contactEntry.contactId === taskItem.assigneeId) ?? null;
  }

  assigneeLabelForTaskItem(taskItem: TaskItem): string {
    const contactEntry = this.assigneeForTaskItem(taskItem);
    return contactEntry == null ? '' : String(contactEntry.fullName);
  }
}
