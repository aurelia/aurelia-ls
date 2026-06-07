import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskObjectReviewersService } from './services/task-object-reviewers-service';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  private readonly taskObjectReviewersService = resolve(TaskObjectReviewersService);
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  loadReviewedTasks(): Promise<readonly TaskItem[]> {
    return this.taskObjectReviewersService.loadReviewedTasks();
  }

  loadReviewedTask(id: string): Promise<TaskItem | null> {
    return this.taskObjectReviewersService.loadReviewedTask(id);
  }

  createTaskItem(title: string, done: boolean, reviewers: ContactEntry[]): Promise<readonly TaskItem[]> {
    return this.taskObjectReviewersService.addReviewedTask(title, done, reviewers);
  }

  reviewersForTaskItem(taskItem: TaskItem): ContactEntry[] {
    return taskItem.reviewers;
  }

  reviewersLabelForTaskItem(taskItem: TaskItem): string {
    const contacts = this.reviewersForTaskItem(taskItem);
    return contacts.length === 0 ? '' : contacts.map((contactEntry) => String(contactEntry.fullName)).join(', ');
  }

  matchContactEntry(left: ContactEntry | null, right: ContactEntry | null): boolean {
    return left?.contactId === right?.contactId;
  }
}
