export class Milestone {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly targetDate: Date | null,
  ) {}

  get targetDateLabel(): string {
    return this.targetDate == null ? 'No date' : this.targetDate.toLocaleDateString();
  }
}
