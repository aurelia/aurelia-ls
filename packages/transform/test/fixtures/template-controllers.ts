/**
 * Fixture: Template with if/repeat template controllers
 *
 * Tests: Nested template compilation for template controllers
 */

import { customElement } from "aurelia";

@customElement({
  name: "todo-list",
  template: `
    <h2>Todos (\${items.length})</h2>
    <ul if.bind="items.length > 0">
      <li repeat.for="item of items">
        <input type="checkbox" checked.bind="item.done">
        <span class.bind="item.done ? 'done' : ''">\${item.text}</span>
        <button click.trigger="remove(item)">×</button>
      </li>
    </ul>
    <p if.bind="items.length === 0">No todos yet!</p>
  `,
})
export class TodoList {
  items = [
    { text: "Learn Aurelia", done: false },
    { text: "Build something", done: false },
  ];

  remove(item: { text: string; done: boolean }) {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }
}
