const userAvatar__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "name",
    ancestor: 0
  },
  /* 1 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "Binary",
      operation: "&&",
      left: {
        $kind: "AccessScope",
        name: "showOnline",
        ancestor: 0
      },
      right: {
        $kind: "AccessScope",
        name: "online",
        ancestor: 0
      }
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "online"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 2 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "Binary",
      operation: "===",
      left: {
        $kind: "AccessScope",
        name: "size",
        ancestor: 0
      },
      right: {
        $kind: "PrimitiveLiteral",
        value: "small"
      }
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "0.625rem"
    },
    no: {
      $kind: "Conditional",
      condition: {
        $kind: "Binary",
        operation: "===",
        left: {
          $kind: "AccessScope",
          name: "size",
          ancestor: 0
        },
        right: {
          $kind: "PrimitiveLiteral",
          value: "large"
        }
      },
      yes: {
        $kind: "PrimitiveLiteral",
        value: "1rem"
      },
      no: {
        $kind: "PrimitiveLiteral",
        value: "0.875rem"
      }
    }
  },
  /* 3 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "avatar",
    ancestor: 0
  },
  /* 4 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "user",
    ancestor: 0
  }
];
const userAvatar__def_1 = {
  name: "with_1",
  type: "custom-element",
  template: '<!--au--><div class="avatar-wrapper" data-testid="user-avatar">\n    <!--au--><div><!--au--> </div>\n  </div>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: userAvatar__e[0], to: "title", mode: 2 }],
    /* target 1 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["avatar ", ""], expressions: [userAvatar__e[1]], isMulti: false, firstExpression: userAvatar__e[1] } },
      { type: 11, to: "style", from: { $kind: "Interpolation", parts: ["font-size: ", ";"], expressions: [userAvatar__e[2]], isMulti: false, firstExpression: userAvatar__e[2] } }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["\n      ", "\n    "], expressions: [userAvatar__e[3]], isMulti: false, firstExpression: userAvatar__e[3] } }
    ]
  ],
  needsCompile: false
};
const userAvatar__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: "\n  <!--au--><!--au-start--><!--au-end-->\n",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: userAvatar__def_1, res: "with", props: [{ type: 12, from: userAvatar__e[4], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
const userAvatar_$au = {
  type: "custom-element",
  name: "user-avatar",
  template: "<!--\n  User Avatar Component Template\n\n  Exercises:\n  - if.bind for null check\n  - with.bind for user context\n  - class.bind for size and online status\n  - Interpolation for initials\n-->\n\n<!--au--><!--au-start--><!--au-end-->\n",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: userAvatar__def_0, res: "if", props: [{ type: 12, from: userAvatar__e[4], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class UserAvatar {
  static $au = userAvatar_$au;
  /** The user to display */
  user = null;
  /** Avatar size: small, medium, large */
  size = "medium";
  /** Show online indicator */
  showOnline = true;
}
export {
  UserAvatar
};
