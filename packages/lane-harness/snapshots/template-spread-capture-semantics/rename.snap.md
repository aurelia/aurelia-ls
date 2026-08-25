# template-spread-capture-semantics rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...$bindables='spreadState'>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:31",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 30,
    "line": 1
  },
  "newName": "spreadModel",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "spreadState",
    "range": {
      "end": {
        "character": 41,
        "line": 1
      },
      "start": {
        "character": 30,
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
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 41,
                "line": 1
              },
              "start": {
                "character": 30,
                "line": 1
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 41,
                "line": 3
              },
              "start": {
                "character": 30,
                "line": 3
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 41,
                "line": 4
              },
              "start": {
                "character": 30,
                "line": 4
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 45,
                "line": 5
              },
              "start": {
                "character": 34,
                "line": 5
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 41,
                "line": 6
              },
              "start": {
                "character": 30,
                "line": 6
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 50,
                "line": 7
              },
              "start": {
                "character": 39,
                "line": 7
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 76,
                "line": 7
              },
              "start": {
                "character": 65,
                "line": 7
              }
            }
          },
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 101,
                "line": 7
              },
              "start": {
                "character": 90,
                "line": 7
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "spreadModel",
            "range": {
              "end": {
                "character": 13,
                "line": 35
              },
              "start": {
                "character": 2,
                "line": 35
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts",
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
  "editCount": 9,
  "expectedOldTexts": [
    "spreadState"
  ],
  "filesTouched": [
    "src/template-spread-capture-semantics-app.html",
    "src/template-spread-capture-semantics-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 41,
          "line": 1
        },
        "start": {
          "character": 30,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 41,
          "line": 3
        },
        "start": {
          "character": 30,
          "line": 3
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 30,
          "line": 4
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 45,
          "line": 5
        },
        "start": {
          "character": 34,
          "line": 5
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 41,
          "line": 6
        },
        "start": {
          "character": 30,
          "line": 6
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 50,
          "line": 7
        },
        "start": {
          "character": 39,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 76,
          "line": 7
        },
        "start": {
          "character": 65,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 101,
          "line": 7
        },
        "start": {
          "character": 90,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.ts",
      "newText": "spreadModel",
      "oldText": "spreadState",
      "range": {
        "end": {
          "character": 13,
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
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
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
-  <spread-card ...$bindables='spreadState'></spread-card>
+  <spread-card ...$bindables='spreadModel'></spread-card>
   <spread-card ...$bindables='spreadContainer.details'></spread-card>
-  <spread-card ...$bindables="spreadState"></spread-card>
-  <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
-  <spread-card $bindables.spread="spreadState"></spread-card>
-  <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
-  <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
+  <spread-card ...$bindables="spreadModel"></spread-card>
+  <spread-card ...$bindables="spreadModel & missingSpreadBehavior"></spread-card>
+  <spread-card $bindables.spread="spreadModel"></spread-card>
+  <spread-card ...$bindables="spreadModel | spreadIdentity"></spread-card>
+  <spread-card ...$bindables="{ title: spreadModel.title, count: spreadModel.count, tone: spreadModel.tone }"></spread-card>
   <spread-card repeat.for="card of spreadCards" ...card></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
     input-mark="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

   <no-capture-shell value.bind="capturedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
   <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
diff --git a/src/template-spread-capture-semantics-app.ts b/src/template-spread-capture-semantics-app.ts
--- a/src/template-spread-capture-semantics-app.ts
+++ b/src/template-spread-capture-semantics-app.ts
@@ -1,97 +1,97 @@
 import { customElement } from '@aurelia/runtime-html';
 import template from './template-spread-capture-semantics-app.html';
 import {
   CaptureShell,
   FilteredCaptureShell,
   NestedCaptureShell,
   NoCaptureShell,
 } from './capture-shell';
 import {
   CaseSpreadCard,
   SpreadCard,
   type SpreadCardState,
   SpreadIdentityValueConverter,
 } from './spread-card';

 class InheritedSpreadState {
   get title(): string {
     return 'inherited';
   }
 }

 @customElement({
   name: 'template-spread-capture-semantics-app',
   template,
   dependencies: [
     SpreadCard,
     CaseSpreadCard,
     CaptureShell,
     FilteredCaptureShell,
     NoCaptureShell,
     NestedCaptureShell,
     SpreadIdentityValueConverter,
   ],
 })
 export class TemplateSpreadCaptureSemanticsApp {
-  spreadState: SpreadCardState = {
+  spreadModel: SpreadCardState = {
     title: 'primary',
     count: 1,
     tone: 'calm',
     internal: 'must-not-spread',
   };
   spreadContainer = {
     details: {
       title: 'nested',
       count: 2,
       tone: 'bright',
       internal: 'must-not-spread',
     },
   };
   spreadCards: SpreadCardState[] = [
     {
       title: 'first repeated',
       count: 3,
       tone: 'quiet',
       internal: 'must-not-spread',
     },
     {
       title: 'second repeated',
       count: 4,
       tone: 'loud',
       internal: 'must-not-spread',
     },
   ];
   aliasShaped = {
     'accent-tone': 'attribute-alias-does-not-match',
     title: 'alias-shape',
   };
   caseSpreadState = {
     displayLabel: 'exact case',
     displaylabel: 'wrong case',
   };
   nullableSpread: SpreadCardState | null = null;
   optionalSpread: { title?: string; count: number } = { count: 5 };
   presentUndefinedSpread: { title: string | undefined } = { title: undefined };
   unionSpread: { title: string } | { count: number } = { title: 'union' };
   dynamicSpread: unknown = { tone: 'dynamic' };
   callableSpread = Object.assign(() => undefined, { title: 'not-an-object' });
   broadFunctionSpread: Function = () => undefined;
   broadObjectSpread: Object = { title: 'broad-object' };
   constructableSpread = InheritedSpreadState;
   inheritedSpread = new InheritedSpreadState();
   primitiveSpread = 1;
   noBindableSpread = { title: 'source-only' };
   shellLabel = 'shell';
   capturedValue = 'captured';
   isActive = true;
   showCapture = true;
   capturedEvent = '';

   handleCaptured(event: MouseEvent): void {
     this.capturedEvent = event.type;
   }

   handleLabelEvent(event: Event): void {
     this.capturedEvent = event.type;
   }
 }
```

## spread-inferred-member

### Probe

```json
{
  "anchor": "...$bindables='spreadContainer.details'",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:47",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 46,
    "line": 2
  },
  "newName": "payload",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "details",
    "range": {
      "end": {
        "character": 53,
        "line": 2
      },
      "start": {
        "character": 46,
        "line": 2
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
            "newText": "payload",
            "range": {
              "end": {
                "character": 53,
                "line": 2
              },
              "start": {
                "character": 46,
                "line": 2
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "payload",
            "range": {
              "end": {
                "character": 11,
                "line": 42
              },
              "start": {
                "character": 4,
                "line": 42
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts",
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
  "editCount": 2,
  "expectedOldTexts": [
    "details"
  ],
  "filesTouched": [
    "src/template-spread-capture-semantics-app.html",
    "src/template-spread-capture-semantics-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "payload",
      "oldText": "details",
      "range": {
        "end": {
          "character": 53,
          "line": 2
        },
        "start": {
          "character": 46,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.ts",
      "newText": "payload",
      "oldText": "details",
      "range": {
        "end": {
          "character": 11,
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
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
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
   <spread-card ...$bindables='spreadState'></spread-card>
-  <spread-card ...$bindables='spreadContainer.details'></spread-card>
+  <spread-card ...$bindables='spreadContainer.payload'></spread-card>
   <spread-card ...$bindables="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
   <spread-card $bindables.spread="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
   <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
   <spread-card repeat.for="card of spreadCards" ...card></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
     input-mark="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

   <no-capture-shell value.bind="capturedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
   <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
diff --git a/src/template-spread-capture-semantics-app.ts b/src/template-spread-capture-semantics-app.ts
--- a/src/template-spread-capture-semantics-app.ts
+++ b/src/template-spread-capture-semantics-app.ts
@@ -1,97 +1,97 @@
 import { customElement } from '@aurelia/runtime-html';
 import template from './template-spread-capture-semantics-app.html';
 import {
   CaptureShell,
   FilteredCaptureShell,
   NestedCaptureShell,
   NoCaptureShell,
 } from './capture-shell';
 import {
   CaseSpreadCard,
   SpreadCard,
   type SpreadCardState,
   SpreadIdentityValueConverter,
 } from './spread-card';

 class InheritedSpreadState {
   get title(): string {
     return 'inherited';
   }
 }

 @customElement({
   name: 'template-spread-capture-semantics-app',
   template,
   dependencies: [
     SpreadCard,
     CaseSpreadCard,
     CaptureShell,
     FilteredCaptureShell,
     NoCaptureShell,
     NestedCaptureShell,
     SpreadIdentityValueConverter,
   ],
 })
 export class TemplateSpreadCaptureSemanticsApp {
   spreadState: SpreadCardState = {
     title: 'primary',
     count: 1,
     tone: 'calm',
     internal: 'must-not-spread',
   };
   spreadContainer = {
-    details: {
+    payload: {
       title: 'nested',
       count: 2,
       tone: 'bright',
       internal: 'must-not-spread',
     },
   };
   spreadCards: SpreadCardState[] = [
     {
       title: 'first repeated',
       count: 3,
       tone: 'quiet',
       internal: 'must-not-spread',
     },
     {
       title: 'second repeated',
       count: 4,
       tone: 'loud',
       internal: 'must-not-spread',
     },
   ];
   aliasShaped = {
     'accent-tone': 'attribute-alias-does-not-match',
     title: 'alias-shape',
   };
   caseSpreadState = {
     displayLabel: 'exact case',
     displaylabel: 'wrong case',
   };
   nullableSpread: SpreadCardState | null = null;
   optionalSpread: { title?: string; count: number } = { count: 5 };
   presentUndefinedSpread: { title: string | undefined } = { title: undefined };
   unionSpread: { title: string } | { count: number } = { title: 'union' };
   dynamicSpread: unknown = { tone: 'dynamic' };
   callableSpread = Object.assign(() => undefined, { title: 'not-an-object' });
   broadFunctionSpread: Function = () => undefined;
   broadObjectSpread: Object = { title: 'broad-object' };
   constructableSpread = InheritedSpreadState;
   inheritedSpread = new InheritedSpreadState();
   primitiveSpread = 1;
   noBindableSpread = { title: 'source-only' };
   shellLabel = 'shell';
   capturedValue = 'captured';
   isActive = true;
   showCapture = true;
   capturedEvent = '';

   handleCaptured(event: MouseEvent): void {
     this.capturedEvent = event.type;
   }

   handleLabelEvent(event: Event): void {
     this.capturedEvent = event.type;
   }
 }
```

## spread-repeat-local

### Probe

```json
{
  "anchor": "repeat.for=\"card of spreadCards\" ...card",
  "at": "card",
  "atOccurrence": 2,
  "displayPosition": "src/template-spread-capture-semantics-app.html:9:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
    "line": 8
  },
  "newName": "entry",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "card",
    "range": {
      "end": {
        "character": 55,
        "line": 8
      },
      "start": {
        "character": 51,
        "line": 8
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
            "newText": "entry",
            "range": {
              "end": {
                "character": 31,
                "line": 8
              },
              "start": {
                "character": 27,
                "line": 8
              }
            }
          },
          {
            "newText": "entry",
            "range": {
              "end": {
                "character": 55,
                "line": 8
              },
              "start": {
                "character": 51,
                "line": 8
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
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
    "card"
  ],
  "filesTouched": [
    "src/template-spread-capture-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "entry",
      "oldText": "card",
      "range": {
        "end": {
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "entry",
      "oldText": "card",
      "range": {
        "end": {
          "character": 55,
          "line": 8
        },
        "start": {
          "character": 51,
          "line": 8
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
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
   <spread-card ...$bindables='spreadState'></spread-card>
   <spread-card ...$bindables='spreadContainer.details'></spread-card>
   <spread-card ...$bindables="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
   <spread-card $bindables.spread="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
   <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
-  <spread-card repeat.for="card of spreadCards" ...card></spread-card>
+  <spread-card repeat.for="entry of spreadCards" ...entry></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
     input-mark="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

   <no-capture-shell value.bind="capturedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
   <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
```

## spread-value-converter-resource

### Probe

```json
{
  "anchor": "spreadState | spreadIdentity",
  "at": "spreadIdentity",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:7:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
    "line": 6
  },
  "newName": "spreadCopy",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "spreadIdentity",
    "range": {
      "end": {
        "character": 58,
        "line": 6
      },
      "start": {
        "character": 44,
        "line": 6
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
            "newText": "spreadCopy",
            "range": {
              "end": {
                "character": 31,
                "line": 32
              },
              "start": {
                "character": 17,
                "line": 32
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/spread-card.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "spreadCopy",
            "range": {
              "end": {
                "character": 58,
                "line": 6
              },
              "start": {
                "character": 44,
                "line": 6
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
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
    "spreadIdentity"
  ],
  "filesTouched": [
    "src/spread-card.ts",
    "src/template-spread-capture-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/spread-card.ts",
      "newText": "spreadCopy",
      "oldText": "spreadIdentity",
      "range": {
        "end": {
          "character": 31,
          "line": 32
        },
        "start": {
          "character": 17,
          "line": 32
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "spreadCopy",
      "oldText": "spreadIdentity",
      "range": {
        "end": {
          "character": 58,
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
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
diff --git a/src/spread-card.ts b/src/spread-card.ts
--- a/src/spread-card.ts
+++ b/src/spread-card.ts
@@ -1,38 +1,38 @@
 import {
   bindable,
   customElement,
   valueConverter,
 } from '@aurelia/runtime-html';

 export interface SpreadCardState {
   title: string;
   count: number;
   tone: string;
   internal: string;
 }

 @customElement({
   name: 'spread-card',
   template: '<template>${title}:${count}:${tone}:${internal}</template>',
 })
 export class SpreadCard {
   @bindable title = '';
   @bindable count = 0;
   @bindable({ attribute: 'accent-tone' }) tone = '';
   internal = 'internal';
 }

 @customElement({
   name: 'case-spread-card',
   template: '<template>${displayLabel}</template>',
 })
 export class CaseSpreadCard {
   @bindable displayLabel = '';
 }

-@valueConverter('spreadIdentity')
+@valueConverter('spreadCopy')
 export class SpreadIdentityValueConverter {
   toView(value: SpreadCardState): SpreadCardState {
     return value;
   }
 }
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
   <spread-card ...$bindables='spreadState'></spread-card>
   <spread-card ...$bindables='spreadContainer.details'></spread-card>
   <spread-card ...$bindables="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
   <spread-card $bindables.spread="spreadState"></spread-card>
-  <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
+  <spread-card ...$bindables="spreadState | spreadCopy"></spread-card>
   <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
   <spread-card repeat.for="card of spreadCards" ...card></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
     input-mark="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

   <no-capture-shell value.bind="capturedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
   <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
```

## captured-expression-member

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:31:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 30
  },
  "newName": "forwardedValue",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "capturedValue",
    "range": {
      "end": {
        "character": 29,
        "line": 30
      },
      "start": {
        "character": 16,
        "line": 30
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
            "newText": "forwardedValue",
            "range": {
              "end": {
                "character": 29,
                "line": 30
              },
              "start": {
                "character": 16,
                "line": 30
              }
            }
          },
          {
            "newText": "forwardedValue",
            "range": {
              "end": {
                "character": 45,
                "line": 51
              },
              "start": {
                "character": 32,
                "line": 51
              }
            }
          },
          {
            "newText": "forwardedValue",
            "range": {
              "end": {
                "character": 49,
                "line": 53
              },
              "start": {
                "character": 36,
                "line": 53
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "forwardedValue",
            "range": {
              "end": {
                "character": 15,
                "line": 84
              },
              "start": {
                "character": 2,
                "line": 84
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts",
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
  "editCount": 4,
  "expectedOldTexts": [
    "capturedValue"
  ],
  "filesTouched": [
    "src/template-spread-capture-semantics-app.html",
    "src/template-spread-capture-semantics-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "forwardedValue",
      "oldText": "capturedValue",
      "range": {
        "end": {
          "character": 29,
          "line": 30
        },
        "start": {
          "character": 16,
          "line": 30
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "forwardedValue",
      "oldText": "capturedValue",
      "range": {
        "end": {
          "character": 45,
          "line": 51
        },
        "start": {
          "character": 32,
          "line": 51
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "forwardedValue",
      "oldText": "capturedValue",
      "range": {
        "end": {
          "character": 49,
          "line": 53
        },
        "start": {
          "character": 36,
          "line": 53
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.ts",
      "newText": "forwardedValue",
      "oldText": "capturedValue",
      "range": {
        "end": {
          "character": 15,
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
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
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
   <spread-card ...$bindables='spreadState'></spread-card>
   <spread-card ...$bindables='spreadContainer.details'></spread-card>
   <spread-card ...$bindables="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
   <spread-card $bindables.spread="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
   <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
   <spread-card repeat.for="card of spreadCards" ...card></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
-    value.bind="capturedValue"
+    value.bind="forwardedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
     input-mark="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

-  <no-capture-shell value.bind="capturedValue"></no-capture-shell>
+  <no-capture-shell value.bind="forwardedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
-  <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
+  <nested-capture-shell value.bind="forwardedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
diff --git a/src/template-spread-capture-semantics-app.ts b/src/template-spread-capture-semantics-app.ts
--- a/src/template-spread-capture-semantics-app.ts
+++ b/src/template-spread-capture-semantics-app.ts
@@ -1,97 +1,97 @@
 import { customElement } from '@aurelia/runtime-html';
 import template from './template-spread-capture-semantics-app.html';
 import {
   CaptureShell,
   FilteredCaptureShell,
   NestedCaptureShell,
   NoCaptureShell,
 } from './capture-shell';
 import {
   CaseSpreadCard,
   SpreadCard,
   type SpreadCardState,
   SpreadIdentityValueConverter,
 } from './spread-card';

 class InheritedSpreadState {
   get title(): string {
     return 'inherited';
   }
 }

 @customElement({
   name: 'template-spread-capture-semantics-app',
   template,
   dependencies: [
     SpreadCard,
     CaseSpreadCard,
     CaptureShell,
     FilteredCaptureShell,
     NoCaptureShell,
     NestedCaptureShell,
     SpreadIdentityValueConverter,
   ],
 })
 export class TemplateSpreadCaptureSemanticsApp {
   spreadState: SpreadCardState = {
     title: 'primary',
     count: 1,
     tone: 'calm',
     internal: 'must-not-spread',
   };
   spreadContainer = {
     details: {
       title: 'nested',
       count: 2,
       tone: 'bright',
       internal: 'must-not-spread',
     },
   };
   spreadCards: SpreadCardState[] = [
     {
       title: 'first repeated',
       count: 3,
       tone: 'quiet',
       internal: 'must-not-spread',
     },
     {
       title: 'second repeated',
       count: 4,
       tone: 'loud',
       internal: 'must-not-spread',
     },
   ];
   aliasShaped = {
     'accent-tone': 'attribute-alias-does-not-match',
     title: 'alias-shape',
   };
   caseSpreadState = {
     displayLabel: 'exact case',
     displaylabel: 'wrong case',
   };
   nullableSpread: SpreadCardState | null = null;
   optionalSpread: { title?: string; count: number } = { count: 5 };
   presentUndefinedSpread: { title: string | undefined } = { title: undefined };
   unionSpread: { title: string } | { count: number } = { title: 'union' };
   dynamicSpread: unknown = { tone: 'dynamic' };
   callableSpread = Object.assign(() => undefined, { title: 'not-an-object' });
   broadFunctionSpread: Function = () => undefined;
   broadObjectSpread: Object = { title: 'broad-object' };
   constructableSpread = InheritedSpreadState;
   inheritedSpread = new InheritedSpreadState();
   primitiveSpread = 1;
   noBindableSpread = { title: 'source-only' };
   shellLabel = 'shell';
-  capturedValue = 'captured';
+  forwardedValue = 'captured';
   isActive = true;
   showCapture = true;
   capturedEvent = '';

   handleCaptured(event: MouseEvent): void {
     this.capturedEvent = event.type;
   }

   handleLabelEvent(event: Event): void {
     this.capturedEvent = event.type;
   }
 }
```

## receiver-local-custom-attribute

### Probe

```json
{
  "anchor": "input-mark=\"receiver-local-mark\"",
  "at": "input-mark",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:36:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
  },
  "newName": "input-stamp",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "input-mark",
    "range": {
      "end": {
        "character": 14,
        "line": 35
      },
      "start": {
        "character": 4,
        "line": 35
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
            "newText": "input-stamp",
            "range": {
              "end": {
                "character": 28,
                "line": 6
              },
              "start": {
                "character": 18,
                "line": 6
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-resources.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "input-stamp",
            "range": {
              "end": {
                "character": 19,
                "line": 2
              },
              "start": {
                "character": 9,
                "line": 2
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-shell.html",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "input-stamp",
            "range": {
              "end": {
                "character": 14,
                "line": 35
              },
              "start": {
                "character": 4,
                "line": 35
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html",
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
    "input-mark",
    "input"
  ],
  "filesTouched": [
    "src/capture-resources.ts",
    "src/capture-shell.html",
    "src/template-spread-capture-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/capture-resources.ts",
      "newText": "input-stamp",
      "oldText": "input-mark",
      "range": {
        "end": {
          "character": 28,
          "line": 6
        },
        "start": {
          "character": 18,
          "line": 6
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/capture-shell.html",
      "newText": "input-stamp",
      "oldText": "input-mark",
      "range": {
        "end": {
          "character": 19,
          "line": 2
        },
        "start": {
          "character": 9,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-spread-capture-semantics-app.html",
      "newText": "input-stamp",
      "oldText": "input-mark",
      "range": {
        "end": {
          "character": 14,
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
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
diff --git a/src/capture-resources.ts b/src/capture-resources.ts
--- a/src/capture-resources.ts
+++ b/src/capture-resources.ts
@@ -1,15 +1,15 @@
 import {
   bindable,
   customAttribute,
   templateController,
 } from '@aurelia/runtime-html';

-@customAttribute('input-mark')
+@customAttribute('input-stamp')
 export class InputMark {
   @bindable value = '';
 }

 @templateController('inner-gate')
 export class InnerGate {
   @bindable value = true;
 }
diff --git a/src/capture-shell.html b/src/capture-shell.html
--- a/src/capture-shell.html
+++ b/src/capture-shell.html
@@ -1,6 +1,6 @@
 <template>
   <input ...$attrs>
-  <input input-mark="direct-mark">
+  <input input-stamp="direct-mark">
   <div inner-gate.bind="true">direct gate</div>
   <span>${label}</span>
 </template>
diff --git a/src/template-spread-capture-semantics-app.html b/src/template-spread-capture-semantics-app.html
--- a/src/template-spread-capture-semantics-app.html
+++ b/src/template-spread-capture-semantics-app.html
@@ -1,55 +1,55 @@
 <template>
   <spread-card ...$bindables='spreadState'></spread-card>
   <spread-card ...$bindables='spreadContainer.details'></spread-card>
   <spread-card ...$bindables="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState & missingSpreadBehavior"></spread-card>
   <spread-card $bindables.spread="spreadState"></spread-card>
   <spread-card ...$bindables="spreadState | spreadIdentity"></spread-card>
   <spread-card ...$bindables="{ title: spreadState.title, count: spreadState.count, tone: spreadState.tone }"></spread-card>
   <spread-card repeat.for="card of spreadCards" ...card></spread-card>
   <spread-card ...$bindables='aliasShaped'></spread-card>
   <spread-card ...$bindables='nullableSpread'></spread-card>
   <spread-card ...$bindables='optionalSpread'></spread-card>
   <spread-card ...$bindables='presentUndefinedSpread'></spread-card>
   <spread-card ...$bindables='unionSpread'></spread-card>
   <spread-card ...$bindables='dynamicSpread'></spread-card>
   <spread-card ...$bindables='callableSpread'></spread-card>
   <spread-card ...$bindables='broadFunctionSpread'></spread-card>
   <spread-card ...$bindables='broadObjectSpread'></spread-card>
   <spread-card ...$bindables='constructableSpread'></spread-card>
   <spread-card ...$bindables='inheritedSpread'></spread-card>
   <spread-card ...$bindables='primitiveSpread'></spread-card>
   <no-capture-shell ...$bindables='noBindableSpread'></no-capture-shell>
   <case-spread-card ...$bindables="caseSpreadState"></case-spread-card>

   <spread-card ...$element="spreadState"></spread-card>
   <spread-card $element.spread="spreadState"></spread-card>
   <div ...$bindables="spreadState"></div>
   <div ...$attrs></div>

   <capture-shell
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     label.trigger="handleLabelEvent($event)"
     data-note="clean-captured-note"
-    input-mark="receiver-local-mark">
+    input-stamp="receiver-local-mark">
   </capture-shell>

   <capture-shell
     if.bind="showCapture"
     label.bind="shellLabel"
     label.trigger="handleLabelEvent($event)"
     value.bind="capturedValue"
     active.class="isActive"
     click.trigger="handleCaptured($event)"
     input-mark="captured-mark"
     inner-gate.bind="showCapture"
     slot="named"
     data-note="captured-note">
   </capture-shell>

   <no-capture-shell value.bind="capturedValue"></no-capture-shell>
   <filtered-capture-shell class="host-class" data-note="filtered-note"></filtered-capture-shell>
   <nested-capture-shell value.bind="capturedValue | nestedIdentity" input-mark="nested-mark"></nested-capture-shell>
 </template>
```
