import { customElement } from '@aurelia/runtime-html';
import template from './template-ref-listener-semantics-app.html';
import { FocusRing } from './focus-ring';
import { RefPanel } from './ref-panel';

@customElement({
  name: 'template-ref-listener-semantics-app',
  template,
  dependencies: [FocusRing, RefPanel],
})
export class TemplateRefListenerSemanticsApp {
  plainElement: HTMLInputElement | null = null;
  explicitElement: HTMLInputElement | null = null;
  panelComponent: RefPanel | null = null;
  panelController: unknown = null;
  legacyPanel: RefPanel | null = null;
  focusRingController: FocusRing | null = null;
  aliasFocusRingController: FocusRing | null = null;
  namedPanel: RefPanel | null = null;
  unsupportedView: unknown = null;
  missingComponent: unknown = null;
  missingNamedTarget: unknown = null;
  readonly readonlyElement: HTMLInputElement | null = null;
  wrongElement: HTMLSelectElement | null = null;
  selfValue = '';
  lastEvent = '';

  handleMouse(event: MouseEvent): boolean {
    this.lastEvent = event.type;
    return true;
  }

  handleKeyboard(event: KeyboardEvent): void {
    this.lastEvent = event.key;
  }

  handlePointer(event: PointerEvent): void {
    this.lastEvent = event.pointerType;
  }

  readonly handlerReference = (event: MouseEvent): boolean => {
    this.lastEvent = event.type;
    return true;
  };

  handleCustom(event: CustomEvent): void {
    this.lastEvent = String(event.detail);
  }
}
