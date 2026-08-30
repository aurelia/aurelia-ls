export class Milestone {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly targetDate: string,
  ) {}

  get targetDateLabel(): string {
    return this.targetDate.trim().length === 0 ? 'No date' : this.targetDate;
  }
}
