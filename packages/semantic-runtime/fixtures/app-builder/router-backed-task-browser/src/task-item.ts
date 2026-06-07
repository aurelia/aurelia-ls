export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    readonly assigneeId: string,
  ) {}
}
