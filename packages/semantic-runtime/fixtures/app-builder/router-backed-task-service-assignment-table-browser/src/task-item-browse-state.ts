import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskAssignmentService } from './services/task-assignment-service';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  private readonly taskAssignmentService = resolve(TaskAssignmentService);
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  loadAssignedTasks(): Promise<readonly TaskItem[]> {
    return this.taskAssignmentService.loadAssignedTasks();
  }

  loadAssignedTask(id: string): Promise<TaskItem | null> {
    return this.taskAssignmentService.loadAssignedTask(id);
  }

  createTaskItem(title: string, assigneeId: string, reviewerIds: string[]): Promise<readonly TaskItem[]> {
    return this.taskAssignmentService.addAssignedTask(title, assigneeId, reviewerIds);
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
