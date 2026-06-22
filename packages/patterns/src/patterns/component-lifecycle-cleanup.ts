import type { AureliaPatternExample } from '../pattern-contract.js';

export const componentLifecycleCleanupPattern: AureliaPatternExample = {
  patternId: 'component.lifecycle-cleanup',
  title: 'Lifecycle setup and cleanup',
  guidance: {
    summary: 'Use attached plus detaching or dispose when a component owns browser resources, subscriptions, or third-party setup that must be cleaned up.',
    whenToUse: [
      'A component registers a window or document listener while it is on screen.',
      'A component measures or initializes browser-only behavior after its element is attached.',
      'The cleanup belongs to the same component that performed the setup.'
    ],
    whenNotToUse: [
      'The work is pure local state and can be handled by fields, getters, or template bindings.',
      'The subscription is application-wide and should live in a shell-owned or injected service lifetime.',
      'The work is route-critical data loading, which belongs in router loading hooks instead.'
    ]
  },
  source: {
    files: [
      {
        path: 'viewport-size-panel.ts',
        language: 'ts',
        contents: `export class ViewportSizePanel {
  width = 0;
  height = 0;
  isTracking = false;

  private readonly updateSize = (): void => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  };

  attached(): void {
    this.updateSize();
    window.addEventListener('resize', this.updateSize);
    this.isTracking = true;
  }

  detaching(): void {
    window.removeEventListener('resize', this.updateSize);
    this.isTracking = false;
  }
}
`
      },
      {
        path: 'viewport-size-panel.html',
        language: 'html',
        contents: `<section aria-labelledby="viewport-size-heading">
  <h1 id="viewport-size-heading">Viewport size</h1>

  <p if.bind="isTracking" role="status">
    Tracking browser resize events.
  </p>
  <p else>
    Resize tracking is inactive.
  </p>

  <dl>
    <dt>Width</dt>
    <dd>\${width}px</dd>
    <dt>Height</dt>
    <dd>\${height}px</dd>
  </dl>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The component owns the listener and should remove it when the component leaves the DOM.'
      },
      {
        summary: 'The listener depends on browser APIs, so setup waits until the component is attached.'
      },
      {
        summary: 'The state is local display state and does not need an injected shared service.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Pair setup and cleanup in the matching lifecycle hooks.',
        action: 'Use `attached` with `detaching` for DOM work, and `dispose` for resources owned until permanent instance disposal.'
      },
      {
        summary: 'Keep the same callback identity for removeEventListener.',
        action: 'Store listener functions on the class so cleanup removes exactly the function that setup registered.'
      },
      {
        summary: 'Choose a longer-lived owner for application-wide subscriptions.',
        action: 'Move shell-wide listeners or event streams into an injected service when multiple components need the same lifetime or state.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Component lifecycles',
        url: 'https://docs.aurelia.io/components/component-lifecycles'
      },
      {
        title: 'Lifecycle Visual Diagrams',
        url: 'https://docs.aurelia.io/components/lifecycle-diagrams'
      }
    ]
  }
};
