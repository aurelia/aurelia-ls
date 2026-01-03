const emptyState__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "icon",
    ancestor: 0
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
    name: "description",
    ancestor: 0
  },
  /* 3 */
  // CallScope
  {
    $kind: "CallScope",
    name: "onAction",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 4 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "actionText",
    ancestor: 0
  },
  /* 5 */
  // Binary
  {
    $kind: "Binary",
    operation: "&&",
    left: {
      $kind: "AccessScope",
      name: "actionText",
      ancestor: 0
    },
    right: {
      $kind: "AccessScope",
      name: "onAction",
      ancestor: 0
    }
  }
];
const emptyState__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: "<p><!--au--> </p>",
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [emptyState__e[2]], isMulti: false, firstExpression: emptyState__e[2] } }
    ]
  ],
  needsCompile: false
};
const emptyState__def_1 = {
  name: "if_1",
  type: "custom-element",
  template: '<!--au--><button class="btn btn-primary" style="margin-top: 1rem;"><!--au--> </button>',
  instructions: [
    /* target 0 */
    [{ type: 31, from: emptyState__e[3], to: "click", capture: false }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["\n    ", "\n  "], expressions: [emptyState__e[4]], isMulti: false, firstExpression: emptyState__e[4] } }
    ]
  ],
  needsCompile: false
};
const emptyState_$au = {
  type: "custom-element",
  name: "empty-state",
  template: '<!--\n  Empty State Component Template\n\n  Exercises:\n  - if.bind for optional elements\n  - Interpolation for icon, title, description\n  - click.trigger for action button\n-->\n\n<div class="empty-state" data-testid="empty-state">\n  <div class="empty-state-icon"><!--au--> </div>\n  <div class="empty-state-title"><!--au--> </div>\n  <!--au--><!--au-start--><!--au-end-->\n  <!--au--><!--au-start--><!--au-end-->\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [emptyState__e[0]], isMulti: false, firstExpression: emptyState__e[0] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [emptyState__e[1]], isMulti: false, firstExpression: emptyState__e[1] } }
    ],
    /* target 2 */
    [
      { type: 2, def: emptyState__def_0, res: "if", props: [{ type: 12, from: emptyState__e[2], to: "value", mode: 2 }] }
    ],
    /* target 3 */
    [
      { type: 2, def: emptyState__def_1, res: "if", props: [{ type: 12, from: emptyState__e[5], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class EmptyState {
  static $au = emptyState_$au;
  /** Icon to display (emoji or icon class) */
  icon = "\u{1F4CB}";
  /** Title text */
  title = "No items found";
  /** Description text */
  description = "";
  /** Action button text (optional) */
  actionText = "";
  /** Action callback */
  onAction = null;
}
export {
  EmptyState
};
