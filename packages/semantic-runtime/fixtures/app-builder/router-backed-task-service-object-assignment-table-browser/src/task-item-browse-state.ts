import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskObjectAssignmentService } from './services/task-object-assignment-service';
import { ContactEntry } from './contact-entry';

export class TaskItemBrowseState {
  private readonly taskObjectAssignmentService = resolve(TaskObjectAssignmentService);
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  loadAssignedTasks(): Promise<readonly TaskItem[]> {
    return this.taskObjectAssignmentService.loadAssignedTasks();
  }

  loadAssignedTask(id: string): Promise<TaskItem | null> {
    return this.taskObjectAssignmentService.loadAssignedTask(id);
  }

  createTaskItem(title: string, done: boolean, assignee: ContactEntry | null): Promise<readonly TaskItem[]> {
    return this.taskObjectAssignmentService.addAssignedTask(title, done, assignee);
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
