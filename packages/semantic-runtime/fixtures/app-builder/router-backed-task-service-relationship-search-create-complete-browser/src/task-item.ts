export interface TaskItemInit {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
  readonly assigneeId: string;
  readonly reviewerIds: string[];
  readonly schedule: ScheduleWindow | null;
  readonly checkpoints: CheckpointItem[];
  readonly effort: TaskEffort | null;
}

export class TaskItem {
  readonly id: number;
  readonly title: string;
  public done: boolean;
  readonly assigneeId: string;
  readonly reviewerIds: string[];
  public schedule: ScheduleWindow | null;
  public checkpoints: CheckpointItem[];
  public effort: TaskEffort | null;

  constructor(init: TaskItemInit) {
    this.id = init.id;
    this.title = init.title;
    this.done = init.done;
    this.assigneeId = init.assigneeId;
    this.reviewerIds = init.reviewerIds;
    this.schedule = init.schedule;
    this.checkpoints = init.checkpoints;
    this.effort = init.effort;
  }
}

export class ScheduleWindow {
  constructor(
    readonly id: number,
    readonly label: string,
    readonly confirmed: boolean,
  ) {}
}

export class CheckpointItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskEffort {
  constructor(
    readonly summary: string,
    readonly hours: number,
  ) {}
}
