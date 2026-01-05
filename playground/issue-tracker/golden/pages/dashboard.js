import { issues, currentUser, getIssuesByAssignee } from "../domain/data.js";
import { calculateStats } from "../domain/types.js";
import { StatusBadge } from "../components/status-badge.js";
import { PriorityIcon } from "../components/priority-icon.js";
import { UserAvatar } from "../components/user-avatar.js";
const dashboard__e = [
  /* 0 */
  // ObjectLiteral
  {
    $kind: "ObjectLiteral",
    keys: [
      "name"
    ],
    values: [
      {
        $kind: "AccessMember",
        object: {
          $kind: "AccessScope",
          name: "user",
          ancestor: 0
        },
        name: "name",
        optional: false
      }
    ]
  },
  /* 1 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "stats",
      ancestor: 0
    },
    name: "total",
    optional: false
  },
  /* 2 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "stats",
      ancestor: 0
    },
    name: "open",
    optional: false
  },
  /* 3 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "stats",
      ancestor: 0
    },
    name: "inProgress",
    optional: false
  },
  /* 4 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "stats",
      ancestor: 0
    },
    name: "review",
    optional: false
  },
  /* 5 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "stats",
      ancestor: 0
    },
    name: "closed",
    optional: false
  },
  /* 6 */
  // Unary
  {
    $kind: "Unary",
    operation: "!",
    expression: {
      $kind: "AccessScope",
      name: "hasRecentIssues",
      ancestor: 0
    },
    pos: 0
  },
  /* 7 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "status",
    optional: false
  },
  /* 8 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "title",
    optional: false
  },
  /* 9 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "priority",
    optional: false
  },
  /* 10 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "assignee",
    optional: false
  },
  /* 11 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "issue"
    },
    iterable: {
      $kind: "AccessScope",
      name: "recentIssues",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 12 */
  // Unary
  {
    $kind: "Unary",
    operation: "!",
    expression: {
      $kind: "AccessScope",
      name: "hasMyIssues",
      ancestor: 0
    },
    pos: 0
  },
  /* 13 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "issue"
    },
    iterable: {
      $kind: "AccessScope",
      name: "myIssues",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 14 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "issue"
    },
    iterable: {
      $kind: "AccessScope",
      name: "criticalIssues",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 15 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "hasCriticalIssues",
    ancestor: 0
  }
];
const dashboard__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div class="empty-state">\n      <div class="empty-state-icon">\u{1F4CB}</div>\n      <!--au--><p></p>\n    </div>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.empty.noActivity"
      }
    ]
  ],
  needsCompile: false
};
const dashboard__def_3 = {
  name: "if_3",
  type: "custom-element",
  template: "<!--au--><user-avatar></user-avatar>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: dashboard__e[10], to: "user", mode: 2 }]
  ],
  needsCompile: false
};
const dashboard__def_2 = {
  name: "repeat_2",
  type: "custom-element",
  template: '<li class="issue-item">\n        <!--au--><status-badge></status-badge>\n        <div class="issue-title">\n          <!--au--><a load="issue/${issue.id}"><!--au--> </a>\n        </div>\n        <!--au--><priority-icon></priority-icon>\n        <!--au--><!--au-start--><!--au-end-->\n      </li>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: dashboard__e[7], to: "status", mode: 2 }],
    /* target 1 */
    [{ type: 1, res: "load", props: [] }],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[8]], isMulti: false, firstExpression: dashboard__e[8] } }
    ],
    /* target 3 */
    [{ type: 12, from: dashboard__e[9], to: "priority", mode: 2 }],
    /* target 4 */
    [
      { type: 2, def: dashboard__def_3, res: "if", props: [{ type: 12, from: dashboard__e[10], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const dashboard__def_1 = {
  name: "else_1",
  type: "custom-element",
  template: '<ul class="issue-list">\n      <!--au--><!--au-start--><!--au-end-->\n    </ul>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: dashboard__def_2, res: "repeat", props: [{ forOf: dashboard__e[11], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
const dashboard__def_4 = {
  name: "if_4",
  type: "custom-element",
  template: '<div class="empty-state">\n      <div class="empty-state-icon">\u2728</div>\n      <!--au--><p></p>\n    </div>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.empty.noAssigned"
      }
    ]
  ],
  needsCompile: false
};
const dashboard__def_6 = {
  name: "repeat_6",
  type: "custom-element",
  template: '<li class="issue-item">\n        <!--au--><status-badge></status-badge>\n        <div class="issue-title">\n          <!--au--><a load="issue/${issue.id}"><!--au--> </a>\n        </div>\n        <!--au--><priority-icon></priority-icon>\n      </li>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: dashboard__e[7], to: "status", mode: 2 }],
    /* target 1 */
    [{ type: 1, res: "load", props: [] }],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[8]], isMulti: false, firstExpression: dashboard__e[8] } }
    ],
    /* target 3 */
    [{ type: 12, from: dashboard__e[9], to: "priority", mode: 2 }]
  ],
  needsCompile: false
};
const dashboard__def_5 = {
  name: "else_5",
  type: "custom-element",
  template: '<ul class="issue-list">\n      <!--au--><!--au-start--><!--au-end-->\n    </ul>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: dashboard__def_6, res: "repeat", props: [{ forOf: dashboard__e[13], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
const dashboard__def_9 = {
  name: "if_9",
  type: "custom-element",
  template: "<!--au--><user-avatar></user-avatar>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: dashboard__e[10], to: "user", mode: 2 }]
  ],
  needsCompile: false
};
const dashboard__def_8 = {
  name: "repeat_8",
  type: "custom-element",
  template: '<li class="issue-item">\n        <!--au--><status-badge></status-badge>\n        <div class="issue-title">\n          <!--au--><a load="issue/${issue.id}"><!--au--> </a>\n        </div>\n        <!--au--><priority-icon></priority-icon>\n        <!--au--><!--au-start--><!--au-end-->\n      </li>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: dashboard__e[7], to: "status", mode: 2 }],
    /* target 1 */
    [{ type: 1, res: "load", props: [] }],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[8]], isMulti: false, firstExpression: dashboard__e[8] } }
    ],
    /* target 3 */
    [{ type: 12, from: dashboard__e[9], to: "priority", mode: 2 }],
    /* target 4 */
    [
      { type: 2, def: dashboard__def_9, res: "if", props: [{ type: 12, from: dashboard__e[10], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const dashboard__def_7 = {
  name: "if_7",
  type: "custom-element",
  template: '<section class="card" data-testid="critical-issues">\n    <div class="card-header">\n      <!--au--><h3 class="card-title"></h3>\n    </div>\n\n    <ul class="issue-list">\n      <!--au--><!--au-start--><!--au-end-->\n    </ul>\n  </section>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.sections.criticalIssues"
      }
    ],
    /* target 1 */
    [
      { type: 2, def: dashboard__def_8, res: "repeat", props: [{ forOf: dashboard__e[14], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
const dashboard_$au = {
  type: "custom-element",
  name: "dashboard",
  template: '<!--\n  Dashboard Page Template\n\n  Exercises:\n  - t="key" for labels\n  - t with params for welcome message\n  - ${interpolation} for stats\n  - repeat.for for lists\n  - if.bind / else for empty states\n  - Custom elements (status-badge, priority-icon)\n  - load="issue/${id}" for parameterized routes\n-->\n\n<div class="page dashboard-page" data-testid="dashboard">\n  <!-- Welcome message with i18n parameter -->\n  <!--au--><h2></h2>\n\n  <!-- Stats grid -->\n  <div class="stats-grid" data-testid="stats-grid">\n    <div class="stat-card">\n      <div class="stat-value"><!--au--> </div>\n      <!--au--><div class="stat-label"></div>\n    </div>\n    <div class="stat-card">\n      <div class="stat-value"><!--au--> </div>\n      <!--au--><div class="stat-label"></div>\n    </div>\n    <div class="stat-card">\n      <div class="stat-value"><!--au--> </div>\n      <!--au--><div class="stat-label"></div>\n    </div>\n    <div class="stat-card">\n      <div class="stat-value"><!--au--> </div>\n      <!--au--><div class="stat-label"></div>\n    </div>\n    <div class="stat-card">\n      <div class="stat-value"><!--au--> </div>\n      <!--au--><div class="stat-label"></div>\n    </div>\n  </div>\n\n  <!-- Recent Activity -->\n  <section class="card" data-testid="recent-activity">\n    <div class="card-header">\n      <!--au--><h3 class="card-title"></h3>\n      <!--au--><a class="btn btn-ghost" load="issues"></a>\n    </div>\n\n    <!-- Empty state -->\n    <!--au--><!--au-start--><!--au-end-->\n\n    <!-- Issue list -->\n    <!--au--><!--au-start--><!--au-end-->\n  </section>\n\n  <!-- My Issues -->\n  <section class="card" data-testid="my-issues">\n    <div class="card-header">\n      <!--au--><h3 class="card-title"></h3>\n    </div>\n\n    <!--au--><!--au-start--><!--au-end-->\n\n    <!--au--><!--au-start--><!--au-end-->\n  </section>\n\n  <!-- Critical Issues -->\n  <!--au--><!--au-start--><!--au-end-->\n</div>\n',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.welcome"
      },
      { type: 12, from: dashboard__e[0], to: "t.params", mode: 2 }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[1]], isMulti: false, firstExpression: dashboard__e[1] } }
    ],
    /* target 2 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.stats.total"
      }
    ],
    /* target 3 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[2]], isMulti: false, firstExpression: dashboard__e[2] } }
    ],
    /* target 4 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.stats.open"
      }
    ],
    /* target 5 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[3]], isMulti: false, firstExpression: dashboard__e[3] } }
    ],
    /* target 6 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.stats.inProgress"
      }
    ],
    /* target 7 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[4]], isMulti: false, firstExpression: dashboard__e[4] } }
    ],
    /* target 8 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.stats.review"
      }
    ],
    /* target 9 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [dashboard__e[5]], isMulti: false, firstExpression: dashboard__e[5] } }
    ],
    /* target 10 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.stats.closed"
      }
    ],
    /* target 11 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.sections.recentActivity"
      }
    ],
    /* target 12 */
    [
      { type: 1, res: "load", props: [{ type: 10, value: "issues", to: "route" }] },
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "actions.viewAll"
      }
    ],
    /* target 13 */
    [
      { type: 2, def: dashboard__def_0, res: "if", props: [{ type: 12, from: dashboard__e[6], to: "value", mode: 2 }] }
    ],
    /* target 14 */
    [{ type: 2, def: dashboard__def_1, res: "else", props: [] }],
    /* target 15 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "dashboard.sections.myIssues"
      }
    ],
    /* target 16 */
    [
      { type: 2, def: dashboard__def_4, res: "if", props: [{ type: 12, from: dashboard__e[12], to: "value", mode: 2 }] }
    ],
    /* target 17 */
    [{ type: 2, def: dashboard__def_5, res: "else", props: [] }],
    /* target 18 */
    [
      { type: 2, def: dashboard__def_7, res: "if", props: [{ type: 12, from: dashboard__e[15], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class Dashboard {
  static $au = dashboard_$au;
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar];
  // ==========================================================================
  // State
  // ==========================================================================
  /** Current user for welcome message */
  user = currentUser;
  /** Calculated statistics */
  stats = calculateStats(issues);
  /** Recent issues (last 5 updated) */
  recentIssues = [...issues].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
  /** Issues assigned to current user */
  myIssues = getIssuesByAssignee(currentUser.id);
  /** Critical issues (high or critical priority, not closed) */
  criticalIssues = issues.filter(
    (i) => (i.priority === "high" || i.priority === "critical") && i.status !== "closed"
  );
  // ==========================================================================
  // Computed
  // ==========================================================================
  /** Check if there are any issues to show */
  get hasRecentIssues() {
    return this.recentIssues.length > 0;
  }
  get hasMyIssues() {
    return this.myIssues.length > 0;
  }
  get hasCriticalIssues() {
    return this.criticalIssues.length > 0;
  }
}
export {
  Dashboard
};
