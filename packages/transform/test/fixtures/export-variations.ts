/**
 * Fixture: Different export forms
 *
 * Tests: Named export, default export, no export
 */

import { customElement } from "aurelia";

// Named export (most common)
@customElement({
  name: "named-export",
  template: `<div>\${value}</div>`,
})
export class NamedExport {
  value = "named";
}

// Non-exported class
@customElement({
  name: "internal-component",
  template: `<div>\${value}</div>`,
})
class InternalComponent {
  value = "internal";
}

// Will be exported separately
@customElement({
  name: "later-export",
  template: `<div>\${value}</div>`,
})
class LaterExport {
  value = "later";
}

export { InternalComponent, LaterExport };
