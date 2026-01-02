const users__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "title",
    ancestor: 0
  },
  /* 1 */
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
  /* 2 */
  // AccessMember
  {
    $kind: "AccessMember",
    object: {
      $kind: "AccessScope",
      name: "user",
      ancestor: 0
    },
    name: "role",
    optional: false
  },
  /* 3 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "user"
    },
    iterable: {
      $kind: "AccessScope",
      name: "users",
      ancestor: 0
    },
    semiIdx: -1
  }
];
const users__def_0 = {
  name: "repeat_0",
  type: "custom-element",
  template: '<li data-testid="user-item">\n      <!--au--><a data-testid="user-link" load="user/${user.id}"><!--au--> </a>\n      <span class="role"><!--au--> </span>\n    </li>',
  instructions: [
    /* target 0 */
    [{ type: 1, res: "load", props: [] }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [users__e[1]], isMulti: false, firstExpression: users__e[1] } }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["(", ")"], expressions: [users__e[2]], isMulti: false, firstExpression: users__e[2] } }
    ]
  ],
  needsCompile: false
};
const users_$au = {
  type: "custom-element",
  name: "users",
  template: '<div class="page users-page" data-testid="users-page">\n  <h2><!--au--> </h2>\n\n  <ul data-testid="users-list">\n    <!--au--><!--au-start--><!--au-end-->\n  </ul>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [users__e[0]], isMulti: false, firstExpression: users__e[0] } }
    ],
    /* target 1 */
    [
      { type: 2, def: users__def_0, res: "repeat", props: [{ forOf: users__e[3], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
class Users {
  static $au = users_$au;
  title = "Users";
  users = [
    { id: 1, name: "Alice", role: "Admin" },
    { id: 2, name: "Bob", role: "User" },
    { id: 3, name: "Charlie", role: "Moderator" }
  ];
}
export {
  Users
};
