const statusBadge__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "status",
    ancestor: 0
  },
  /* 1 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "draft"
  },
  /* 2 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "open"
  },
  /* 3 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "in_progress"
  },
  /* 4 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "review"
  },
  /* 5 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "closed"
  }
];
const statusBadge__def_1 = {
  name: "case_1",
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
        keyValue: "status.draft"
      }
    ]
  ],
  needsCompile: false
};
const statusBadge__def_2 = {
  name: "case_2",
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
        keyValue: "status.open"
      }
    ]
  ],
  needsCompile: false
};
const statusBadge__def_3 = {
  name: "case_3",
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
        keyValue: "status.in_progress"
      }
    ]
  ],
  needsCompile: false
};
const statusBadge__def_4 = {
  name: "case_4",
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
        keyValue: "status.review"
      }
    ]
  ],
  needsCompile: false
};
const statusBadge__def_5 = {
  name: "case_5",
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
        keyValue: "status.closed"
      }
    ]
  ],
  needsCompile: false
};
const statusBadge__def_0 = {
  name: "switch_0",
  type: "custom-element",
  template: '<!--au--><span data-testid="status-badge">\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n</span>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: statusBadge__def_1, res: "case", props: [{ type: 12, from: statusBadge__e[1], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [
      { type: 2, def: statusBadge__def_2, res: "case", props: [{ type: 12, from: statusBadge__e[2], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 2, def: statusBadge__def_3, res: "case", props: [{ type: 12, from: statusBadge__e[3], to: "value", mode: 2 }] }
    ],
    /* target 3 */
    [
      { type: 2, def: statusBadge__def_4, res: "case", props: [{ type: 12, from: statusBadge__e[4], to: "value", mode: 2 }] }
    ],
    /* target 4 */
    [
      { type: 2, def: statusBadge__def_5, res: "case", props: [{ type: 12, from: statusBadge__e[5], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const statusBadge_$au = {
  type: "custom-element",
  name: "status-badge",
  template: '<!--\n  Status Badge Component Template\n\n  Exercises:\n  - switch.bind for multi-way branching\n  - case for each status\n  - t="key" for translated status names\n  - Dynamic class binding based on status\n-->\n\n<!--au--><!--au-start--><!--au-end-->\n',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: statusBadge__def_0, res: "switch", props: [{ type: 12, from: statusBadge__e[0], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class StatusBadge {
  static $au = statusBadge_$au;
  /** The issue status to display */
  status = "open";
}
export {
  StatusBadge
};
