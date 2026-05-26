
export class SupportTicket {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  get nameLabel(): string {
    return this.name;
  }
}


