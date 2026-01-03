const user__e = [
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
    name: "id",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "name",
    ancestor: 0
  },
  /* 3 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "role",
    ancestor: 0
  }
];
const user__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div data-testid="user-loading">Loading...</div>',
  instructions: [],
  needsCompile: false
};
const user__def_1 = {
  name: "else_1",
  type: "custom-element",
  template: '<div data-testid="user-details">\n    <dl>\n      <dt>ID</dt>\n      <dd data-testid="user-id"><!--au--> </dd>\n\n      <dt>Name</dt>\n      <dd data-testid="user-name"><!--au--> </dd>\n\n      <dt>Role</dt>\n      <dd data-testid="user-role"><!--au--> </dd>\n    </dl>\n\n    <!--au--><a data-testid="back-link" load="users">Back to Users</a>\n  </div>',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [user__e[1]], isMulti: false, firstExpression: user__e[1] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [user__e[2]], isMulti: false, firstExpression: user__e[2] } }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [user__e[3]], isMulti: false, firstExpression: user__e[3] } }
    ],
    /* target 3 */
    [{ type: 1, res: "load", props: [{ type: 10, value: "users", to: "route" }] }]
  ],
  needsCompile: false
};
const user_$au = {
  type: "custom-element",
  name: "user",
  template: '<div class="page user-page" data-testid="user-page">\n  <h2>User Details</h2>\n\n  <!--au--><!--au-start--><!--au-end-->\n\n  <!--au--><!--au-start--><!--au-end-->\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 2, def: user__def_0, res: "if", props: [{ type: 12, from: user__e[0], to: "value", mode: 2 }] }
    ],
    /* target 1 */
    [{ type: 2, def: user__def_1, res: "else", props: [] }]
  ],
  needsCompile: false
};
class User {
  static $au = user_$au;
  static parameters = ["id"];
  id = "";
  name = "";
  role = "";
  isLoading = true;
  // Simulated user data
  userData = {
    "1": { name: "Alice", role: "Admin" },
    "2": { name: "Bob", role: "User" },
    "3": { name: "Charlie", role: "Moderator" }
  };
  load(params) {
    this.id = params.id;
    const data = this.userData[this.id];
    if (data) {
      this.name = data.name;
      this.role = data.role;
    }
    this.isLoading = false;
  }
}
export {
  User
};
