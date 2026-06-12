import { customElement } from 'aurelia';
import template from './app.html';

let loopTotal = 0;
while (loopTotal < 3) {
  loopTotal = loopTotal + 1;
}

function compoundAssignment(): number {
  let value = 1;
  value &= 1;
  return value;
}

export const unresolvedValue = missingValue;
export const compoundValue = compoundAssignment();

@customElement({
  name: 'app-root',
  template,
})
export class App {
  message = `${loopTotal}:${compoundValue}:${unresolvedValue}`;
}
