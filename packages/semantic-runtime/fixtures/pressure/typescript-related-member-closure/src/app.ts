import { customElement } from 'aurelia';
import template from './app.html';
import {
  type AdvancedContract,
  BaseViewModel,
  type PrimaryContract,
  type SecondaryContract,
} from './contracts';

@customElement({ name: 'app', template })
export class App extends BaseViewModel implements PrimaryContract, SecondaryContract, AdvancedContract {
  value = '';
  readonly readonlyValue = '';
  abstractValue = '';
  items: string[] = [];

  private accessorBacking = '';

  constructor(public parameterValue: string = '') {
    super();
  }

  get accessorValue(): string {
    return this.accessorBacking;
  }

  set accessorValue(value: string) {
    this.accessorBacking = value;
  }

  run(): void {}

  override overridden = '';

  override execute(): void {}

  overloaded(input: string): string;
  overloaded(input: number): number;
  overloaded(input: string | number): string | number {
    return input;
  }

  perform(): void {}

  readMembers(): string {
    this.run();
    this.execute();
    this.perform();
    this.overloaded('');
    return [
      this.value,
      this.inherited,
      this.overridden,
      this.readonlyValue,
      this.accessorValue,
      this.abstractValue,
      this.parameterValue,
      String(this.items.length),
    ].join(':');
  }
}

function readPrimary(contract: PrimaryContract): void {
  contract.value;
  contract.run();
}

function readSecondary(contract: SecondaryContract): string {
  return contract.value;
}

const contextual: PrimaryContract = {
  value: '',
  run() {},
};

const value = '';
const contextualShorthand: PrimaryContract = {
  value,
  run() {},
};

function destructure(input: PrimaryContract): void {
  const { value: localValue } = input;
  localValue;
  const { value } = input;
  value;
}

class StructuralContract {
  value = '';
  run(): void {}
}

const structural = new StructuralContract();
const structuralAsPrimary: PrimaryContract = structural;
structural.value;
structural.run();

void readPrimary;
void readSecondary;
void contextual;
void contextualShorthand;
void destructure;
void structuralAsPrimary;
