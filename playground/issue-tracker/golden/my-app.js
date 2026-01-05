import { Dashboard } from "./pages/dashboard.js";
import { Issues } from "./pages/issues.js";
import { IssueDetail } from "./pages/issue-detail.js";
import { Settings } from "./pages/settings.js";
import { currentUser } from "./domain/data.js";
const myApp__e = [
  /* 0 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "currentUser",
      ancestor: 0
    },
    name: "name",
    optional: false
  },
  /* 1 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "currentUser",
      ancestor: 0
    },
    name: "avatar",
    optional: false
  }
];
const myApp_$au = {
  type: "custom-element",
  name: "my-app",
  template: '<!--\n  MyApp Template - Application Shell\n\n  Exercises:\n  - t="key" for static translations\n  - load="routeId" for navigation\n  - ${interpolation} for dynamic content\n  - ref for element references\n  - value.bind for two-way binding\n  - click.trigger for event handling\n  - au-viewport for router outlet\n-->\n\n<div class="app-shell">\n  <!-- Header with navigation -->\n  <header class="app-header">\n    <div style="display: flex; justify-content: space-between; align-items: center;">\n      <!--au--><h1></h1>\n\n      <!-- User info -->\n      <div style="display: flex; align-items: center; gap: 1rem;">\n        <span style="opacity: 0.8;"><!--au--> </span>\n        <div class="avatar"><!--au--> </div>\n      </div>\n    </div>\n\n    <!-- Navigation -->\n    <nav class="app-nav">\n      <!--au--><a load="dashboard"></a>\n      <!--au--><a load="issues"></a>\n      <!--au--><a load="settings"></a>\n    </nav>\n  </header>\n\n  <!-- Main content area -->\n  <main class="app-main">\n    <!--au--><au-viewport></au-viewport>\n  </main>\n</div>\n',
  instructions: [
    /* target 0 */
    [{ type: 100, from: { $kind: "PrimitiveLiteral", value: "app.title" }, to: "" }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [myApp__e[0]], isMulti: false, firstExpression: myApp__e[0] } }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [myApp__e[1]], isMulti: false, firstExpression: myApp__e[1] } }
    ],
    /* target 3 */
    [
      { type: 1, res: "load", props: [{ type: 10, value: "dashboard", to: "route" }] },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "nav.dashboard" }, to: "" }
    ],
    /* target 4 */
    [
      { type: 1, res: "load", props: [{ type: 10, value: "issues", to: "route" }] },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "nav.issues" }, to: "" }
    ],
    /* target 5 */
    [
      { type: 1, res: "load", props: [{ type: 10, value: "settings", to: "route" }] },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "nav.settings" }, to: "" }
    ],
    /* target 6 */
    [{ type: 0, res: "au-viewport", props: [] }]
  ],
  needsCompile: false
};
class MyApp {
  static $au = myApp_$au;
  // ==========================================================================
  // Dependencies - Register child components
  // ==========================================================================
  static dependencies = [Dashboard, Issues, IssueDetail, Settings];
  // ==========================================================================
  // Routes Configuration
  // ==========================================================================
  static routes = [
    {
      id: "dashboard",
      path: "",
      component: Dashboard,
      title: "Dashboard"
    },
    {
      id: "issues",
      path: "issues",
      component: Issues,
      title: "Issues"
    },
    {
      id: "issue",
      path: "issues/:id",
      component: IssueDetail,
      title: "Issue Details"
    },
    {
      id: "settings",
      path: "settings",
      component: Settings,
      title: "Settings"
    }
  ];
  // ==========================================================================
  // State
  // ==========================================================================
  /** Currently logged-in user */
  currentUser = currentUser;
  /** Search input ref for keyboard shortcut */
  searchInputRef = null;
  /** Global search query */
  searchQuery = "";
  // ==========================================================================
  // Methods
  // ==========================================================================
  /** Focus search input (Cmd+K shortcut) */
  focusSearch() {
    this.searchInputRef?.focus();
  }
  /** Handle global search */
  onSearch() {
    console.log("Search:", this.searchQuery);
  }
}
export {
  MyApp
};
