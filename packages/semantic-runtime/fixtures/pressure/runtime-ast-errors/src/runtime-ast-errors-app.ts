import { customElement } from '@aurelia/runtime-html';
import template from './runtime-ast-errors-app.html';

@customElement({
  name: 'runtime-ast-errors-app',
  template,
  strict: true,
})
export class RuntimeAstErrorsApp {
  label = 'not callable';
  settings = {
    label: 'nested not callable',
  };
  nullOwner: null = null;
  nullRecord: null = null;
  counter = 0;
  primitiveRows = ['not an object'];
  arrayLikeRows: Array<{ 0: string; length: number }> = [
    { 0: 'array-like but not Array', length: 1 },
  ];
}
