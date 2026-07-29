# mixed-form-surfaces rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-member-label

### Probe

```json
{
  "anchor": "${label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:2:5",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 4,
    "line": 1
  },
  "newName": "caption",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "label",
    "range": {
      "end": {
        "character": 9,
        "line": 1
      },
      "start": {
        "character": 4,
        "line": 1
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "caption",
            "range": {
              "end": {
                "character": 17,
                "line": 10
              },
              "start": {
                "character": 12,
                "line": 10
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "caption",
            "range": {
              "end": {
                "character": 9,
                "line": 1
              },
              "start": {
                "character": 4,
                "line": 1
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "caption",
            "range": {
              "end": {
                "character": 9,
                "line": 17
              },
              "start": {
                "character": 4,
                "line": 17
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/ticket-editor.html",
          "version": null
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "label"
  ],
  "filesTouched": [
    "src/components/loose-picklist.html",
    "src/components/loose-picklist.ts",
    "src/components/ticket-editor.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/components/loose-picklist.html",
      "newText": "caption",
      "oldText": "label",
      "range": {
        "end": {
          "character": 9,
          "line": 1
        },
        "start": {
          "character": 4,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/components/loose-picklist.ts",
      "newText": "caption",
      "oldText": "label",
      "range": {
        "end": {
          "character": 17,
          "line": 10
        },
        "start": {
          "character": 12,
          "line": 10
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/components/ticket-editor.html",
      "newText": "caption",
      "oldText": "label",
      "range": {
        "end": {
          "character": 9,
          "line": 17
        },
        "start": {
          "character": 4,
          "line": 17
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/components/loose-picklist.html b/src/components/loose-picklist.html
--- a/src/components/loose-picklist.html
+++ b/src/components/loose-picklist.html
@@ -1,8 +1,8 @@
 <label>
-  ${label}
+  ${caption}
   <select value.bind="value">
     <option repeat.for="option of options" model.bind="option">
       ${option.label || option}
     </option>
   </select>
 </label>
diff --git a/src/components/loose-picklist.ts b/src/components/loose-picklist.ts
--- a/src/components/loose-picklist.ts
+++ b/src/components/loose-picklist.ts
@@ -1,12 +1,12 @@
 import { BindingMode, bindable, customElement } from '@aurelia/runtime-html';
 import template from './loose-picklist.html';

 @customElement({
   name: 'loose-picklist',
   template,
 })
 export class LoosePicklist {
   @bindable({ mode: BindingMode.twoWay }) value: unknown = null;
   @bindable options: readonly unknown[] = [];
-  @bindable label = '';
+  @bindable caption = '';
 }
diff --git a/src/components/ticket-editor.html b/src/components/ticket-editor.html
--- a/src/components/ticket-editor.html
+++ b/src/components/ticket-editor.html
@@ -1,69 +1,69 @@
 <form
   if.bind="ticket"
   submit.trigger="submit()"
   class="ticket-editor ticket-${ticketId} ${preferredChannels.length === 0 ? 'missing-channel' : 'has-channel'}"
   data-ticket.attr="ticketId">
   <label for="customer-name">Customer</label>
   <input id="customer-name" value.bind="customerName">

   <label for="customer-email">Email</label>
   <input
     id="customer-email"
     type="email"
     value.bind="customerEmail"
     aria-invalid.attr="emailErrors.length > 0">
   <p repeat.for="message of emailErrors">${message}</p>

   <loose-picklist
-    label="Fulfillment"
+    caption="Fulfillment"
     value.bind="fulfillmentMethod"
     options.bind="fulfillmentOptions">
   </loose-picklist>

   <fieldset>
     <legend>Contact channels</legend>
     <label>
       <input type="checkbox" model.bind="emailChannel" checked.bind="preferredChannels">
       Email
     </label>
     <label>
       <input type="checkbox" model.bind="phoneChannel" checked.bind="preferredChannels">
       Phone
     </label>
     <label>
       <input type="checkbox" model.bind="smsChannel" checked.bind="preferredChannels">
       SMS
     </label>
   </fieldset>

   <fieldset>
     <legend>Channel consent</legend>
     <label>
       <input type="checkbox" model.bind="emailChannel" checked.bind="channelConsent">
       Email consent
     </label>
     <label>
       <input type="checkbox" model.bind="phoneChannel" checked.bind="channelConsent">
       Phone consent
     </label>
     <label>
       <input type="checkbox" model.bind="smsChannel" checked.bind="channelConsent">
       SMS consent
     </label>
   </fieldset>

   <label for="ticket-tags">Tags</label>
   <select id="ticket-tags" multiple value.bind="requestedTags">
     <option repeat.for="tag of tagOptions" model.bind="tag">${tag}</option>
   </select>

   <label for="priority">Priority</label>
   <input id="priority" type="number" value.bind="priority">

   <label for="floor">Loose floor field</label>
   <input id="floor" value.bind="looseFloor">

   <button type="submit" disabled.bind="ticketId == ''">
     Save ticket
   </button>
 </form>
```

## parent-specialized-option-label

### Probe

```json
{
  "anchor": "${option.label || option}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/components/loose-picklist.html:5:16",
  "file": "src/components/loose-picklist.html",
  "lspPosition": {
    "character": 15,
    "line": 4
  },
  "newName": "caption",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "label",
    "range": {
      "end": {
        "character": 20,
        "line": 4
      },
      "start": {
        "character": 15,
        "line": 4
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "caption",
            "range": {
              "end": {
                "character": 18,
                "line": 19
              },
              "start": {
                "character": 13,
                "line": 19
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/models/ticket.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "caption",
            "range": {
              "end": {
                "character": 20,
                "line": 4
              },
              "start": {
                "character": 15,
                "line": 4
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/components/loose-picklist.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 2,
  "expectedOldTexts": [
    "label"
  ],
  "filesTouched": [
    "src/components/loose-picklist.html",
    "src/models/ticket.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/components/loose-picklist.html",
      "newText": "caption",
      "oldText": "label",
      "range": {
        "end": {
          "character": 20,
          "line": 4
        },
        "start": {
          "character": 15,
          "line": 4
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/models/ticket.ts",
      "newText": "caption",
      "oldText": "label",
      "range": {
        "end": {
          "character": 18,
          "line": 19
        },
        "start": {
          "character": 13,
          "line": 19
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/components/loose-picklist.html b/src/components/loose-picklist.html
--- a/src/components/loose-picklist.html
+++ b/src/components/loose-picklist.html
@@ -1,8 +1,8 @@
 <label>
   ${label}
   <select value.bind="value">
     <option repeat.for="option of options" model.bind="option">
-      ${option.label || option}
+      ${option.caption || option}
     </option>
   </select>
 </label>
diff --git a/src/models/ticket.ts b/src/models/ticket.ts
--- a/src/models/ticket.ts
+++ b/src/models/ticket.ts
@@ -1,35 +1,35 @@
 export type FulfillmentMethod = 'ship' | 'pickup' | 'onsite';
 export type ContactChannel = 'email' | 'phone' | 'sms';

 export class CustomerProfile {
   id = '';
   displayName = '';
   email = '';
   phone = '';
   address = new PostalAddress();
 }

 export class PostalAddress {
   street = '';
   postalCode = '';
   countryCode = 'NL';
 }

 export class TicketOption<TValue> {
   constructor(
-    readonly label: string,
+    readonly caption: string,
     readonly value: TValue,
   ) {}
 }

 export interface TicketDraft {
   id: string;
   customer: CustomerProfile;
   fulfillmentMethod: FulfillmentMethod;
   preferredChannels: ContactChannel[];
   channelConsent: Map<ContactChannel, boolean>;
   requestedTags: string[];
   priority: number;
   metadata: Record<string, unknown>;
   looseFields: Record<string, string | number | boolean | null>;
 }
```

## receiver-rename-shellTone-no-overlap

### Probe

```json
{
  "anchor": "${shellTone}",
  "at": "shellTone",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:2:30",
  "file": "src/app.html",
  "lspPosition": {
    "character": 29,
    "line": 1
  },
  "newName": "theme",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "shellTone",
    "range": {
      "end": {
        "character": 38,
        "line": 1
      },
      "start": {
        "character": 29,
        "line": 1
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "theme",
            "range": {
              "end": {
                "character": 20,
                "line": 14
              },
              "start": {
                "character": 11,
                "line": 14
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "theme",
            "range": {
              "end": {
                "character": 38,
                "line": 1
              },
              "start": {
                "character": 29,
                "line": 1
              }
            }
          },
          {
            "newText": "theme",
            "range": {
              "end": {
                "character": 18,
                "line": 11
              },
              "start": {
                "character": 9,
                "line": 11
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "shellTone"
  ],
  "filesTouched": [
    "src/app.html",
    "src/app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "theme",
      "oldText": "shellTone",
      "range": {
        "end": {
          "character": 38,
          "line": 1
        },
        "start": {
          "character": 29,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.html",
      "newText": "theme",
      "oldText": "shellTone",
      "range": {
        "end": {
          "character": 18,
          "line": 11
        },
        "start": {
          "character": 9,
          "line": 11
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "theme",
      "oldText": "shellTone",
      "range": {
        "end": {
          "character": 20,
          "line": 14
        },
        "start": {
          "character": 11,
          "line": 14
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,21 +1,21 @@
 <main
-  class="support-workspace ${shellTone} ${selectedTicketId == '' ? 'empty-ticket' : 'active-ticket'}"
+  class="support-workspace ${theme} ${selectedTicketId == '' ? 'empty-ticket' : 'active-ticket'}"
   class.bind="shellClasses"
   data-selected-ticket.attr="selectedTicketId">
   <header>
     <h1>Support desk intake</h1>
     <label for="ticket-selector">Ticket</label>
     <select id="ticket-selector" value.bind="selectedTicketId">
       <option repeat.for="ticketId of ticketIds" model.bind="ticketId">${ticketId}</option>
     </select>
     <p if.bind="weakMetadata">${weakMetadata.source}</p>
-    <p>${shellTone.label}</p>
+    <p>${theme.label}</p>
   </header>

   <ticket-editor
     ticket-id.bind="selectedTicketId"
     draft.bind="selectedTicket"
     on-commit.bind="commitTicket"
     data-ticket-id.bind="selectedTicketId">
   </ticket-editor>
 </main>
diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,47 +1,47 @@
 import { customElement } from '@aurelia/runtime-html';
 import { resolve } from '@aurelia/kernel';
 import { SupportState } from './state/support-state';
 import { TicketEditor } from './components/ticket-editor';
 import template from './app.html';

 @customElement({
   name: 'support-desk-app',
   template,
   dependencies: [TicketEditor],
 })
 export class SupportDeskApp {
   private readonly state = resolve(SupportState);

-  readonly shellTone = 'ticket-shell';
+  readonly theme = 'ticket-shell';

   get selectedTicketId(): string {
     return this.state.selectedTicketId;
   }

   set selectedTicketId(value: string) {
     this.state.selectedTicketId = value;
   }

   get selectedTicket() {
     return this.state.selectedTicket;
   }

   get ticketIds(): readonly string[] {
     return this.state.ticketIds;
   }

   get weakMetadata() {
     return this.state.selectedTicket?.metadata;
   }

   get shellClasses(): Record<string, boolean> {
     return {
       'has-selection': this.selectedTicket != null,
       'has-channel-warning': this.state.selectedTicket?.preferredChannels.length === 0,
     };
   }

   commitTicket = (ticketId: string): void => {
     this.state.commitTicket(ticketId);
   };
 }
```
