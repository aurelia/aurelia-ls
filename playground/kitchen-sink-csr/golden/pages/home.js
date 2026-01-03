const home__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "title",
    ancestor: 0
  },
  /* 1 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "welcomeMessage",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "visitCount",
    ancestor: 0
  }
];
const home_$au = {
  type: "custom-element",
  name: "home",
  template: '<div class="page home-page" data-testid="home-page">\n  <h2><!--au--> </h2>\n  <p data-testid="welcome"><!--au--> </p>\n  <p data-testid="visit-count"><!--au--> </p>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [home__e[0]], isMulti: false, firstExpression: home__e[0] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [home__e[1]], isMulti: false, firstExpression: home__e[1] } }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["Page visits: ", ""], expressions: [home__e[2]], isMulti: false, firstExpression: home__e[2] } }
    ]
  ],
  needsCompile: false
};
class Home {
  static $au = home_$au;
  title = "Home";
  welcomeMessage = "Welcome to the Kitchen Sink Router Demo";
  visitCount = 0;
  binding() {
    this.visitCount++;
  }
}
export {
  Home
};
