const labelList__e = [
  /* 0 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "label",
      ancestor: 0
    },
    name: "color",
    optional: false
  },
  /* 1 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "label",
      ancestor: 0
    },
    name: "id",
    optional: false
  },
  /* 2 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "label",
      ancestor: 0
    },
    name: "name",
    optional: false
  },
  /* 3 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "label"
    },
    iterable: {
      $kind: "AccessScope",
      name: "labels",
      ancestor: 0
    },
    semiIdx: -1
  }
];
const labelList__def_0 = {
  name: "repeat_0",
  type: "custom-element",
  template: '<!--au--><span class="label"><!--au--> </span>',
  instructions: [
    /* target 0 */
    [
      { type: 11, to: "style", from: { $kind: "Interpolation", parts: ["background-color: ", "20; color: ", "; border: 1px solid ", "40;"], expressions: [labelList__e[0], labelList__e[0], labelList__e[0]], isMulti: true, firstExpression: labelList__e[0] } },
      { type: 11, to: "data-testid", from: { $kind: "Interpolation", parts: ["label-", ""], expressions: [labelList__e[1]], isMulti: false, firstExpression: labelList__e[1] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["\n    ", "\n  "], expressions: [labelList__e[2]], isMulti: false, firstExpression: labelList__e[2] } }
    ]
  ],
  needsCompile: false
};
const labelList_$au = {
  type: "custom-element",
  name: "label-list",
  template: '<!--\n  Label List Component Template\n\n  Exercises:\n  - repeat.for for iterating labels\n  - style.bind for dynamic background/text colors\n  - Interpolation for label name\n-->\n\n<div class="label-list" data-testid="label-list">\n  <!--au--><!--au-start--><!--au-end-->\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: labelList__def_0, res: "repeat", props: [{ forOf: labelList__e[3], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
class LabelList {
  static $au = labelList_$au;
  /** Labels to display */
  labels = [];
}
export {
  LabelList
};
