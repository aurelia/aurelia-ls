import { currentUser } from "../domain/data.js";
const settings__e = [
  /* 0 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "showSavedMessage",
    ancestor: 0
  },
  /* 1 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "profile",
      ancestor: 0
    },
    name: "name",
    optional: false
  },
  /* 2 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "profile",
      ancestor: 0
    },
    name: "email",
    optional: false
  },
  /* 3 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "userRole",
    ancestor: 0
  },
  /* 4 */
  // CallScope
  {
    $kind: "CallScope",
    name: "saveProfile",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 5 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "theme",
    ancestor: 0
  },
  /* 6 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "opt",
      ancestor: 0
    },
    name: "value",
    optional: false
  },
  /* 7 */
  // AccessMember
  {
    $kind: "AccessMember",
    accessGlobal: false,
    object: {
      $kind: "AccessScope",
      name: "opt",
      ancestor: 0
    },
    name: "label",
    optional: false
  },
  /* 8 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "themeOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 9 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "language",
    ancestor: 0
  },
  /* 10 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "languageOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 11 */
  // AccessScope
  {
    $kind: "AccessScope",
    name: "dateFormat",
    ancestor: 0
  },
  /* 12 */
  // ForOfStatement
  {
    $kind: "ForOfStatement",
    declaration: {
      $kind: "BindingIdentifier",
      name: "opt"
    },
    iterable: {
      $kind: "AccessScope",
      name: "dateFormatOptions",
      ancestor: 0
    },
    semiIdx: -1
  },
  /* 13 */
  // CallScope
  {
    $kind: "CallScope",
    name: "savePreferences",
    args: [],
    ancestor: 0,
    optional: false
  },
  /* 14 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessMember",
      accessGlobal: false,
      object: {
        $kind: "AccessScope",
        name: "notifications",
        ancestor: 0
      },
      name: "email",
      optional: false
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "active"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 15 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggleNotification",
    args: [
      {
        $kind: "PrimitiveLiteral",
        value: "email"
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 16 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessMember",
      accessGlobal: false,
      object: {
        $kind: "AccessScope",
        name: "notifications",
        ancestor: 0
      },
      name: "browser",
      optional: false
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "active"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 17 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggleNotification",
    args: [
      {
        $kind: "PrimitiveLiteral",
        value: "browser"
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 18 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessMember",
      accessGlobal: false,
      object: {
        $kind: "AccessScope",
        name: "notifications",
        ancestor: 0
      },
      name: "assigned",
      optional: false
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "active"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 19 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggleNotification",
    args: [
      {
        $kind: "PrimitiveLiteral",
        value: "assigned"
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 20 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessMember",
      accessGlobal: false,
      object: {
        $kind: "AccessScope",
        name: "notifications",
        ancestor: 0
      },
      name: "mentioned",
      optional: false
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "active"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 21 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggleNotification",
    args: [
      {
        $kind: "PrimitiveLiteral",
        value: "mentioned"
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 22 */
  // Conditional
  {
    $kind: "Conditional",
    condition: {
      $kind: "AccessMember",
      accessGlobal: false,
      object: {
        $kind: "AccessScope",
        name: "notifications",
        ancestor: 0
      },
      name: "statusChange",
      optional: false
    },
    yes: {
      $kind: "PrimitiveLiteral",
      value: "active"
    },
    no: {
      $kind: "PrimitiveLiteral",
      value: ""
    }
  },
  /* 23 */
  // CallScope
  {
    $kind: "CallScope",
    name: "toggleNotification",
    args: [
      {
        $kind: "PrimitiveLiteral",
        value: "statusChange"
      }
    ],
    ancestor: 0,
    optional: false
  },
  /* 24 */
  // CallScope
  {
    $kind: "CallScope",
    name: "saveNotifications",
    args: [],
    ancestor: 0,
    optional: false
  }
];
const settings__def_0 = {
  name: "if_0",
  type: "custom-element",
  template: '<div style="background: #d1fae5; color: #065f46; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;" data-testid="save-success">\n    <!--au--><span></span>\n  </div>',
  instructions: [
    /* target 0 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.saved" }, to: "" }
    ]
  ],
  needsCompile: false
};
const settings__def_1 = {
  name: "repeat_1",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: settings__e[6], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [settings__e[7]], isMulti: false, firstExpression: settings__e[7] } }
    ]
  ],
  needsCompile: false
};
const settings__def_2 = {
  name: "repeat_2",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: settings__e[6], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [settings__e[7]], isMulti: false, firstExpression: settings__e[7] } }
    ]
  ],
  needsCompile: false
};
const settings__def_3 = {
  name: "repeat_3",
  type: "custom-element",
  template: "<!--au--><option><!--au--> </option>",
  instructions: [
    /* target 0 */
    [{ type: 12, from: settings__e[6], to: "value", mode: 2 }],
    /* target 1 */
    [
      { type: 30, from: { $kind: "Interpolation", parts: ["", ""], expressions: [settings__e[7]], isMulti: false, firstExpression: settings__e[7] } }
    ]
  ],
  needsCompile: false
};
const settings_$au = {
  type: "custom-element",
  name: "settings",
  template: '<!--\n  Settings Page Template\n\n  Exercises:\n  - value.bind for text inputs\n  - value.bind for select dropdowns\n  - repeat.for for options\n  - click.trigger for buttons and toggles\n  - class.bind for active states\n  - if.bind for conditional display\n  - t="key" for labels\n-->\n\n<div class="page settings-page" data-testid="settings">\n  <!--au--><h2></h2>\n\n  <!-- Success message -->\n  <!--au--><!--au-start--><!--au-end-->\n\n  <!-- Profile Section -->\n  <section class="settings-section">\n    <div class="card">\n      <!--au--><h3></h3>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><input type="text" class="form-input" data-testid="profile-name">\n      </div>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><input type="email" class="form-input" data-testid="profile-email">\n      </div>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><input type="text" class="form-input" disabled style="background: #f3f4f6;">\n      </div>\n\n      <!--au--><button class="btn btn-primary" data-testid="save-profile"></button>\n    </div>\n  </section>\n\n  <!-- Preferences Section -->\n  <section class="settings-section">\n    <div class="card">\n      <!--au--><h3></h3>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><select class="form-input" data-testid="theme-select">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><select class="form-input" data-testid="language-select">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <div class="form-group">\n        <!--au--><label class="form-label"></label>\n        <!--au--><select class="form-input" data-testid="date-format-select">\n          <!--au--><!--au-start--><!--au-end-->\n        </select>\n      </div>\n\n      <!--au--><button class="btn btn-primary" data-testid="save-preferences"></button>\n    </div>\n  </section>\n\n  <!-- Notifications Section -->\n  <section class="settings-section">\n    <div class="card">\n      <!--au--><h3></h3>\n\n      <!-- Email notifications -->\n      <div class="form-group">\n        <!--au--><div data-testid="toggle-email">\n          <div class="toggle-switch"></div>\n          <div>\n            <!--au--><div style="font-weight: 500;"></div>\n            <!--au--><div style="font-size: 0.875rem; color: #666;"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- Browser notifications -->\n      <div class="form-group">\n        <!--au--><div data-testid="toggle-browser">\n          <div class="toggle-switch"></div>\n          <div>\n            <!--au--><div style="font-weight: 500;"></div>\n            <!--au--><div style="font-size: 0.875rem; color: #666;"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- Assigned notifications -->\n      <div class="form-group">\n        <!--au--><div data-testid="toggle-assigned">\n          <div class="toggle-switch"></div>\n          <!--au--><div style="font-weight: 500;"></div>\n        </div>\n      </div>\n\n      <!-- Mentioned notifications -->\n      <div class="form-group">\n        <!--au--><div data-testid="toggle-mentioned">\n          <div class="toggle-switch"></div>\n          <!--au--><div style="font-weight: 500;"></div>\n        </div>\n      </div>\n\n      <!-- Status change notifications -->\n      <div class="form-group">\n        <!--au--><div data-testid="toggle-status-change">\n          <div class="toggle-switch"></div>\n          <!--au--><div style="font-weight: 500;"></div>\n        </div>\n      </div>\n\n      <!--au--><button class="btn btn-primary" data-testid="save-notifications"></button>\n    </div>\n  </section>\n</div>\n',
  instructions: [
    /* target 0 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.title" }, to: "" }
    ],
    /* target 1 */
    [
      { type: 2, def: settings__def_0, res: "if", props: [{ type: 12, from: settings__e[0], to: "value", mode: 2 }] }
    ],
    /* target 2 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.sections.profile" }, to: "" }
    ],
    /* target 3 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.profile.name" }, to: "" }
    ],
    /* target 4 */
    [{ type: 12, from: settings__e[1], to: "value", mode: 6 }],
    /* target 5 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.profile.email" }, to: "" }
    ],
    /* target 6 */
    [{ type: 12, from: settings__e[2], to: "value", mode: 6 }],
    /* target 7 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.profile.role" }, to: "" }
    ],
    /* target 8 */
    [{ type: 12, from: settings__e[3], to: "value", mode: 6 }],
    /* target 9 */
    [
      { type: 31, from: settings__e[4], to: "click", capture: false },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.profile.save" }, to: "" }
    ],
    /* target 10 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.sections.preferences" }, to: "" }
    ],
    /* target 11 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.preferences.theme" }, to: "" }
    ],
    /* target 12 */
    [{ type: 12, from: settings__e[5], to: "value", mode: 6 }],
    /* target 13 */
    [
      { type: 2, def: settings__def_1, res: "repeat", props: [{ forOf: settings__e[8], to: "items", props: [], type: 15 }] }
    ],
    /* target 14 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.preferences.language" }, to: "" }
    ],
    /* target 15 */
    [{ type: 12, from: settings__e[9], to: "value", mode: 6 }],
    /* target 16 */
    [
      { type: 2, def: settings__def_2, res: "repeat", props: [{ forOf: settings__e[10], to: "items", props: [], type: 15 }] }
    ],
    /* target 17 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.preferences.dateFormat" }, to: "" }
    ],
    /* target 18 */
    [{ type: 12, from: settings__e[11], to: "value", mode: 6 }],
    /* target 19 */
    [
      { type: 2, def: settings__def_3, res: "repeat", props: [{ forOf: settings__e[12], to: "items", props: [], type: 15 }] }
    ],
    /* target 20 */
    [
      { type: 31, from: settings__e[13], to: "click", capture: false },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "actions.save" }, to: "" }
    ],
    /* target 21 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.sections.notifications" }, to: "" }
    ],
    /* target 22 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["toggle ", ""], expressions: [settings__e[14]], isMulti: false, firstExpression: settings__e[14] } },
      { type: 31, from: settings__e[15], to: "click", capture: false }
    ],
    /* target 23 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.email" }, to: "" }
    ],
    /* target 24 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.emailDesc" }, to: "" }
    ],
    /* target 25 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["toggle ", ""], expressions: [settings__e[16]], isMulti: false, firstExpression: settings__e[16] } },
      { type: 31, from: settings__e[17], to: "click", capture: false }
    ],
    /* target 26 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.browser" }, to: "" }
    ],
    /* target 27 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.browserDesc" }, to: "" }
    ],
    /* target 28 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["toggle ", ""], expressions: [settings__e[18]], isMulti: false, firstExpression: settings__e[18] } },
      { type: 31, from: settings__e[19], to: "click", capture: false }
    ],
    /* target 29 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.assigned" }, to: "" }
    ],
    /* target 30 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["toggle ", ""], expressions: [settings__e[20]], isMulti: false, firstExpression: settings__e[20] } },
      { type: 31, from: settings__e[21], to: "click", capture: false }
    ],
    /* target 31 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.mentioned" }, to: "" }
    ],
    /* target 32 */
    [
      { type: 11, to: "class", from: { $kind: "Interpolation", parts: ["toggle ", ""], expressions: [settings__e[22]], isMulti: false, firstExpression: settings__e[22] } },
      { type: 31, from: settings__e[23], to: "click", capture: false }
    ],
    /* target 33 */
    [
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "settings.notifications.statusChange" }, to: "" }
    ],
    /* target 34 */
    [
      { type: 31, from: settings__e[24], to: "click", capture: false },
      { type: 100, from: { $kind: "PrimitiveLiteral", value: "actions.save" }, to: "" }
    ]
  ],
  needsCompile: false
};
class Settings {
  static $au = settings_$au;
  // ==========================================================================
  // State
  // ==========================================================================
  /** User profile (editable copy) */
  profile = {
    name: currentUser.name,
    email: currentUser.email
  };
  /** Theme preference */
  theme = "system";
  /** Language preference */
  language = "en";
  /** Date format preference */
  dateFormat = "medium";
  /** Notification settings */
  notifications = {
    email: true,
    browser: false,
    assigned: true,
    mentioned: true,
    statusChange: false
  };
  /** Save confirmation message */
  showSavedMessage = false;
  // ==========================================================================
  // Options for dropdowns
  // ==========================================================================
  themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" }
  ];
  languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Espa\xF1ol" },
    { value: "fr", label: "Fran\xE7ais" },
    { value: "de", label: "Deutsch" }
  ];
  dateFormatOptions = [
    { value: "short", label: "01/15/24" },
    { value: "medium", label: "Jan 15, 2024" },
    { value: "long", label: "January 15, 2024" }
  ];
  // ==========================================================================
  // Methods
  // ==========================================================================
  /** Toggle a notification setting */
  toggleNotification(key) {
    this.notifications[key] = !this.notifications[key];
  }
  /** Save profile changes */
  saveProfile() {
    console.log("Saving profile:", this.profile);
    this.showSaveConfirmation();
  }
  /** Save preferences */
  savePreferences() {
    console.log("Saving preferences:", {
      theme: this.theme,
      language: this.language,
      dateFormat: this.dateFormat
    });
    this.showSaveConfirmation();
  }
  /** Save notification settings */
  saveNotifications() {
    console.log("Saving notifications:", this.notifications);
    this.showSaveConfirmation();
  }
  /** Show save confirmation temporarily */
  showSaveConfirmation() {
    this.showSavedMessage = true;
    setTimeout(() => {
      this.showSavedMessage = false;
    }, 3e3);
  }
  // ==========================================================================
  // Computed
  // ==========================================================================
  /** Current user's role for display */
  get userRole() {
    return currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  }
}
export {
  Settings
};
