import type { AureliaPatternExample } from '../pattern-contract.js';

export const templateConditionalRenderingPattern: AureliaPatternExample = {
  patternId: 'template.conditional-rendering',
  title: 'Conditional UI state rendering',
  guidance: {
    summary: 'Use if.bind, show.bind, and switch.bind deliberately to render loading, empty, error, and ready UI states from plain view-model state.',
    whenToUse: [
      'A component has a small set of mutually exclusive UI states such as loading, empty, error, and ready.',
      'Some elements should be removed when inactive while another panel should keep DOM state across frequent toggles.',
      'The state is local to the component and can be expressed as ordinary TypeScript fields and getters.'
    ],
    whenNotToUse: [
      'The branch represents route-critical data that should be prepared in a router loading hook.',
      'The hidden content needs accessibility semantics beyond display toggling, such as modal focus management.',
      'The conditions duplicate permission, validation, or global application state policy that belongs in an injected service.'
    ]
  },
  source: {
    files: [
      {
        path: 'orders-panel.ts',
        language: 'ts',
        contents: `type OrdersState = 'loading' | 'ready' | 'empty' | 'error';

export interface OrderSummary {
  id: number;
  customer: string;
  total: number;
}

export class OrdersPanel {
  state: OrdersState = 'ready';
  showDetails = false;
  errorMessage = '';

  readonly orders: OrderSummary[] = [
    { id: 101, customer: 'Aster Supply', total: 148 },
    { id: 102, customer: 'Northwind Labs', total: 96 }
  ];

  get hasOrders(): boolean {
    return this.orders.length > 0;
  }

  refresh(): void {
    this.errorMessage = '';
    this.state = this.hasOrders ? 'ready' : 'empty';
  }

  fail(): void {
    this.errorMessage = 'Orders could not be loaded.';
    this.state = 'error';
  }
}
`
      },
      {
        path: 'orders-panel.html',
        language: 'html',
        contents: `<section aria-labelledby="orders-heading">
  <h1 id="orders-heading">Orders</h1>

  <div role="status" if.bind="state === 'loading'">
    Loading orders...
  </div>

  <div role="alert" if.bind="state === 'error'">
    \${errorMessage}
    <button type="button" click.trigger="refresh()">Try again</button>
  </div>

  <template switch.bind="state">
    <p case="empty">There are no orders to review.</p>

    <article case="ready">
      <button type="button" click.trigger="showDetails = !showDetails">
        Toggle details
      </button>

      <ul>
        <li repeat.for="order of orders; key.bind: order.id">
          <strong>\${order.customer}</strong>
          <span show.bind="showDetails">Total: \${order.total}</span>
        </li>
      </ul>
    </article>
  </template>

  <button type="button" click.trigger="fail()" if.bind="state !== 'loading'">
    Simulate failure
  </button>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The branch state is local component state, not router or application-wide authorization state.'
      },
      {
        summary: 'The ready and empty branches are mutually exclusive, so switch.bind keeps that state machine visible.'
      },
      {
        summary: 'The detail span uses show.bind because frequent toggles should preserve the surrounding list item DOM.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use if.bind when removal is the intended behavior.',
        action: 'Choose `if.bind` for infrequent branches that should create and dispose child components, subscriptions, and DOM.'
      },
      {
        summary: 'Use show.bind when preserving DOM state matters.',
        action: 'Choose `show.bind` or `hide.bind` for frequent visibility toggles where inputs, measurements, or child state should stay alive.'
      },
      {
        summary: 'Keep paired template branches adjacent.',
        action: 'Place `else`, `case`, and `default-case` directly after the template controller they complete.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Conditional Rendering',
        url: 'https://docs.aurelia.io/templates/conditional-rendering'
      },
      {
        title: 'Repeats and List Rendering',
        url: 'https://docs.aurelia.io/templates/repeats-and-list-rendering'
      }
    ]
  }
};
