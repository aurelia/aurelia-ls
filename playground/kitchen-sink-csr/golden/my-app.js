import { Home } from "./pages/home.js";
import { About } from "./pages/about.js";
import { Users } from "./pages/users.js";
import { User } from "./pages/user.js";
const myApp__e = [
  /* 0 */
  // Binary
  {
    $kind: "Binary",
    operation: "*",
    left: {
      $kind: "AccessScope",
      name: "count",
      ancestor: 0
    },
    right: {
      $kind: "PrimitiveLiteral",
      value: 2
    }
  },
  /* 1 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "title",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "message",
    ancestor: 0
  },
  /* 3 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "count",
    ancestor: 0
  },
  /* 4 */
  // CallScope
  {
    $kind: "CallScope",
    name: "increment",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 5 */
  // CallScope
  {
    $kind: "CallScope",
    name: "decrement",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 6 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggle",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 7 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "showContent",
    ancestor: 0
  },
  /* 8 */
  // CallScope
  {
    $kind: "CallScope",
    name: "addItem",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 9 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "item",
    ancestor: 0
  },
  /* 10 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "item"
    },
    iterable: {
      $kind: "AccessScope",
      name: "items",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 11 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "inputRef",
    ancestor: 0
  },
  /* 12 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "inputValue",
    ancestor: 0
  },
  /* 13 */
  // CallScope
  {
    $kind: "CallScope",
    name: "focusInput",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 14 */
  // CallScope
  {
    $kind: "CallScope",
    name: "cycleStatus",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 15 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "loading"
  },
  /* 16 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "success"
  },
  /* 17 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "error"
  },
  /* 18 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "status",
    ancestor: 0
  },
  /* 19 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "computed",
    ancestor: 0
  }
];
const myApp__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div data-testid="if-true">Content is visible</div>',
  instructions: [],
  needsCompile: false
};
const myApp__def_1 = {
  name: "else_1",
  type: "custom-element",
  template: '<div data-testid="if-false">Content is hidden</div>',
  instructions: [],
  needsCompile: false
};
const myApp__def_2 = {
  name: "repeat_2",
  type: "custom-element",
  template: '<li data-testid="item"><!--au--> </li>',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [myApp__e[9]], isMulti: false, firstExpression: myApp__e[9] } }
    ]
  ],
  needsCompile: false
};
const myApp__def_4 = {
  name: "case_4",
  type: "custom-element",
  template: '<span data-testid="status-loading">Loading...</span>',
  instructions: [],
  needsCompile: false
};
const myApp__def_5 = {
  name: "case_5",
  type: "custom-element",
  template: '<span data-testid="status-success">Success!</span>',
  instructions: [],
  needsCompile: false
};
const myApp__def_6 = {
  name: "case_6",
  type: "custom-element",
  template: '<span data-testid="status-error">Error!</span>',
  instructions: [],
  needsCompile: false
};
const myApp__def_3 = {
  name: "switch_3",
  type: "custom-element",
  template: "<div>\n        <!--au--><!--au-start--><!--au-end-->\n        <!--au--><!--au-start--><!--au-end-->\n        <!--au--><!--au-start--><!--au-end-->\n      </div>",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: myApp__def_4, res: "case", props: [{ type: 12, from: myApp__e[15], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [
      { type: 2, def: myApp__def_5, res: "case", props: [{ type: 12, from: myApp__e[16], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 2, def: myApp__def_6, res: "case", props: [{ type: 12, from: myApp__e[17], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const myApp_$au = {
  type: "custom-element",
  name: "my-app",
  template: '<div class="kitchen-sink">\n  <!-- Navigation -->\n  <header data-testid="header">\n    <h1 data-testid="title"><!--au--> </h1>\n    <nav data-testid="nav">\n      <!--au--><a data-testid="nav-home" load="home">Home</a>\n      <!--au--><a data-testid="nav-about" load="about">About</a>\n      <!--au--><a data-testid="nav-users" load="users">Users</a>\n    </nav>\n  </header>\n\n  <!-- Router viewport -->\n  <main data-testid="main">\n    <!--au--><au-viewport></au-viewport>\n  </main>\n\n  <hr>\n\n  <!-- Feature demos (kept inline for golden testing) -->\n  <section class="features" data-testid="features-section">\n    <h2>Feature Demos</h2>\n\n    <!-- Basic interpolation -->\n    <p data-testid="message"><!--au--> </p>\n\n    <!-- Property binding + event handler -->\n    <section data-testid="counter-section">\n      <span data-testid="count"><!--au--> </span>\n      <!--au--><button data-testid="increment">+</button>\n      <!--au--><button data-testid="decrement">-</button>\n    </section>\n\n    <!-- if/else -->\n    <section data-testid="if-section">\n      <!--au--><button data-testid="toggle">Toggle</button>\n      <!--au--><!--au-start--><!--au-end-->\n      <!--au--><!--au-start--><!--au-end-->\n    </section>\n\n    <!-- repeat.for with array -->\n    <section data-testid="repeat-section">\n      <!--au--><button data-testid="add-item">Add Item</button>\n      <ul data-testid="items-list">\n        <!--au--><!--au-start--><!--au-end-->\n      </ul>\n    </section>\n\n    <!-- ref binding -->\n    <section data-testid="ref-section">\n      <!--au--><input data-testid="ref-input" ref="inputRef">\n      <!--au--><button data-testid="focus-btn">Focus</button>\n    </section>\n\n    <!-- switch/case -->\n    <section data-testid="switch-section">\n      <!--au--><button data-testid="cycle-status">Cycle</button>\n      <!--au--><!--au-start--><!--au-end-->\n    </section>\n\n    <!-- let element (computed values) -->\n    <section data-testid="let-section">\n      <!--au--><let></let>\n      <span data-testid="computed-value"><!--au--> </span>\n    </section>\n  </section>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [myApp__e[1]], isMulti: false, firstExpression: myApp__e[1] } }
    ],
    /* target 1 */
    [{ type: 1, res: "load", props: [{ type: 10, value: "home", to: "route" }] }],
    /* target 2 */
    [{ type: 1, res: "load", props: [{ type: 10, value: "about", to: "route" }] }],
    /* target 3 */
    [{ type: 1, res: "load", props: [{ type: 10, value: "users", to: "route" }] }],
    /* target 4 */
    [{ type: 0, res: "au-viewport", props: [] }],
    /* target 5 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [myApp__e[2]], isMulti: false, firstExpression: myApp__e[2] } }
    ],
    /* target 6 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["Count: ", ""], expressions: [myApp__e[3]], isMulti: false, firstExpression: myApp__e[3] } }
    ],
    /* target 7 */
    [{ type: 31, from: myApp__e[4], to: "click", capture: false }],
    /* target 8 */
    [{ type: 31, from: myApp__e[5], to: "click", capture: false }],
    /* target 9 */
    [{ type: 31, from: myApp__e[6], to: "click", capture: false }],
    /* target 10 */
    [
      { type: 2, def: myApp__def_0, res: "if", props: [{ type: 12, from: myApp__e[7], to: "value", mode: 2 }] }
    ],
    /* target 11 */
    [{ type: 2, def: myApp__def_1, res: "else", props: [] }],
    /* target 12 */
    [{ type: 31, from: myApp__e[8], to: "click", capture: false }],
    /* target 13 */
    [
      { type: 2, def: myApp__def_2, res: "repeat", props: [{ forOf: myApp__e[10], to: "items", props: [], type: 15 }] }
    ],
    /* target 14 */
    [
      { type: 14, from: myApp__e[11], to: "element" },
      { type: 12, from: myApp__e[12], to: "value", mode: 6 }
    ],
    /* target 15 */
    [{ type: 31, from: myApp__e[13], to: "click", capture: false }],
    /* target 16 */
    [{ type: 31, from: myApp__e[14], to: "click", capture: false }],
    /* target 17 */
    [
      { type: 2, def: myApp__def_3, res: "switch", props: [{ type: 12, from: myApp__e[18], to: "value", mode: 2 }] }
    ],
    /* target 18 */
    [
      { type: 3, instructions: [{ type: 13, to: "computed", from: myApp__e[0] }], toBindingContext: false }
    ],
    /* target 19 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["Doubled: ", ""], expressions: [myApp__e[19]], isMulti: false, firstExpression: myApp__e[19] } }
    ]
  ],
  needsCompile: false
};
class MyApp {
  static $au = myApp_$au;
  // Register child components as dependencies
  static dependencies = [Home, About, Users, User];
  // Static routes configuration
  // Use `id` for the load attribute: load="home" matches id: "home"
  static routes = [
    { id: "home", path: "", component: Home, title: "Home" },
    { id: "about", path: "about", component: About, title: "About" },
    { id: "users", path: "users", component: Users, title: "Users" },
    { id: "user", path: "user/:id", component: User, title: "User" }
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
    { name: "Charlie", active: true }
  ];
  // For if/else
  showContent = true;
  // For switch
  status = "success";
  // For with
  user = { name: "Demo User", email: "demo@example.com" };
  // For ref
  inputRef = null;
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
    const states = ["loading", "success", "error"];
    const idx = states.indexOf(this.status);
    this.status = states[(idx + 1) % states.length];
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
export {
  MyApp
};
