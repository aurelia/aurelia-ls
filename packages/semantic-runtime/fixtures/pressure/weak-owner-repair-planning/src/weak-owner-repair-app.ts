import { customElement } from '@aurelia/runtime-html';
import template from './weak-owner-repair-app.html';

@customElement({
  name: 'weak-owner-repair-app',
  template,
})
export class WeakOwnerRepairApp {
  readonly title = 'Weak owner repair pressure';
  readonly anyRows: any[] = [];
  readonly untypedRow: any = {};
  readonly indexedRow: WeakIndexedRow = {};

  makeUntypedRow(): any {
    return {};
  }
}

interface WeakIndexedRow {
  [name: string]: string;
}
