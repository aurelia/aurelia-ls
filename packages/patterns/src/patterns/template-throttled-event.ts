import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateThrottledEventPattern: AureliaPatternExample = {
  patternId: 'template.throttled-event',
  title: 'Throttled high-frequency event',
  guidance: {
    summary: 'Use `throttle` on high-frequency local events when the handler should run at a controlled interval.',
    whenToUse: [
      'A mouse, pointer, scroll, or input event fires too often for useful local UI updates.',
      'Skipping intermediate events is acceptable.',
      'The behavior stays inside the component and does not start remote work.'
    ],
    whenNotToUse: [
      'The final value after typing is more important than steady interval updates.',
      'Every event must be handled for correctness.',
      'The handler starts HTTP work, route changes, or shared state transitions.'
    ]
  },
  source: {
    files: [
      {
        path: 'pointer-meter.ts',
        language: 'ts',
        contents: `export class PointerMeter {
  x = 0;
  y = 0;
  sampleCount = 0;

  recordPointer(event: MouseEvent): void {
    this.x = Math.round(event.offsetX);
    this.y = Math.round(event.offsetY);
    this.sampleCount += 1;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.sampleCount = 0;
  }
}
`
      },
      {
        path: 'pointer-meter.html',
        language: 'html',
        contents: `<section>
  <div
    class="pointer-zone"
    mousemove.trigger="recordPointer($event) & throttle:100"
    aria-label="Pointer tracking zone">
    Move inside this area
  </div>

  <p>Last sample: \${x}, \${y}</p>
  <p>Samples recorded: \${sampleCount}</p>
  <button type="button" click.trigger="reset()">Reset</button>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'Intermediate events can be dropped without changing correctness.'
      },
      {
        summary: 'The handler performs local state updates only.'
      },
      {
        summary: 'A 100ms interval is responsive enough for the UI.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use debounce for final-value workflows.',
        action: 'If the user is typing and only the settled value matters, switch to a debounced input pattern.'
      },
      {
        summary: 'Keep remote work out of the throttled handler.',
        action: 'When a throttled event starts requests, add request cancellation, stale-response handling, and service ownership.'
      },
      {
        summary: 'Review accessibility for pointer-only affordances.',
        action: 'Add keyboard or native-control alternatives when the event drives meaningful application behavior.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Event Binding',
        url: 'https://docs.aurelia.io/templates/template-syntax/event-binding'
      },
      {
        title: 'Binding Behaviors',
        url: 'https://docs.aurelia.io/templates/binding-behaviors'
      }
    ]
  }
};
