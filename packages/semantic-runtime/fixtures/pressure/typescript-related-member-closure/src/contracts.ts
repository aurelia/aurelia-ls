export interface PrimaryContract {
  value: string;
  run(): void;
}

export interface SecondaryContract {
  value: string;
}

export interface AdvancedContract {
  readonly readonlyValue: string;
  accessorValue: string;
  abstractValue: string;
  parameterValue: string;
  overloaded(input: string): string;
  perform(): void;
}

export abstract class BaseViewModel {
  inherited = '';
  overridden = '';

  execute(): void {}

  abstract abstractValue: string;
  abstract perform(): void;
}
