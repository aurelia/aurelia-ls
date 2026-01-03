const priorityIcon__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "priority",
    ancestor: 0
  },
  /* 1 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "low"
  },
  /* 2 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "medium"
  },
  /* 3 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "high"
  },
  /* 4 */
  // PrimitiveLiteral
  {
    $kind: "PrimitiveLiteral",
    value: "critical"
  },
  /* 5 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "showLabel",
    ancestor: 0
  }
];
const priorityIcon__def_1 = {
  name: "case_1",
  type: "custom-element",
  template: "\u2193",
  instructions: [],
  needsCompile: false
};
const priorityIcon__def_2 = {
  name: "case_2",
  type: "custom-element",
  template: "\u2192",
  instructions: [],
  needsCompile: false
};
const priorityIcon__def_3 = {
  name: "case_3",
  type: "custom-element",
  template: "\u2191",
  instructions: [],
  needsCompile: false
};
const priorityIcon__def_4 = {
  name: "case_4",
  type: "custom-element",
  template: "\u26A0",
  instructions: [],
  needsCompile: false
};
const priorityIcon__def_0 = {
  name: "switch_0",
  type: "custom-element",
  template: '<!--au--><span data-testid="priority-icon">\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n</span>',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: priorityIcon__def_1, res: "case", props: [{ type: 12, from: priorityIcon__e[1], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [
      { type: 2, def: priorityIcon__def_2, res: "case", props: [{ type: 12, from: priorityIcon__e[2], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 2, def: priorityIcon__def_3, res: "case", props: [{ type: 12, from: priorityIcon__e[3], to: "value", mode: 2 }] }
    ],
    /* target 3 */
    [
      { type: 2, def: priorityIcon__def_4, res: "case", props: [{ type: 12, from: priorityIcon__e[4], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const priorityIcon__def_5 = {
  name: "if_5",
  type: "custom-element",
  template: '<!--au--><span style="margin-left: 0.25rem;"></span>',
  instructions: [
    /* target 0 */
    [
      { type: 11, to: "t", from: { $kind: "Interpolation", parts: ["priority.", ""], expressions: [priorityIcon__e[0]], isMulti: false, firstExpression: priorityIcon__e[0] } }
    ]
  ],
  needsCompile: false
};
const priorityIcon_$au = {
  type: "custom-element",
  name: "priority-icon",
  template: "<!--\n  Priority Icon Component Template\n\n  Exercises:\n  - switch.bind for multi-way branching\n  - case for each priority level\n  - if.bind for optional label display\n  - Dynamic class binding based on priority\n-->\n\n<!--au--><!--au-start--><!--au-end-->\n<!--au--><!--au-start--><!--au-end-->\n",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: priorityIcon__def_0, res: "switch", props: [{ type: 12, from: priorityIcon__e[0], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [
      { type: 2, def: priorityIcon__def_5, res: "if", props: [{ type: 12, from: priorityIcon__e[5], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class PriorityIcon {
  static $au = priorityIcon_$au;
  /** The priority level to display */
  priority = "medium";
  /** Whether to show the label text */
  showLabel = false;
}
export {
  PriorityIcon
};
