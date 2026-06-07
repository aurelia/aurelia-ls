export class StateItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly enabled: boolean,
  ) {}
}

export class StateItemState {
  readonly items: StateItem[] = [
    new StateItem(1, 'Alpha', true),
    new StateItem(2, 'Beta', false),
  ];
}
