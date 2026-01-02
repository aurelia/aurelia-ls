const timeAgo__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "fullDate",
    ancestor: 0
  },
  /* 1 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "prefix",
    ancestor: 0
  },
  /* 2 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "relativeTime",
    ancestor: 0
  },
  /* 3 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "date",
    ancestor: 0
  }
];
const timeAgo__def_1 = {
  name: "if_1",
  type: "custom-element",
  template: "<span><!--au--> </span>",
  instructions: [
    /* target 0 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", " "], expressions: [timeAgo__e[1]], isMulti: false, firstExpression: timeAgo__e[1] } }
    ]
  ],
  needsCompile: false
};
const timeAgo__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<!--au--><span class="time-ago" data-testid="time-ago">\n  <!--au--><!--au-start--><!--au-end--><!--au--> </span>',
  instructions: [
    /* target 0 */
    [{ type: 12, from: timeAgo__e[0], to: "title", mode: 2 }],
    /* target 1 */
    [
      { type: 2, def: timeAgo__def_1, res: "if", props: [{ type: 12, from: timeAgo__e[1], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", "\n"], expressions: [timeAgo__e[2]], isMulti: false, firstExpression: timeAgo__e[2] } }
    ]
  ],
  needsCompile: false
};
const timeAgo_$au = {
  type: "custom-element",
  name: "time-ago",
  template: "<!--\n  Time Ago Component Template\n\n  Exercises:\n  - if.bind for null check\n  - Interpolation for relative time\n  - title attribute for full date tooltip\n-->\n\n<!--au--><!--au-start--><!--au-end-->\n",
  instructions: [
    /* target 0 */
    [
      { type: 2, def: timeAgo__def_0, res: "if", props: [{ type: 12, from: timeAgo__e[3], to: "value", mode: 2 }] }
    ]
  ],
  needsCompile: false
};
class TimeAgo {
  static $au = timeAgo_$au;
  /** The date to display relative to now */
  date = null;
  /** Optional prefix (e.g., "Created", "Updated") */
  prefix = "";
  /**
   * Calculate relative time string.
   * In production, use: ${date | relativeTime}
   */
  get relativeTime() {
    if (!this.date) return "";
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - this.date.getTime();
    const diffSec = Math.floor(diffMs / 1e3);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  }
  /** Full formatted date for tooltip */
  get fullDate() {
    return this.date?.toLocaleString() ?? "";
  }
}
export {
  TimeAgo
};
