export class Task {
  constructor(
    readonly id: number,
    public title: string,
    public done = false,
  ) {}

  get statusLabel(): string {
    return this.done ? 'Done' : 'Open';
  }
}
