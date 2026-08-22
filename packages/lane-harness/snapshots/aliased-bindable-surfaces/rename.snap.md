# aliased-bindable-surfaces rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/aliased-bindable-surfaces`
Probe file: `packages/lane-harness/probes/aliased-bindable-surfaces.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-property-labelText-skips-explicit-alias

### Probe

```json
{
  "anchor": "${labelText}",
  "at": "labelText",
  "atOccurrence": 1,
  "displayPosition": "src/product-card.html:3:8",
  "file": "src/product-card.html",
  "lspPosition": {
    "character": 7,
    "line": 2
  },
  "newName": "headlineText",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "labelText",
    "range": {
      "end": {
        "character": 16,
        "line": 2
      },
      "start": {
        "character": 7,
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
            "newText": "headlineText",
            "range": {
              "end": {
                "character": 16,
                "line": 2
              },
              "start": {
                "character": 7,
                "line": 2
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "headlineText",
            "range": {
              "end": {
                "character": 53,
                "line": 9
              },
              "start": {
                "character": 44,
                "line": 9
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts",
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
    "labelText"
  ],
  "filesTouched": [
    "src/product-card.html",
    "src/product-card.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/product-card.html",
      "newText": "headlineText",
      "oldText": "labelText",
      "range": {
        "end": {
          "character": 16,
          "line": 2
        },
        "start": {
          "character": 7,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/product-card.ts",
      "newText": "headlineText",
      "oldText": "labelText",
      "range": {
        "end": {
          "character": 53,
          "line": 9
        },
        "start": {
          "character": 44,
          "line": 9
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
diff --git a/src/product-card.html b/src/product-card.html
--- a/src/product-card.html
+++ b/src/product-card.html
@@ -1,5 +1,5 @@
 <article>
   <h2>${title}</h2>
-  <p>${labelText}</p>
+  <p>${headlineText}</p>
   <span>${tone}</span>
 </article>
diff --git a/src/product-card.ts b/src/product-card.ts
--- a/src/product-card.ts
+++ b/src/product-card.ts
@@ -1,12 +1,12 @@
 import { bindable, customElement } from 'aurelia';
 import template from './product-card.html';

 @customElement({
   name: 'product-card',
   template,
 })
 export class ProductCard {
   @bindable title = '';
-  @bindable({ attribute: 'display-label' }) labelText = '';
+  @bindable({ attribute: 'display-label' }) headlineText = '';
   @bindable({ attribute: 'accent-tone' }) tone = '';
 }
```

## bindable-alias-display-label-top-level

### Probe

```json
{
  "anchor": "display-label.bind=\"aliasLabel\"",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:4:5",
  "file": "src/app.html",
  "lspPosition": {
    "character": 4,
    "line": 3
  },
  "newName": "headline-label",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "display-label",
    "range": {
      "end": {
        "character": 17,
        "line": 3
      },
      "start": {
        "character": 4,
        "line": 3
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
            "newText": "headline-label",
            "range": {
              "end": {
                "character": 17,
                "line": 3
              },
              "start": {
                "character": 4,
                "line": 3
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "headline-label",
            "range": {
              "end": {
                "character": 39,
                "line": 9
              },
              "start": {
                "character": 26,
                "line": 9
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts",
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
    "display-label",
    "display"
  ],
  "filesTouched": [
    "src/app.html",
    "src/product-card.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "headline-label",
      "oldText": "display-label",
      "range": {
        "end": {
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/product-card.ts",
      "newText": "headline-label",
      "oldText": "display-label",
      "range": {
        "end": {
          "character": 39,
          "line": 9
        },
        "start": {
          "character": 26,
          "line": 9
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
@@ -1,9 +1,9 @@
 <main>
   <product-card
     title.bind="titleText"
-    display-label.bind="aliasLabel"
+    headline-label.bind="aliasLabel"
     accent-tone.bind="accentTone">
   </product-card>

   <section display-hint="display-label.bind: aliasLabel; tone.bind: accentTone"></section>
 </main>
diff --git a/src/product-card.ts b/src/product-card.ts
--- a/src/product-card.ts
+++ b/src/product-card.ts
@@ -1,12 +1,12 @@
 import { bindable, customElement } from 'aurelia';
 import template from './product-card.html';

 @customElement({
   name: 'product-card',
   template,
 })
 export class ProductCard {
   @bindable title = '';
-  @bindable({ attribute: 'display-label' }) labelText = '';
+  @bindable({ attribute: 'headline-label' }) labelText = '';
   @bindable({ attribute: 'accent-tone' }) tone = '';
 }
```

## bindable-alias-display-label-inline-multi-binding

### Probe

```json
{
  "anchor": "display-hint=\"display-label.bind: aliasLabel",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:8:26",
  "file": "src/app.html",
  "lspPosition": {
    "character": 25,
    "line": 7
  },
  "newName": "hint-label",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "display-label",
    "range": {
      "end": {
        "character": 38,
        "line": 7
      },
      "start": {
        "character": 25,
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
            "newText": "hint-label",
            "range": {
              "end": {
                "character": 38,
                "line": 7
              },
              "start": {
                "character": 25,
                "line": 7
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html",
          "version": 1
        }
      },
      {
        "edits": [
          {
            "newText": "hint-label",
            "range": {
              "end": {
                "character": 39,
                "line": 6
              },
              "start": {
                "character": 26,
                "line": 6
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/aliased-bindable-surfaces/src/display-hint.ts",
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
    "display-label",
    "display"
  ],
  "filesTouched": [
    "src/app.html",
    "src/display-hint.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "hint-label",
      "oldText": "display-label",
      "range": {
        "end": {
          "character": 38,
          "line": 7
        },
        "start": {
          "character": 25,
          "line": 7
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/display-hint.ts",
      "newText": "hint-label",
      "oldText": "display-label",
      "range": {
        "end": {
          "character": 39,
          "line": 6
        },
        "start": {
          "character": 26,
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
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,9 +1,9 @@
 <main>
   <product-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     accent-tone.bind="accentTone">
   </product-card>

-  <section display-hint="display-label.bind: aliasLabel; tone.bind: accentTone"></section>
+  <section display-hint="hint-label.bind: aliasLabel; tone.bind: accentTone"></section>
 </main>
diff --git a/src/display-hint.ts b/src/display-hint.ts
--- a/src/display-hint.ts
+++ b/src/display-hint.ts
@@ -1,9 +1,9 @@
 import { bindable, customAttribute } from 'aurelia';

 @customAttribute({
   name: 'display-hint',
 })
 export class DisplayHint {
-  @bindable({ attribute: 'display-label' }) labelText = '';
+  @bindable({ attribute: 'hint-label' }) labelText = '';
   @bindable tone = '';
 }
```
