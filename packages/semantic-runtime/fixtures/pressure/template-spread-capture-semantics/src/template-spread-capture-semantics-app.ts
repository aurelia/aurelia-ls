import { customElement } from '@aurelia/runtime-html';
import template from './template-spread-capture-semantics-app.html';
import {
  CaptureShell,
  FilteredCaptureShell,
  NestedCaptureShell,
  NoCaptureShell,
} from './capture-shell';
import {
  SpreadCard,
  type SpreadCardState,
  SpreadIdentityValueConverter,
} from './spread-card';

@customElement({
  name: 'template-spread-capture-semantics-app',
  template,
  dependencies: [
    SpreadCard,
    CaptureShell,
    FilteredCaptureShell,
    NoCaptureShell,
    NestedCaptureShell,
    SpreadIdentityValueConverter,
  ],
})
export class TemplateSpreadCaptureSemanticsApp {
  spreadState: SpreadCardState = {
    title: 'primary',
    count: 1,
    tone: 'calm',
    internal: 'must-not-spread',
  };
  spreadContainer = {
    details: {
      title: 'nested',
      count: 2,
      tone: 'bright',
      internal: 'must-not-spread',
    },
  };
  spreadCards: SpreadCardState[] = [
    {
      title: 'first repeated',
      count: 3,
      tone: 'quiet',
      internal: 'must-not-spread',
    },
    {
      title: 'second repeated',
      count: 4,
      tone: 'loud',
      internal: 'must-not-spread',
    },
  ];
  aliasShaped = {
    'accent-tone': 'attribute-alias-does-not-match',
    title: 'alias-shape',
  };
  nullableSpread: SpreadCardState | null = null;
  primitiveSpread = 1;
  shellLabel = 'shell';
  capturedValue = 'captured';
  isActive = true;
  showCapture = true;
  capturedEvent = '';

  handleCaptured(event: MouseEvent): void {
    this.capturedEvent = event.type;
  }

  handleLabelEvent(event: Event): void {
    this.capturedEvent = event.type;
  }
}
