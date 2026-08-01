# observation-binding-lifecycle rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inert-attribute-source-member

### Probe

```json
{
  "anchor": "data-lifecycle.attr=\"attributeFromView & fromView\"",
  "at": "attributeFromView",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:8:61",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 60,
    "line": 7
  },
  "newName": "attributeAfterView",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "attributeFromView",
    "range": {
      "end": {
        "character": 77,
        "line": 7
      },
      "start": {
        "character": 60,
        "line": 7
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
            "newText": "attributeAfterView",
            "range": {
              "end": {
                "character": 19,
                "line": 32
              },
              "start": {
                "character": 2,
                "line": 32
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "attributeAfterView",
            "range": {
              "end": {
                "character": 77,
                "line": 7
              },
              "start": {
                "character": 60,
                "line": 7
              }
            }
          },
          {
            "newText": "attributeAfterView",
            "range": {
              "end": {
                "character": 97,
                "line": 8
              },
              "start": {
                "character": 80,
                "line": 8
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.html",
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
    "attributeFromView"
  ],
  "filesTouched": [
    "src/observation-binding-lifecycle-app.html",
    "src/observation-binding-lifecycle-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/observation-binding-lifecycle-app.html",
      "newText": "attributeAfterView",
      "oldText": "attributeFromView",
      "range": {
        "end": {
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 60,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/observation-binding-lifecycle-app.html",
      "newText": "attributeAfterView",
      "oldText": "attributeFromView",
      "range": {
        "end": {
          "character": 97,
          "line": 8
        },
        "start": {
          "character": 80,
          "line": 8
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/observation-binding-lifecycle-app.ts",
      "newText": "attributeAfterView",
      "oldText": "attributeFromView",
      "range": {
        "end": {
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
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
diff --git a/src/observation-binding-lifecycle-app.html b/src/observation-binding-lifecycle-app.html
--- a/src/observation-binding-lifecycle-app.html
+++ b/src/observation-binding-lifecycle-app.html
@@ -1,33 +1,33 @@
 <template>
   <input data-case="reached-mode" value.to-view="message & twoWay">
   <input data-case="invalid-outer-blocks-mode" value.to-view="message & twoWay & self">
   <input data-case="missing-outer-blocks-mode" value.to-view="message & twoWay & missingBehavior">
   <input data-case="effective-from-view" value.to-view="effectiveFromView & fromView">
   <input data-case="effective-to-view" value.from-view="effectiveToView & toView">
   <input data-case="blocked-from-view" value.to-view="blockedFromView & fromView & missingBehavior">
-  <div data-case="attribute-from-view" data-lifecycle.attr="attributeFromView & fromView"></div>
-  <div data-case="converted-attribute-from-view" data-converted-lifecycle.attr="attributeFromView | identityValue & fromView"></div>
+  <div data-case="attribute-from-view" data-lifecycle.attr="attributeAfterView & fromView"></div>
+  <div data-case="converted-attribute-from-view" data-converted-lifecycle.attr="attributeAfterView | identityValue & fromView"></div>
   <div data-case="attribute-two-way" data-lifecycle.attr="attributeTwoWay & twoWay"></div>
   <div data-case="attribute-interpolation-from-view" title="${attributeInterpolationFromView & fromView}"></div>
   <div data-case="attribute-interpolation-two-way" title="${attributeInterpolationTwoWay & twoWay}"></div>
   <p data-case="content-from-view">${contentFromView & fromView}</p>
   <p data-case="content-two-way">${contentTwoWay & twoWay}</p>

   <input data-case="mode-before-update-trigger" value.to-view="message & updateTrigger:'blur' & twoWay">
   <input data-case="update-trigger-before-mode" value.to-view="message & twoWay & updateTrigger:'blur'">
   <input data-case="dynamic-update-trigger" value.to-view="message & updateTrigger:eventName & twoWay">
   <input data-case="attr-observer" value.to-view="message & attr">

   <button data-case="listener-self" click.trigger="handleClick($event) & self">Self</button>
   <p data-case="static-signals">${message & signal:'refresh':'theme'}</p>
   <p data-case="dynamic-signal">${message & signal:eventName}</p>
   <input data-case="debounce-default" value.bind="message & debounce">
   <input data-case="debounce-explicit" value.bind="message & debounce:350:['search','refresh']">
   <input data-case="throttle-explicit" value.bind="message & throttle:125:'flush'">
   <input data-case="rate-limit-open" value.bind="message & debounce:rateLimitDelay:['known',eventName]">

   <lifecycle-value-target value.to-view="reachedChildValue & twoWay"></lifecycle-value-target>
   <p>${reachedChildValue}</p>
   <lifecycle-value-target value.to-view="blockedChildValue & twoWay & self"></lifecycle-value-target>
   <p>${blockedChildValue}</p>
 </template>
diff --git a/src/observation-binding-lifecycle-app.ts b/src/observation-binding-lifecycle-app.ts
--- a/src/observation-binding-lifecycle-app.ts
+++ b/src/observation-binding-lifecycle-app.ts
@@ -1,41 +1,41 @@
 import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
 import template from './observation-binding-lifecycle-app.html';

 @valueConverter('identityValue')
 export class IdentityValueValueConverter {
   toView<T>(value: T): T {
     return value;
   }
 }

 @customElement({
   name: 'lifecycle-value-target',
   template: '<template></template>',
 })
 export class LifecycleValueTarget {
   @bindable value = 0;
 }

 @customElement({
   name: 'observation-binding-lifecycle-app',
   template,
   dependencies: [IdentityValueValueConverter],
 })
 export class ObservationBindingLifecycleApp {
   message = 'Lifecycle';
   eventName = 'blur';
   rateLimitDelay = 250;
   reachedChildValue = 'Reached';
   blockedChildValue = 'Blocked';
   effectiveFromView = 'Target writes this source';
   effectiveToView = 'Source writes the target';
   blockedFromView = 'Authored to-view remains effective';
-  attributeFromView = 'Attribute source retained without runtime evaluation';
+  attributeAfterView = 'Attribute source retained without runtime evaluation';
   attributeTwoWay = 'Attribute initial read with observation';
   attributeInterpolationFromView = 'Interpolation initial read without observation';
   attributeInterpolationTwoWay = 'Interpolation initial read with observation';
   contentFromView = 'Content initial read without observation';
   contentTwoWay = 'Content initial read with observation';

   handleClick(_event: Event): void {}
 }
```
