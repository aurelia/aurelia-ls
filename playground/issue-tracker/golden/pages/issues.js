import { issues as allIssues, users, filterIssues } from "../domain/data.js";
import { StatusBadge } from "../components/status-badge.js";
import { PriorityIcon } from "../components/priority-icon.js";
import { UserAvatar } from "../components/user-avatar.js";
import { LabelList } from "../components/label-list.js";
import { EmptyState } from "../components/empty-state.js";
const issues__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "issueCount",
    ancestor: 0
  },
  /* 1 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "searchQuery",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "statusFilter",
    ancestor: 0
  },
  /* 3 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "opt",
      ancestor: 0
    },
    name: "value",
    optional: false
  },
  /* 4 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "opt",
      ancestor: 0
    },
    name: "label",
    optional: false
  },
  /* 5 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "statusOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 6 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "priorityFilter",
    ancestor: 0
  },
  /* 7 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "priorityOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 8 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "typeFilter",
    ancestor: 0
  },
  /* 9 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "typeOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 10 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "assigneeFilter",
    ancestor: 0
  },
  /* 11 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "user",
      ancestor: 0
    },
    name: "id",
    optional: false
  },
  /* 12 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "user",
      ancestor: 0
    },
    name: "name",
    optional: false
  },
  /* 13 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "user"
    },
    iterable: {
      $kind: "AccessScope",
      name: "teamMembers",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 14 */
  // CallScope
  {
    $kind: "CallScope",
    name: "clearFilters",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 15 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "hasActiveFilters",
    ancestor: 0
  },
  /* 16 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "showFilters",
    ancestor: 0
  },
  /* 17 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "No issues found"
  },
  /* 18 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "Try adjusting your filters or create a new issue"
  },
  /* 19 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "isEmpty",
    ancestor: 0
  },
  /* 20 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "id",
    optional: false
  },
  /* 21 */
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
  /* 22 */
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
  /* 23 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "labels",
    optional: false
  },
  /* 24 */
  // Binary
  {
    $kind: "Binary",
    operation: ">",
    left: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessMember",
        object: {
          $kind: "AccessScope",
          name: "issue",
          ancestor: 0
        },
        name: "labels",
        optional: false
      },
      name: "length",
      optional: false
    },
    right: {
      $kind: "PrimitiveLiteral",
      value: 0
    }
  },
  /* 25 */
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
  /* 26 */
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
  /* 27 */
  // Unary
  {
    $kind: "Unary",
    operation: "!",
    expression: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessScope",
        name: "issue",
        ancestor: 0
      },
      name: "assignee",
      optional: false
    },
    pos: 0
  },
  /* 28 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "issue"
    },
    iterable: {
      $kind: "AccessScope",
      name: "filteredIssues",
      ancestor: 0
    },
    semiIdx: -1
  }
];
const issues__def_1 = {
  name: "repeat_1",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[3], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issues__e[4]], isMulti: false, firstExpression: issues__e[4] } }
    ]
  ],
  needsCompile: false
};
const issues__def_2 = {
  name: "repeat_2",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[3], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issues__e[4]], isMulti: false, firstExpression: issues__e[4] } }
    ]
  ],
  needsCompile: false
};
const issues__def_3 = {
  name: "repeat_3",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[3], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issues__e[4]], isMulti: false, firstExpression: issues__e[4] } }
    ]
  ],
  needsCompile: false
};
const issues__def_4 = {
  name: "repeat_4",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[11], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issues__e[12]], isMulti: false, firstExpression: issues__e[12] } }
    ]
  ],
  needsCompile: false
};
const issues__def_5 = {
  name: "if_5",
  type: "custom-element",
  template: '<!--au--><button class="btn btn-ghost" data-testid="clear-filters"></button>',
  instructions: [
    /* target 0 */
    [
      { type: 31, from: issues__e[14], to: "click", capture: false },
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "issues.filters.clear"
      }
    ]
  ],
  needsCompile: false
};
const issues__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div class="card" style="margin-bottom: 1rem;" data-testid="filters">\n    <div class="filters">\n      <!-- Search -->\n      <div class="filter-group" style="flex: 1;">\n        <!--au--><input type="text" class="form-input" placeholder="Search issues..." data-testid="search-input">\n      </div>\n\n      <!-- Status filter -->\n      <div class="filter-group">\n        <!--au--><select class="form-input" data-testid="status-filter">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <!-- Priority filter -->\n      <div class="filter-group">\n        <!--au--><select class="form-input" data-testid="priority-filter">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <!-- Type filter -->\n      <div class="filter-group">\n        <!--au--><select class="form-input" data-testid="type-filter">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <!-- Assignee filter -->\n      <div class="filter-group">\n        <!--au--><select class="form-input" data-testid="assignee-filter">\n          <option value="all">All Assignees</option>\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <!-- Clear filters -->\n      <!--au--><!--au-start--><!--au-end-->\n    </div>\n  </div>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[1], to: "value", mode: 6 }],
    /* target 1 */
    [{ type: 12, from: issues__e[2], to: "value", mode: 6 }],
    /* target 2 */
    [
      { type: 2, def: issues__def_1, res: "repeat", props: [{ forOf: issues__e[5], to: "items", props: [], type: 15 }] }
    ],
    /* target 3 */
    [{ type: 12, from: issues__e[6], to: "value", mode: 6 }],
    /* target 4 */
    [
      { type: 2, def: issues__def_2, res: "repeat", props: [{ forOf: issues__e[7], to: "items", props: [], type: 15 }] }
    ],
    /* target 5 */
    [{ type: 12, from: issues__e[8], to: "value", mode: 6 }],
    /* target 6 */
    [
      { type: 2, def: issues__def_3, res: "repeat", props: [{ forOf: issues__e[9], to: "items", props: [], type: 15 }] }
    ],
    /* target 7 */
    [{ type: 12, from: issues__e[10], to: "value", mode: 6 }],
    /* target 8 */
    [
      { type: 2, def: issues__def_4, res: "repeat", props: [{ forOf: issues__e[13], to: "items", props: [], type: 15 }] }
    ],
    /* target 9 */
    [
      { type: 2, def: issues__def_5, res: "if", props: [{ type: 12, from: issues__e[15], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const issues__def_6 = {
  name: "if_6",
  type: "custom-element",
  template: '<!--au--><empty-state icon="\u{1F50D}" data-testid="empty-state"></empty-state>',
  instructions: [
    /* target 0 */
    [
      { type: 12, from: issues__e[17], to: "title", mode: 2 },
      { type: 12, from: issues__e[18], to: "description", mode: 2 }
    ]
  ],
  needsCompile: false
};
const issues__def_9 = {
  name: "if_9",
  type: "custom-element",
  template: "<!--au--><label-list></label-list>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[23], to: "labels", mode: 2 }]
  ],
  needsCompile: false
};
const issues__def_10 = {
  name: "if_10",
  type: "custom-element",
  template: '<!--au--><user-avatar size="small"></user-avatar>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: issues__e[26], to: "user", mode: 2 }]
  ],
  needsCompile: false
};
const issues__def_11 = {
  name: "if_11",
  type: "custom-element",
  template: '<!--au--><span style="color: #999;"></span>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "issue.meta.unassigned"
      }
    ]
  ],
  needsCompile: false
};
const issues__def_8 = {
  name: "repeat_8",
  type: "custom-element",
  template: '<!--au--><li class="issue-item">\n        <!-- Status badge -->\n        <!--au--><status-badge></status-badge>\n\n        <!-- Issue info -->\n        <div class="issue-title">\n          <!--au--><a load="issue/${issue.id}">\n            <span style="color: #666; margin-right: 0.5rem;"><!--au--> </span><!--au--> </a>\n        </div>\n\n        <!-- Labels -->\n        <!--au--><!--au-start--><!--au-end-->\n\n        <!-- Meta -->\n        <div class="issue-meta">\n          <!--au--><priority-icon></priority-icon>\n          <!--au--><!--au-start--><!--au-end-->\n          <!--au--><!--au-start--><!--au-end-->\n        </div>\n      </li>',
  instructions: [
    /* target 0 */
    [
      { type: 11, to: "data-testid", from: { $kind: "Interpolation", parts: ["issue-item-", ""], expressions: [issues__e[20]], isMulti: false, firstExpression: issues__e[20] } }
    ],
    /* target 1 */
    [{ type: 12, from: issues__e[21], to: "status", mode: 2 }],
    /* target 2 */
    [{ type: 1, res: "load", props: [] }],
    /* target 3 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issues__e[20]], isMulti: false, firstExpression: issues__e[20] } }
    ],
    /* target 4 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["\n            ", "\n          "], expressions: [issues__e[22]], isMulti: false, firstExpression: issues__e[22] } }
    ],
    /* target 5 */
    [
      { type: 2, def: issues__def_9, res: "if", props: [{ type: 12, from: issues__e[24], to: "value", mode: 2 }] }
    ],
    /* target 6 */
    [{ type: 12, from: issues__e[25], to: "priority", mode: 2 }],
    /* target 7 */
    [
      { type: 2, def: issues__def_10, res: "if", props: [{ type: 12, from: issues__e[26], to: "value", mode: 2 }] }
    ],
    /* target 8 */
    [
      { type: 2, def: issues__def_11, res: "if", props: [{ type: 12, from: issues__e[27], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const issues__def_7 = {
  name: "else_7",
  type: "custom-element",
  template: '<ul class="issue-list" data-testid="issue-list">\n      <!--au--><!--au-start--><!--au-end-->\n    </ul>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: issues__def_8, res: "repeat", props: [{ forOf: issues__e[28], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
const issues_$au = {
  type: "custom-element",
  name: "issues",
  template: '<!--\n  Issues Page Template\n\n  Exercises:\n  - value.bind for form inputs\n  - repeat.for for filter options and issue list\n  - if.bind / else for conditional rendering\n  - click.trigger for actions\n  - class.bind for dynamic classes\n  - t="key" for labels\n  - Custom elements (status-badge, priority-icon, user-avatar, label-list, empty-state)\n  - load="route/${param}" for parameterized navigation\n-->\n\n<div class="page issues-page" data-testid="issues">\n  <!-- Page header -->\n  <div class="card-header" style="margin-bottom: 1rem;">\n    <!--au--><h2 class="card-title"></h2>\n    <span style="color: #666;"><!--au--> </span>\n  </div>\n\n  <!-- Filters -->\n  <!--au--><!--au-start--><!--au-end-->\n\n  <!-- Issue list -->\n  <div class="card">\n    <!-- Empty state -->\n    <!--au--><!--au-start--><!--au-end-->\n\n    <!-- Issues -->\n    <!--au--><!--au-start--><!--au-end-->\n  </div>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        isExpression: false,
        keyValue: "issues.title"
      }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", " issues"], expressions: [issues__e[0]], isMulti: false, firstExpression: issues__e[0] } }
    ],
    /* target 2 */
    [
      { type: 2, def: issues__def_0, res: "if", props: [{ type: 12, from: issues__e[16], to: "value", mode: 2 }] }
    ],
    /* target 3 */
    [
      { type: 2, def: issues__def_6, res: "if", props: [{ type: 12, from: issues__e[19], to: "value", mode: 2 }] }
    ],
    /* target 4 */
    [{ type: 2, def: issues__def_7, res: "else", props: [] }]
  ],
  needsCompile: false
};
class Issues {
  static $au = issues_$au;
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar, LabelList, EmptyState];
  // ==========================================================================
  // State
  // ==========================================================================
  /** All available issues */
  allIssues = allIssues;
  /** Team members for assignee filter */
  teamMembers = users;
  /** Filter state */
  searchQuery = "";
  statusFilter = "all";
  priorityFilter = "all";
  typeFilter = "all";
  assigneeFilter = "all";
  /** Show/hide filter panel */
  showFilters = true;
  // ==========================================================================
  // Filter Options (for dropdowns)
  // ==========================================================================
  statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "In Review" },
    { value: "closed", label: "Closed" }
  ];
  priorityOptions = [
    { value: "all", label: "All Priorities" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
  ];
  typeOptions = [
    { value: "all", label: "All Types" },
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature" },
    { value: "task", label: "Task" }
  ];
  // ==========================================================================
  // Computed
  // ==========================================================================
  /** Filtered issues based on current filter state */
  get filteredIssues() {
    return filterIssues(this.allIssues, {
      status: this.statusFilter,
      priority: this.priorityFilter,
      type: this.typeFilter,
      assignee: this.assigneeFilter,
      search: this.searchQuery
    });
  }
  /** Issue count for display */
  get issueCount() {
    return this.filteredIssues.length;
  }
  /** Check if any filters are active */
  get hasActiveFilters() {
    return this.searchQuery !== "" || this.statusFilter !== "all" || this.priorityFilter !== "all" || this.typeFilter !== "all" || this.assigneeFilter !== "all";
  }
  /** Check if filtered list is empty */
  get isEmpty() {
    return this.filteredIssues.length === 0;
  }
  // ==========================================================================
  // Methods
  // ==========================================================================
  /** Toggle filter panel visibility */
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }
  /** Clear all filters */
  clearFilters() {
    this.searchQuery = "";
    this.statusFilter = "all";
    this.priorityFilter = "all";
    this.typeFilter = "all";
    this.assigneeFilter = "all";
  }
}
export {
  Issues
};
