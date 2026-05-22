export class ProductTier {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly summary: string,
  ) {}

  get nameLabel(): string {
    return this.name;
  }

  get summaryLabel(): string {
    return this.summary;
  }
}

