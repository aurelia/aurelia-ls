import { TaskItem } from './task-item';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Plan the release checklist', false, 'ada', ['ada', 'grace']),
    new TaskItem(2, 'Publish the onboarding guide', true, 'grace', ['ada']),
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

  reviewersForTaskItem(taskItem: TaskItem): ContactEntry[] {
    return this.contacts.filter((contactEntry) => taskItem.reviewerIds.includes(contactEntry.contactId));
  }

  reviewersLabelForTaskItem(taskItem: TaskItem): string {
    const contacts = this.reviewersForTaskItem(taskItem);
    return contacts.length === 0 ? '' : contacts.map((contactEntry) => String(contactEntry.fullName)).join(', ');
  }
}
