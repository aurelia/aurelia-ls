# runtime-html-view-factory-provider-errors rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-view-factory-provider-errors`
Probe file: `packages/lane-harness/probes/runtime-html-view-factory-provider-errors.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## template-controller-view-factory-template

### Probe

```json
{
  "anchor": "<div view-factory-template>",
  "at": "view-factory-template",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-html-view-factory-provider-errors-app.html:2:6",
  "file": "src/runtime-html-view-factory-provider-errors-app.html",
  "lspPosition": {
    "character": 5,
    "line": 1
  },
  "newName": "view-factory-panel",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "view-factory-template",
    "range": {
      "end": {
        "character": 26,
        "line": 1
      },
      "start": {
        "character": 5,
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
    "changes": {
      "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.html": [
        {
          "newText": "view-factory-panel",
          "range": {
            "end": {
              "character": 26,
              "line": 1
            },
            "start": {
              "character": 5,
              "line": 1
            }
          }
        }
      ],
      "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts": [
        {
          "newText": "view-factory-panel",
          "range": {
            "end": {
              "character": 30,
              "line": 28
            },
            "start": {
              "character": 9,
              "line": 28
            }
          }
        }
      ]
    }
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
    "view-factory-template",
    "view"
  ],
  "filesTouched": [
    "src/runtime-html-view-factory-provider-errors-app.html",
    "src/runtime-html-view-factory-provider-errors-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/runtime-html-view-factory-provider-errors-app.html",
      "newText": "view-factory-panel",
      "oldText": "view-factory-template",
      "range": {
        "end": {
          "character": 26,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "source": "changes",
      "status": "ok"
    },
    {
      "file": "src/runtime-html-view-factory-provider-errors-app.ts",
      "newText": "view-factory-panel",
      "oldText": "view-factory-template",
      "range": {
        "end": {
          "character": 30,
          "line": 28
        },
        "start": {
          "character": 9,
          "line": 28
        }
      },
      "source": "changes",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/runtime-html-view-factory-provider-errors-app.html b/src/runtime-html-view-factory-provider-errors-app.html
--- a/src/runtime-html-view-factory-provider-errors-app.html
+++ b/src/runtime-html-view-factory-provider-errors-app.html
@@ -1,4 +1,4 @@
 <div needs-view-factory></div>
-<div view-factory-template>
+<div view-factory-panel>
   <span>${message}</span>
 </div>
diff --git a/src/runtime-html-view-factory-provider-errors-app.ts b/src/runtime-html-view-factory-provider-errors-app.ts
--- a/src/runtime-html-view-factory-provider-errors-app.ts
+++ b/src/runtime-html-view-factory-provider-errors-app.ts
@@ -1,38 +1,38 @@
 import { resolve } from '@aurelia/kernel';
 import {
   customAttribute,
   IViewFactory,
 } from '@aurelia/runtime-html';

 export class RuntimeHtmlViewFactoryProviderErrorsApp {
   message = 'ViewFactory provider pressure';
 }

 @customAttribute('needs-view-factory')
 export class NeedsViewFactoryAttribute {
   private readonly viewFactory = resolve(IViewFactory);
   private readonly nestedFactoryConsumer = class {
     private readonly viewFactory = resolve(IViewFactory);

     get factoryName(): string {
       return this.viewFactory.name;
     }
   };

   get factoryName(): string {
     void this.nestedFactoryConsumer;
     return this.viewFactory.name;
   }
 }

 @customAttribute({
-  name: 'view-factory-template',
+  name: 'view-factory-panel',
   isTemplateController: true,
 })
 export class ViewFactoryTemplateController {
   private readonly viewFactory = resolve(IViewFactory);

   createName(): string {
     return this.viewFactory.name;
   }
 }
```
