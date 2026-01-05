import { resolve } from "@aurelia/kernel";
import { IRouter } from "@aurelia/router";
import { getIssueById, users } from "../domain/data.js";
import {
  getNextStatuses,
  canTransition,
  createComment
} from "../domain/types.js";
import { StatusBadge } from "../components/status-badge.js";
import { PriorityIcon } from "../components/priority-icon.js";
import { UserAvatar } from "../components/user-avatar.js";
import { LabelList } from "../components/label-list.js";
import { TimeAgo } from "../components/time-ago.js";
import { EmptyState } from "../components/empty-state.js";
const issueDetail__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "isLoading",
    ancestor: 0
  },
  /* 1 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "notFound",
    ancestor: 0
  },
  /* 2 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "Issue not found"
  },
  /* 3 */
  // BadExpression
  {
    $kind: "BadExpression",
    text: "",
    message: "Unexpected token after end of expression",
    origin: {
      origin: {
        kind: "authored",
        trace: [
          {
            by: "parse"
          }
        ]
      },
      fallbackSpan: {
        file: "playground/issue-tracker/src/pages/issue-detail.html"
      }
    }
  },
  /* 4 */
  // CallScope
  {
    $kind: "CallScope",
    name: "goBack",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 5 */
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
  /* 6 */
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
  /* 7 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "type",
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
    name: "id",
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
    name: "createdAt",
    optional: false
  },
  /* 11 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "updatedAt",
    optional: false
  },
  /* 12 */
  // AccessThis
  {
    $kind: "AccessThis",
    ancestor: 0
  },
  /* 13 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "name",
    ancestor: 0
  },
  /* 14 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "reporter",
    optional: false
  },
  /* 15 */
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
  /* 16 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessScope",
      name: "isOverdue",
      ancestor: 0
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "badge badge-critical"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 17 */
  // CallMember
  {
    $kind: "CallMember",
    object: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessScope",
        name: "issue",
        ancestor: 0
      },
      name: "dueDate",
      optional: false
    },
    name: "toLocaleDateString",
    args: [],
    optionalMember: false,
    optionalCall: false
  },
  /* 18 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "hasDueDate",
    ancestor: 0
  },
  /* 19 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "issue",
      ancestor: 0
    },
    name: "storyPoints",
    optional: false
  },
  /* 20 */
  // Binary
  {
    $kind: "Binary",
    operation: ">",
    left: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessScope",
        name: "issue",
        ancestor: 0
      },
      name: "storyPoints",
      optional: false
    },
    right: {
      $kind: "PrimitiveLiteral",
      value: 0
    }
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
    name: "labels",
    optional: false
  },
  /* 22 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "hasLabels",
    ancestor: 0
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
    name: "description",
    optional: false
  },
  /* 24 */
  // CallScope
  {
    $kind: "CallScope",
    name: "changeStatus",
    args: [
      {
        $kind: "AccessScope",
        name: "nextStatus",
        ancestor: 0
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 25 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "nextStatus",
    ancestor: 0
  },
  /* 26 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "open"
  },
  /* 27 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "in_progress"
  },
  /* 28 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "review"
  },
  /* 29 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "closed"
  },
  /* 30 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "nextStatus"
    },
    iterable: {
      $kind: "AccessScope",
      name: "availableTransitions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 31 */
  // Unary
  {
    $kind: "Unary",
    operation: "!",
    expression: {
      $kind: "AccessScope",
      name: "hasComments",
      ancestor: 0
    },
    pos: 0
  },
  /* 32 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "comment",
      ancestor: 0
    },
    name: "id",
    optional: false
  },
  /* 33 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "comment",
      ancestor: 0
    },
    name: "author",
    optional: false
  },
  /* 34 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessScope",
        name: "comment",
        ancestor: 0
      },
      name: "author",
      optional: false
    },
    name: "name",
    optional: false
  },
  /* 35 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "comment",
      ancestor: 0
    },
    name: "createdAt",
    optional: false
  },
  /* 36 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "comment",
      ancestor: 0
    },
    name: "content",
    optional: false
  },
  /* 37 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "comment"
    },
    iterable: {
      $kind: "AccessMember",
      object: {
        $kind: "AccessScope",
        name: "issue",
        ancestor: 0
      },
      name: "comments",
      optional: false
    },
    semiIdx: -1
  },
  /* 38 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "newComment",
    ancestor: 0
  },
  /* 39 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "Add a comment..."
  },
  /* 40 */
  // CallScope
  {
    $kind: "CallScope",
    name: "addComment",
    args: [],
    ancestor: 0,
    optional: false
  }
];
const issueDetail__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div class="card" data-testid="loading">\n    <!--au--><p></p>\n  </div>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "app.loading"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_2 = {
  name: "with_2",
  type: "custom-element",
  template: '<div>\n          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Reporter</div>\n          <div style="display: flex; align-items: center; gap: 0.5rem;">\n            <!--au--><user-avatar></user-avatar>\n            <span><!--au--> </span>\n          </div>\n        </div>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: issueDetail__e[12], to: "user", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[13]], isMulti: false, firstExpression: issueDetail__e[13] } }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_3 = {
  name: "if_3",
  type: "custom-element",
  template: "<!---->",
  instructions: [],
  needsCompile: false
};
const issueDetail__def_4 = {
  name: "else_4",
  type: "custom-element",
  template: '<!--au--><span style="color: #999;"></span>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.meta.unassigned"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_5 = {
  name: "if_5",
  type: "custom-element",
  template: "<!--au--><span><!--au--> </span>",
  instructions: [
    /* target 0 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[16]], isMulti: false, firstExpression: issueDetail__e[16] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["\n            ", "\n          "], expressions: [issueDetail__e[17]], isMulti: false, firstExpression: issueDetail__e[17] } }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_6 = {
  name: "else_6",
  type: "custom-element",
  template: '<!--au--><span style="color: #999;"></span>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.time.noDueDate"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_7 = {
  name: "if_7",
  type: "custom-element",
  template: "<span><!--au--> </span>",
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[19]], isMulti: false, firstExpression: issueDetail__e[19] } }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_8 = {
  name: "else_8",
  type: "custom-element",
  template: '<!--au--><span style="color: #999;"></span>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.meta.noPoints"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_9 = {
  name: "if_9",
  type: "custom-element",
  template: '<section class="issue-detail-section">\n        <!--au--><h3></h3>\n        <!--au--><label-list></label-list>\n      </section>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.sections.labels"
      }
    ],
    /* target 1 */
    [{ type: 12, from: issueDetail__e[21], to: "labels", mode: 2 }]
  ],
  needsCompile: false
};
const issueDetail__def_12 = {
  name: "case_12",
  type: "custom-element",
  template: "<!--au--><span></span>",
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.transitions.reopen"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_13 = {
  name: "case_13",
  type: "custom-element",
  template: "<!--au--><span></span>",
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.transitions.start"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_14 = {
  name: "case_14",
  type: "custom-element",
  template: "<!--au--><span></span>",
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.transitions.review"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_15 = {
  name: "case_15",
  type: "custom-element",
  template: "<!--au--><span></span>",
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.transitions.close"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_16 = {
  name: "default-case_16",
  type: "custom-element",
  template: "<span><!--au--> </span>",
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[25]], isMulti: false, firstExpression: issueDetail__e[25] } }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_11 = {
  name: "switch_11",
  type: "custom-element",
  template: "\n              <!--au--><!--au-start--><!--au-end-->\n              <!--au--><!--au-start--><!--au-end-->\n              <!--au--><!--au-start--><!--au-end-->\n              <!--au--><!--au-start--><!--au-end-->\n              <!--au--><!--au-start--><!--au-end-->\n            ",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: issueDetail__def_12, res: "case", props: [{ type: 12, from: issueDetail__e[26], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [
      { type: 2, def: issueDetail__def_13, res: "case", props: [{ type: 12, from: issueDetail__e[27], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 2, def: issueDetail__def_14, res: "case", props: [{ type: 12, from: issueDetail__e[28], to: "value", mode: 2 }] }
    ],
    /* target 3 */
    [
      { type: 2, def: issueDetail__def_15, res: "case", props: [{ type: 12, from: issueDetail__e[29], to: "value", mode: 2 }] }
    ],
    /* target 4 */
    [{ type: 2, def: issueDetail__def_16, res: "default-case", props: [] }]
  ],
  needsCompile: false
};
const issueDetail__def_10 = {
  name: "repeat_10",
  type: "custom-element",
  template: '<!--au--><button class="btn btn-secondary">\n            <!-- Status transition labels using switch/case -->\n            <!--au--><!--au-start--><!--au-end-->\n          </button>',
  instructions: [
    /* target 0 */
    [
      { type: 31, from: issueDetail__e[24], to: "click", capture: false },
      { type: 11, to: "data-testid", from: { $kind: "Interpolation", parts: ["transition-", ""], expressions: [issueDetail__e[25]], isMulti: false, firstExpression: issueDetail__e[25] } }
    ],
    /* target 1 */
    [
      { type: 2, def: issueDetail__def_11, res: "switch", props: [{ type: 12, from: issueDetail__e[25], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_17 = {
  name: "if_17",
  type: "custom-element",
  template: '<div class="empty-state" style="padding: 1rem;">\n        <!--au--><p></p>\n      </div>',
  instructions: [
    /* target 0 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.comments.empty"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_19 = {
  name: "repeat_19",
  type: "custom-element",
  template: '<!--au--><div class="comment">\n          <!--au--><user-avatar></user-avatar>\n          <div class="comment-content">\n            <div class="comment-header">\n              <span class="comment-author"><!--au--> </span>\n              <!--au--><time-ago></time-ago>\n            </div>\n            <div class="comment-body"><!--au--> </div>\n          </div>\n        </div>',
  instructions: [
    /* target 0 */
    [
      { type: 11, to: "data-testid", from: { $kind: "Interpolation", parts: ["comment-", ""], expressions: [issueDetail__e[32]], isMulti: false, firstExpression: issueDetail__e[32] } }
    ],
    /* target 1 */
    [{ type: 12, from: issueDetail__e[33], to: "user", mode: 2 }],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[34]], isMulti: false, firstExpression: issueDetail__e[34] } }
    ],
    /* target 3 */
    [{ type: 12, from: issueDetail__e[35], to: "date", mode: 2 }],
    /* target 4 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[36]], isMulti: false, firstExpression: issueDetail__e[36] } }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_18 = {
  name: "else_18",
  type: "custom-element",
  template: '<div class="comment-list">\n        <!--au--><!--au-start--><!--au-end-->\n      </div>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: issueDetail__def_19, res: "repeat", props: [{ forOf: issueDetail__e[37], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
const issueDetail__def_1 = {
  name: "else_1",
  type: "custom-element",
  template: '\n    <!-- Header with back button -->\n    <div style="margin-bottom: 1rem;">\n      <!--au--><button class="btn btn-ghost">\n        \u2190 <!--au--><span></span>\n      </button>\n    </div>\n\n    <div class="card">\n      <!-- Issue header -->\n      <header class="issue-detail-header">\n        <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem;">\n          <!--au--><status-badge></status-badge>\n          <!--au--><priority-icon></priority-icon>\n          <!--au--><span><!--au--> </span>\n        </div>\n\n        <h1 class="issue-detail-title"><!--au--> </h1>\n\n        <div class="issue-detail-meta">\n          <span style="color: #666;"><!--au--> </span>\n          <span>\u2022</span>\n          <!--au--><time-ago prefix="Created"></time-ago>\n          <span>\u2022</span>\n          <!--au--><time-ago prefix="Updated"></time-ago>\n        </div>\n      </header>\n\n      <!-- Reporter and Assignee -->\n      <div style="display: flex; gap: 2rem; margin: 1.5rem 0; padding: 1rem 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">\n        <!-- Reporter -->\n        <!--au--><!--au-start--><!--au-end-->\n\n        <!-- Assignee -->\n        <div>\n          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Assignee</div>\n          <!--au--><!--au-start--><!--au-end-->\n          <!--au--><!--au-start--><!--au-end-->\n        </div>\n\n        <!-- Due Date -->\n        <div>\n          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Due Date</div>\n          <!--au--><!--au-start--><!--au-end-->\n          <!--au--><!--au-start--><!--au-end-->\n        </div>\n\n        <!-- Story Points -->\n        <div>\n          <div style="font-size: 0.75rem; color: #666; margin-bottom: 0.25rem;">Story Points</div>\n          <!--au--><!--au-start--><!--au-end-->\n          <!--au--><!--au-start--><!--au-end-->\n        </div>\n      </div>\n\n      <!-- Labels -->\n      <!--au--><!--au-start--><!--au-end-->\n\n      <!-- Description -->\n      <section class="issue-detail-section">\n        <!--au--><h3></h3>\n        <p style="white-space: pre-wrap;"><!--au--> </p>\n      </section>\n\n      <!-- Status transitions -->\n      <section class="issue-detail-section">\n        <h3>Actions</h3>\n        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">\n          <!--au--><!--au-start--><!--au-end-->\n        </div>\n      </section>\n    </div>\n\n    <!-- Comments section -->\n    <div class="card" style="margin-top: 1rem;">\n      <!--au--><h3></h3>\n\n      <!-- Empty state -->\n      <!--au--><!--au-start--><!--au-end-->\n\n      <!-- Comment list -->\n      <!--au--><!--au-start--><!--au-end-->\n\n      <!-- Add comment form -->\n      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">\n        <!--au--><textarea class="form-input" rows="3" data-testid="comment-input"></textarea>\n        <!--au--><button class="btn btn-primary" style="margin-top: 0.5rem;" data-testid="submit-comment"></button>\n      </div>\n    </div>\n  ',
  instructions: [
    /* target 0 */
    [{ type: 31, from: issueDetail__e[4], to: "click", capture: false }],
    /* target 1 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "actions.back"
      }
    ],
    /* target 2 */
    [{ type: 12, from: issueDetail__e[5], to: "status", mode: 2 }],
    /* target 3 */
    [{ type: 12, from: issueDetail__e[6], to: "priority", mode: 2 }],
    /* target 4 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["badge badge-", ""], expressions: [issueDetail__e[7]], isMulti: false, firstExpression: issueDetail__e[7] } }
    ],
    /* target 5 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[7]], isMulti: false, firstExpression: issueDetail__e[7] } }
    ],
    /* target 6 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[8]], isMulti: false, firstExpression: issueDetail__e[8] } }
    ],
    /* target 7 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[9]], isMulti: false, firstExpression: issueDetail__e[9] } }
    ],
    /* target 8 */
    [{ type: 12, from: issueDetail__e[10], to: "date", mode: 2 }],
    /* target 9 */
    [{ type: 12, from: issueDetail__e[11], to: "date", mode: 2 }],
    /* target 10 */
    [
      { type: 2, def: issueDetail__def_2, res: "with", props: [{ type: 12, from: issueDetail__e[14], to: "value", mode: 2 }] }
    ],
    /* target 11 */
    [
      { type: 2, def: issueDetail__def_3, res: "if", props: [{ type: 12, from: issueDetail__e[15], to: "value", mode: 2 }] }
    ],
    /* target 12 */
    [{ type: 2, def: issueDetail__def_4, res: "else", props: [] }],
    /* target 13 */
    [
      { type: 2, def: issueDetail__def_5, res: "if", props: [{ type: 12, from: issueDetail__e[18], to: "value", mode: 2 }] }
    ],
    /* target 14 */
    [{ type: 2, def: issueDetail__def_6, res: "else", props: [] }],
    /* target 15 */
    [
      { type: 2, def: issueDetail__def_7, res: "if", props: [{ type: 12, from: issueDetail__e[20], to: "value", mode: 2 }] }
    ],
    /* target 16 */
    [{ type: 2, def: issueDetail__def_8, res: "else", props: [] }],
    /* target 17 */
    [
      { type: 2, def: issueDetail__def_9, res: "if", props: [{ type: 12, from: issueDetail__e[22], to: "value", mode: 2 }] }
    ],
    /* target 18 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.sections.description"
      }
    ],
    /* target 19 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [issueDetail__e[23]], isMulti: false, firstExpression: issueDetail__e[23] } }
    ],
    /* target 20 */
    [
      { type: 2, def: issueDetail__def_10, res: "repeat", props: [{ forOf: issueDetail__e[30], to: "items", props: [], type: 15 }] }
    ],
    /* target 21 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.sections.comments"
      }
    ],
    /* target 22 */
    [
      { type: 2, def: issueDetail__def_17, res: "if", props: [{ type: 12, from: issueDetail__e[31], to: "value", mode: 2 }] }
    ],
    /* target 23 */
    [{ type: 2, def: issueDetail__def_18, res: "else", props: [] }],
    /* target 24 */
    [
      { type: 12, from: issueDetail__e[38], to: "value", mode: 6 },
      { type: 12, from: issueDetail__e[39], to: "placeholder", mode: 2 }
    ],
    /* target 25 */
    [
      { type: 31, from: issueDetail__e[40], to: "click", capture: false },
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.comments.submit"
      }
    ]
  ],
  needsCompile: false
};
const issueDetail_$au = {
  type: "custom-element",
  name: "issue-detail",
  template: '<!--\n  Issue Detail Page Template\n\n  Exercises:\n  - if.bind for loading/error states\n  - with.bind for nested context (assignee, reporter)\n  - switch/case for status actions\n  - repeat.for for comments, labels, transitions\n  - click.trigger for actions\n  - value.bind for comment input\n  - t="key" for labels\n  - Custom elements (status-badge, priority-icon, user-avatar, label-list, time-ago)\n  - class.bind for conditional styling\n-->\n\n<div class="page issue-detail-page" data-testid="issue-detail">\n  <!-- Loading state -->\n  <!--au--><!--au-start--><!--au-end-->\n\n  <!-- Not found state -->\n  <!--au--><div data-testid="not-found">\n    <!--au--><empty-state icon="\u274C"></empty-state>\n    <!--au--><button class="btn btn-secondary" style="margin-top: 1rem;">\n      <!--au--><span></span>\n    </button>\n  </div>\n\n  <!-- Issue content -->\n  <!--au--><!--au-start--><!--au-end-->\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: issueDetail__def_0, res: "if", props: [{ type: 12, from: issueDetail__e[0], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [{ type: 12, from: issueDetail__e[1], to: "elseIf", mode: 2 }],
    /* target 2 */
    [
      { type: 12, from: issueDetail__e[2], to: "title", mode: 2 },
      { type: 12, from: issueDetail__e[3], to: "description", mode: 2 }
    ],
    /* target 3 */
    [{ type: 31, from: issueDetail__e[4], to: "click", capture: false }],
    /* target 4 */
    [
      {
        type: 37,
        to: "",
        exprId: "",
        isExpression: false,
        keyValue: "issue.notFound.back"
      }
    ],
    /* target 5 */
    [{ type: 2, def: issueDetail__def_1, res: "else", props: [] }]
  ],
  needsCompile: false
};
class IssueDetail {
  static $au = issueDetail_$au;
  static dependencies = [StatusBadge, PriorityIcon, UserAvatar, LabelList, TimeAgo, EmptyState];
  // ==========================================================================
  // Router
  // ==========================================================================
  router = resolve(IRouter);
  // ==========================================================================
  // State
  // ==========================================================================
  /** The issue being displayed */
  issue = null;
  /** Loading state */
  isLoading = true;
  /** Error state */
  notFound = false;
  /** New comment input */
  newComment = "";
  /** Available next statuses */
  availableTransitions = [];
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  /**
   * Load issue when route params change.
   * Called by router when entering this route.
   */
  loading(params) {
    const id = params.id;
    this.loadIssue(id);
  }
  // ==========================================================================
  // Data Loading
  // ==========================================================================
  loadIssue(id) {
    this.isLoading = true;
    this.notFound = false;
    setTimeout(() => {
      const issue = getIssueById(id);
      if (issue) {
        this.issue = issue;
        this.availableTransitions = getNextStatuses(issue.status);
      } else {
        this.notFound = true;
      }
      this.isLoading = false;
    }, 100);
  }
  // ==========================================================================
  // Actions
  // ==========================================================================
  /** Change issue status */
  changeStatus(newStatus) {
    if (!this.issue) return;
    if (canTransition(this.issue.status, newStatus)) {
      this.issue.status = newStatus;
      this.issue.updatedAt = /* @__PURE__ */ new Date();
      this.availableTransitions = getNextStatuses(newStatus);
    }
  }
  /** Add a comment */
  addComment() {
    if (!this.issue || !this.newComment.trim()) return;
    const comment = createComment(users[0], this.newComment.trim());
    this.issue.comments.push(comment);
    this.issue.updatedAt = /* @__PURE__ */ new Date();
    this.newComment = "";
  }
  /** Navigate back to issues list */
  goBack() {
    this.router.load("issues");
  }
  // ==========================================================================
  // Computed
  // ==========================================================================
  get hasComments() {
    return (this.issue?.comments.length ?? 0) > 0;
  }
  get hasLabels() {
    return (this.issue?.labels.length ?? 0) > 0;
  }
  get hasDueDate() {
    return this.issue?.dueDate !== null;
  }
  get isOverdue() {
    if (!this.issue?.dueDate) return false;
    return this.issue.dueDate < /* @__PURE__ */ new Date() && this.issue.status !== "closed";
  }
}
export {
  IssueDetail
};
