# template-ref-listener-semantics rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-ref-listener-semantics`
Probe file: `packages/lane-harness/probes/template-ref-listener-semantics.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## named-custom-attribute-ref-target

### Probe

```json
{
  "anchor": "focus-ring.ref=\"focusRingController\"",
  "at": "focus-ring",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:9:3",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 2,
    "line": 8
  },
  "newName": "focus-halo",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "focus-ring",
    "range": {
      "end": {
        "character": 12,
        "line": 8
      },
      "start": {
        "character": 2,
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
            "newText": "focus-halo",
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
          "uri": "fixtures://pressure/template-ref-listener-semantics/src/focus-ring.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "focus-halo",
            "range": {
              "end": {
                "character": 12,
                "line": 7
              },
              "start": {
                "character": 2,
                "line": 7
              }
            }
          },
          {
            "newText": "focus-halo",
            "range": {
              "end": {
                "character": 12,
                "line": 8
              },
              "start": {
                "character": 2,
                "line": 8
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html",
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
    "focus-ring",
    "focus"
  ],
  "filesTouched": [
    "src/focus-ring.ts",
    "src/template-ref-listener-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/focus-ring.ts",
      "newText": "focus-halo",
      "oldText": "focus-ring",
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
      "file": "src/template-ref-listener-semantics-app.html",
      "newText": "focus-halo",
      "oldText": "focus-ring",
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-ref-listener-semantics-app.html",
      "newText": "focus-halo",
      "oldText": "focus-ring",
      "range": {
        "end": {
          "character": 12,
          "line": 8
        },
        "start": {
          "character": 2,
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
diff --git a/src/focus-ring.ts b/src/focus-ring.ts
--- a/src/focus-ring.ts
+++ b/src/focus-ring.ts
@@ -1,18 +1,18 @@
 import {
   customAttribute,
   INode,
 } from '@aurelia/runtime-html';
 import { resolve } from '@aurelia/kernel';

-@customAttribute('focus-ring')
+@customAttribute('focus-halo')
 export class FocusRing {
   private readonly element = resolve(INode) as HTMLElement;

   binding(): void {
     this.element.dataset['focusRing'] = 'active';
   }

   unbinding(): void {
     delete this.element.dataset['focusRing'];
   }
 }
diff --git a/src/template-ref-listener-semantics-app.html b/src/template-ref-listener-semantics-app.html
--- a/src/template-ref-listener-semantics-app.html
+++ b/src/template-ref-listener-semantics-app.html
@@ -1,27 +1,27 @@
 <input ref="plainElement">
 <input element.ref="explicitElement">

 <ref-panel
   component.ref="panelComponent"
   controller.ref="panelController"
   view-model.ref="legacyPanel"
-  focus-ring
-  focus-ring.ref="focusRingController"
+  focus-halo
+  focus-halo.ref="focusRingController"
   ref-panel.ref="namedPanel"
   saved.trigger="handleCustom($event)">
 </ref-panel>

 <div view.ref="unsupportedView"></div>
 <div component.ref="missingComponent"></div>
 <ref-panel missing.ref="missingNamedTarget"></ref-panel>
 <input ref="readonlyElement">
 <input ref="wrongElement">

 <button type="button" click.trigger:prevent="handleMouse($event)">Mouse</button>
 <input keydown.trigger:ctrl+enter="handleKeyboard($event)">
 <div pointerdown.capture:stop="handlePointer($event)"></div>
 <button type="button" click.trigger="handlerReference">Reference</button>
 <button type="button" click.trigger="handleMouse($event) & self">Self</button>
 <input value.bind="selfValue & self">
 <button type="button" click.delegate="handleMouse($event)">Legacy</button>
 <button type="button" click.trigger="handleMouse($event.missing)">Invalid event member</button>
```
