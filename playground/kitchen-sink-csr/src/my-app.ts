/**
 * Kitchen Sink CSR Test App
 *
 * Exercises all major AOT-compiled features in CSR mode.
 * If it works here, AOT emit is correct. If it fails in SSR but works here,
 * the bug is in hydration.
 */
export class MyApp {
  // Basic bindings
  title = "Kitchen Sink";
  message = "Hello, Aurelia!";
  count = 0;
  inputValue = "initial";

  // For repeat
  items = ["Apple", "Banana", "Cherry"];
  users = [
    { name: "Alice", active: true },
    { name: "Bob", active: false },
    { name: "Charlie", active: true },
  ];

  // For if/else
  showContent = true;

  // For switch
  status: "loading" | "success" | "error" = "success";

  // For with
  user = { name: "Demo User", email: "demo@example.com" };

  // For ref
  inputRef: HTMLInputElement | null = null;

  // Methods
  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  toggle() {
    this.showContent = !this.showContent;
  }

  cycleStatus() {
    const states: Array<"loading" | "success" | "error"> = ["loading", "success", "error"];
    const idx = states.indexOf(this.status);
    this.status = states[(idx + 1) % states.length]!;
  }

  addItem() {
    this.items.push(`Item ${this.items.length + 1}`);
  }

  removeItem() {
    this.items.pop();
  }

  focusInput() {
    this.inputRef?.focus();
  }
}
