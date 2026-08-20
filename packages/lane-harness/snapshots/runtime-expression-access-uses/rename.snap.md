# runtime-expression-access-uses rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## callback-local-filter-item

### Probe

```json
{
  "anchor": "filter(item => item.label)",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:6:20",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 19,
    "line": 5
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
    "placeholder": "item",
    "range": {
      "end": {
        "character": 23,
        "line": 5
      },
      "start": {
        "character": 19,
        "line": 5
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
                "character": 23,
                "line": 5
              },
              "start": {
                "character": 19,
                "line": 5
              }
            }
          },
          {
            "newText": "entry",
            "range": {
              "end": {
                "character": 31,
                "line": 5
              },
              "start": {
                "character": 27,
                "line": 5
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html",
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
    "item"
  ],
  "filesTouched": [
    "src/runtime-expression-access-uses-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "entry",
      "oldText": "item",
      "range": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "entry",
      "oldText": "item",
      "range": {
        "end": {
          "character": 31,
          "line": 5
        },
        "start": {
          "character": 27,
          "line": 5
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
diff --git a/src/runtime-expression-access-uses-app.html b/src/runtime-expression-access-uses-app.html
--- a/src/runtime-expression-access-uses-app.html
+++ b/src/runtime-expression-access-uses-app.html
@@ -1,32 +1,32 @@
 <template>
   <p data-case="conditional">${flag ? repeated.name : repeated.name}</p>
   <p data-case="interpolation-parts">${form.name} / ${form.name}</p>
   <p data-case="optional-short-circuit">${flag && form?.name}</p>
   <p data-case="derived-collection">
-    ${items.filter(item => item.label).map(item => item.id).join(',')}
+    ${items.filter(entry => entry.label).map(item => item.id).join(',')}
   </p>
   <p data-case="context-authority">
     ${$this.form.name} / ${items.map(item => $this.form.name + item.label).join(',')}
   </p>
   <p data-case="bare-context-authority">
     ${$this} / ${items.map(item => $this).length}
   </p>
   <p data-case="nested-callback-shadowing">
     ${items.map(item => items.map(item => item.label).join(',') + item.id).join('|')}
   </p>

   <input data-case="one-time" value.one-time="form.name">
   <input
     data-case="two-way-resources"
     value.two-way="form.name | suffix:converterSuffix & debounce:behaviorDelay"
   >
   <button data-case="listener-call" click.trigger="handle(form.name)">Handle</button>
   <button data-case="listener-assignment" click.trigger="form.name = fallbackName">Assign</button>

   <section
     repeat.for="item of items; key.bind: item.id; contextual.bind: contextualRepeat"
   >
     ${item.label}
     <span data-case="repeat-context-authority">${$this} / ${$parent}</span>
   </section>
 </template>
```

## form-name-all-access-modes

### Probe

```json
{
  "anchor": "value.one-time=\"form.name\"",
  "at": "name",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:18:52",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 51,
    "line": 17
  },
  "newName": "displayName",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "name",
    "range": {
      "end": {
        "character": 55,
        "line": 17
      },
      "start": {
        "character": 51,
        "line": 17
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
            "newText": "displayName",
            "range": {
              "end": {
                "character": 8,
                "line": 34
              },
              "start": {
                "character": 4,
                "line": 34
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 48,
                "line": 2
              },
              "start": {
                "character": 44,
                "line": 2
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 63,
                "line": 2
              },
              "start": {
                "character": 59,
                "line": 2
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 60,
                "line": 3
              },
              "start": {
                "character": 56,
                "line": 3
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 21,
                "line": 8
              },
              "start": {
                "character": 17,
                "line": 8
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 60,
                "line": 8
              },
              "start": {
                "character": 56,
                "line": 8
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 55,
                "line": 17
              },
              "start": {
                "character": 51,
                "line": 17
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 28,
                "line": 20
              },
              "start": {
                "character": 24,
                "line": 20
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 67,
                "line": 22
              },
              "start": {
                "character": 63,
                "line": 22
              }
            }
          },
          {
            "newText": "displayName",
            "range": {
              "end": {
                "character": 66,
                "line": 23
              },
              "start": {
                "character": 62,
                "line": 23
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html",
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
  "editCount": 10,
  "expectedOldTexts": [
    "name"
  ],
  "filesTouched": [
    "src/runtime-expression-access-uses-app.html",
    "src/runtime-expression-access-uses-app.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 48,
          "line": 2
        },
        "start": {
          "character": 44,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 63,
          "line": 2
        },
        "start": {
          "character": 59,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 21,
          "line": 8
        },
        "start": {
          "character": 17,
          "line": 8
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 60,
          "line": 8
        },
        "start": {
          "character": 56,
          "line": 8
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 55,
          "line": 17
        },
        "start": {
          "character": 51,
          "line": 17
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 28,
          "line": 20
        },
        "start": {
          "character": 24,
          "line": 20
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 67,
          "line": 22
        },
        "start": {
          "character": 63,
          "line": 22
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.html",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 66,
          "line": 23
        },
        "start": {
          "character": 62,
          "line": 23
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/runtime-expression-access-uses-app.ts",
      "newText": "displayName",
      "oldText": "name",
      "range": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
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
diff --git a/src/runtime-expression-access-uses-app.html b/src/runtime-expression-access-uses-app.html
--- a/src/runtime-expression-access-uses-app.html
+++ b/src/runtime-expression-access-uses-app.html
@@ -1,32 +1,32 @@
 <template>
   <p data-case="conditional">${flag ? repeated.name : repeated.name}</p>
-  <p data-case="interpolation-parts">${form.name} / ${form.name}</p>
-  <p data-case="optional-short-circuit">${flag && form?.name}</p>
+  <p data-case="interpolation-parts">${form.displayName} / ${form.displayName}</p>
+  <p data-case="optional-short-circuit">${flag && form?.displayName}</p>
   <p data-case="derived-collection">
     ${items.filter(item => item.label).map(item => item.id).join(',')}
   </p>
   <p data-case="context-authority">
-    ${$this.form.name} / ${items.map(item => $this.form.name + item.label).join(',')}
+    ${$this.form.displayName} / ${items.map(item => $this.form.displayName + item.label).join(',')}
   </p>
   <p data-case="bare-context-authority">
     ${$this} / ${items.map(item => $this).length}
   </p>
   <p data-case="nested-callback-shadowing">
     ${items.map(item => items.map(item => item.label).join(',') + item.id).join('|')}
   </p>

-  <input data-case="one-time" value.one-time="form.name">
+  <input data-case="one-time" value.one-time="form.displayName">
   <input
     data-case="two-way-resources"
-    value.two-way="form.name | suffix:converterSuffix & debounce:behaviorDelay"
+    value.two-way="form.displayName | suffix:converterSuffix & debounce:behaviorDelay"
   >
-  <button data-case="listener-call" click.trigger="handle(form.name)">Handle</button>
-  <button data-case="listener-assignment" click.trigger="form.name = fallbackName">Assign</button>
+  <button data-case="listener-call" click.trigger="handle(form.displayName)">Handle</button>
+  <button data-case="listener-assignment" click.trigger="form.displayName = fallbackName">Assign</button>

   <section
     repeat.for="item of items; key.bind: item.id; contextual.bind: contextualRepeat"
   >
     ${item.label}
     <span data-case="repeat-context-authority">${$this} / ${$parent}</span>
   </section>
 </template>
diff --git a/src/runtime-expression-access-uses-app.ts b/src/runtime-expression-access-uses-app.ts
--- a/src/runtime-expression-access-uses-app.ts
+++ b/src/runtime-expression-access-uses-app.ts
@@ -1,53 +1,53 @@
 import {
   customElement,
   valueConverter,
 } from '@aurelia/runtime-html';
 import template from './runtime-expression-access-uses-app.html';

 interface AccessUseItem {
   readonly id: string;
   readonly label: string;
 }

 @valueConverter('suffix')
 export class SuffixValueConverter {
   toView(value: string, suffix: string): string {
     return `${value}${suffix}`;
   }

   fromView(value: string, suffix: string): string {
     return value.endsWith(suffix)
       ? value.slice(0, -suffix.length)
       : value;
   }
 }

 @customElement({
   name: 'runtime-expression-access-uses-app',
   template,
 })
 export class RuntimeExpressionAccessUsesApp {
   flag = true;
   readonly repeated = {
     name: 'repeated',
   };
   readonly form = {
-    name: 'Ada',
+    displayName: 'Ada',
   };
   /**
    * Fallback display name retained for legacy listeners.
    * @deprecated Use form.name instead.
    */
   fallbackName = 'Grace';
   converterSuffix = '!';
   behaviorDelay = 25;
   contextualRepeat = true;
   readonly items: readonly AccessUseItem[] = [
     { id: 'one', label: 'One' },
     { id: 'two', label: 'Two' },
   ];

   handle(value: string): void {
     this.fallbackName = value;
   }
 }
```
