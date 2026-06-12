
export class CustomerAccount {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  get nameLabel(): string {
    return this.name;
  }
}


