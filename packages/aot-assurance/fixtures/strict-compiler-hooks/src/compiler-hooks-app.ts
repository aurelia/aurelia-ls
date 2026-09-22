import { cssModules, customElement } from 'aurelia';
import template from './compiler-hooks-app.html';
import { OpaqueLiteral, OpaquePolicy, TransparentGate, UndecidedGate } from './content-gates.js';
import { StyledPanel } from './styled-panel.js';

@customElement({
  name: 'compiler-hooks-app', template,
  dependencies: [OpaqueLiteral, OpaquePolicy, TransparentGate, UndecidedGate, StyledPanel,
    cssModules({ local: 'app-local', step: 'localDone' })],
})
export class CompilerHooksApp {
  message = 'alpha';
  active = true;
  visible = true;
  items = ['one', 'two'];
  append(): void { this.items.push('three'); }
}
