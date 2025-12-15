/**
 * Fixture: Various binding modes
 *
 * Tests: one-time, to-view, from-view, two-way bindings
 */

import { customElement } from "aurelia";

@customElement({
  name: "binding-demo",
  template: `
    <div>
      <input value.one-time="initialValue" placeholder="One-time">
      <input value.to-view="computedValue" placeholder="To-view (readonly)">
      <input value.from-view="userInput" placeholder="From-view">
      <input value.two-way="syncedValue" placeholder="Two-way">
      <input value.bind="defaultBind" placeholder="Default (.bind)">
    </div>
    <p>Initial: \${initialValue}</p>
    <p>Computed: \${computedValue}</p>
    <p>User input: \${userInput}</p>
    <p>Synced: \${syncedValue}</p>
  `,
})
export class BindingDemo {
  initialValue = "set once";
  userInput = "";
  syncedValue = "sync me";

  get computedValue() {
    return this.userInput.toUpperCase();
  }

  defaultBind = "default";
}
