/**
 * Kitchen Sink CSR Test App
 *
 * Exercises all major AOT-compiled features in CSR mode including routing.
 * If it works here, AOT emit is correct. If it fails in SSR but works here,
 * the bug is in hydration.
 */
import { Home } from "./pages/home";
import { About } from "./pages/about";
import { Users } from "./pages/users";
import { User } from "./pages/user";

export class MyApp {
  // Register child components as dependencies
  static dependencies = [Home, About, Users, User];

  // Static routes configuration
  static routes = [
    { path: "", component: Home, title: "Home" },
    { path: "about", component: About, title: "About" },
    { path: "users", component: Users, title: "Users" },
    { path: "user/:id", component: User, title: "User" },
  ];

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
