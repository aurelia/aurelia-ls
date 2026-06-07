import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskRelationshipSearchCreateService } from './services/task-relationship-search-create-service';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  private readonly taskRelationshipSearchCreateService = resolve(TaskRelationshipSearchCreateService);
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  loadTaskRelationships(): Promise<readonly TaskItem[]> {
    return this.taskRelationshipSearchCreateService.loadTaskRelationships();
  }

  loadTaskRelationship(id: string): Promise<TaskItem | null> {
    return this.taskRelationshipSearchCreateService.loadTaskRelationship(id);
  }

  searchTaskRelationshipsByTitle(query: string): Promise<readonly TaskItem[]> {
    return this.taskRelationshipSearchCreateService.searchTaskRelationshipsByTitle(query);
  }

  createTaskItem(title: string, done: boolean, assigneeId: string, reviewerIds: string[]): Promise<readonly TaskItem[]> {
    return this.taskRelationshipSearchCreateService.createTaskRelationship(title, done, assigneeId, reviewerIds);
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

  scheduleLabelForTaskItem(taskItem: TaskItem): string {
    const scheduleWindow = taskItem.schedule;
    return scheduleWindow == null ? '' : String(scheduleWindow.label);
  }

  checkpointsLabelForTaskItem(taskItem: TaskItem): string {
    return taskItem.checkpoints.length === 0 ? '' : taskItem.checkpoints.map((checkpointItem) => String(checkpointItem.title)).join(', ');
  }

  effortLabelForTaskItem(taskItem: TaskItem): string {
    const taskEffort = taskItem.effort;
    return taskEffort == null ? '' : String(taskEffort.summary);
  }
}
