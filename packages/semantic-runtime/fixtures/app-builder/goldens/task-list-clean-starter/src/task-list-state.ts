import { Task } from './task';

export class TaskListState {
  newTaskTitle = '';
  private nextTaskId = 4;

  readonly tasks: Task[] = [
    new Task(1, 'Buy groceries', true),
    new Task(2, 'Schedule dentist appointment', false),
    new Task(3, 'Prepare weekly plan', false),
  ];

  get canAddTask(): boolean {
    return this.newTaskTitle.trim().length > 0;
  }

  get remainingCount(): number {
    return this.tasks.filter((task) => !task.done).length;
  }

  get completedCount(): number {
    return this.tasks.filter((task) => task.done).length;
  }

  addTask(): false {
    const title = this.newTaskTitle.trim();
    if (title.length > 0) {
      this.tasks.push(new Task(this.nextTaskId++, title));
      this.newTaskTitle = '';
    }
    return false;
  }

  clearCompletedTasks(): void {
    for (let index = this.tasks.length - 1; index >= 0; index--) {
      if (this.tasks[index]?.done) {
        this.tasks.splice(index, 1);
      }
    }
  }
}
