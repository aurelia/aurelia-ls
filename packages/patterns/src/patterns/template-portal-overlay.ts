import type { AureliaPatternExample } from '../pattern-contract.js';

export const templatePortalOverlayPattern: AureliaPatternExample = {
  patternId: 'template.portal-overlay',
  title: 'Portal-backed notification overlay',
  guidance: {
    summary: 'Use the portal attribute when component-owned overlay markup must render at a stable DOM location outside the component subtree.',
    whenToUse: [
      'The overlay belongs to the component but needs to escape local stacking or overflow context.',
      'A known target element exists for toast, notification, or floating-panel content.',
      'The component still owns open, close, and rendered content state.'
    ],
    whenNotToUse: [
      'Normal in-place conditional rendering is sufficient.',
      'The overlay state is shared across the application and belongs in an injected service.',
      'The target element is dynamic, missing, controlled by untrusted markup, or the UI needs focus-managed blocking behavior.'
    ]
  },
  source: {
    files: [
      {
        path: 'notification-overlay.ts',
        language: 'ts',
        contents: `export interface NotificationItem {
  id: string;
  message: string;
}

export class NotificationOverlay {
  isOpen = false;

  readonly notifications: NotificationItem[] = [
    { id: 'release', message: 'Preview release is ready.' },
    { id: 'review', message: 'Two reviews need attention.' }
  ];

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }
}
`
      },
      {
        path: 'notification-overlay.html',
        language: 'html',
        contents: `<section>
  <button type="button" click.trigger="open()">
    Show notifications
  </button>

  <aside
    if.bind="isOpen"
    portal="target: body; position: beforeend"
    role="status"
    aria-live="polite"
    aria-labelledby="notification-title">
    <h2 id="notification-title">Notifications</h2>

    <ul>
      <li repeat.for="notification of notifications; key.bind: notification.id">
        \${notification.message}
      </li>
    </ul>

    <button type="button" click.trigger="close()">Close</button>
  </aside>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The portal target exists before the portalled content opens.'
      },
      {
        summary: 'The component owns the overlay open state and rendered content.'
      },
      {
        summary: 'Accessibility behavior such as focus management is adapted to the real overlay type.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Promote app-wide overlays to a DI service.',
        action: 'When multiple components open the same overlay system, move queue and open state into an injected service.'
      },
      {
        summary: 'Keep the target stable and explicit.',
        action: 'Use a predictable selector or element reference and avoid relying on targets that may not exist when the template binds.'
      },
      {
        summary: 'Use a dedicated accessibility pattern for blocking overlays.',
        action: 'Do not adapt this into blocking UI without focus trapping, escape handling, scroll locking, and focus restoration.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Portalling Elements',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/portalling-elements'
      },
      {
        title: 'Template Controllers',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/template-controllers'
      }
    ]
  }
};
