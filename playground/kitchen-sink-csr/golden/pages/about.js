const about__e = [
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
    name: "description",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "feature",
    ancestor: 0
  },
  /* 3 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "feature"
    },
    iterable: {
      $kind: "AccessScope",
      name: "features",
      ancestor: 0
    },
    semiIdx: -1
  }
];
const about__def_0 = {
  name: "repeat_0",
  type: "custom-element",
  template: '<li data-testid="feature"><!--au--> </li>',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [about__e[2]], isMulti: false, firstExpression: about__e[2] } }
    ]
  ],
  needsCompile: false
};
const about_$au = {
  type: "custom-element",
  name: "about",
  template: '<div class="page about-page" data-testid="about-page">\n  <h2><!--au--> </h2>\n  <p data-testid="description"><!--au--> </p>\n\n  <h3>Features Tested</h3>\n  <ul data-testid="features-list">\n    <!--au--><!--au-start--><!--au-end-->\n  </ul>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [about__e[0]], isMulti: false, firstExpression: about__e[0] } }
    ],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [about__e[1]], isMulti: false, firstExpression: about__e[1] } }
    ],
    /* target 2 */
    [
      { type: 2, def: about__def_0, res: "repeat", props: [{ forOf: about__e[3], to: "items", props: [], type: 15 }] }
    ]
  ],
  needsCompile: false
};
class About {
  static $au = about_$au;
  title = "About";
  description = "This is a kitchen sink demo testing AOT compilation with routing.";
  features = [
    "Interpolation",
    "Property binding",
    "Event handlers",
    "Template controllers (if/else, repeat, switch)",
    "Router integration"
  ];
}
export {
  About
};
