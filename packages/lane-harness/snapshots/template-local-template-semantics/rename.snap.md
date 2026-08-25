# template-local-template-semantics rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-resource-use-before-declaration

### Probe

```json
{
  "anchor": "<mode-panel\n    one-time-value.bind",
  "at": "mode-panel",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:2:4",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 3,
    "line": 1
  },
  "newName": "display-panel",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "mode-panel",
    "range": {
      "end": {
        "character": 13,
        "line": 1
      },
      "start": {
        "character": 3,
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
            "newText": "display-panel",
            "range": {
              "end": {
                "character": 13,
                "line": 1
              },
              "start": {
                "character": 3,
                "line": 1
              }
            }
          },
          {
            "newText": "display-panel",
            "range": {
              "end": {
                "character": 14,
                "line": 9
              },
              "start": {
                "character": 4,
                "line": 9
              }
            }
          },
          {
            "newText": "display-panel",
            "range": {
              "end": {
                "character": 13,
                "line": 11
              },
              "start": {
                "character": 3,
                "line": 11
              }
            }
          },
          {
            "newText": "display-panel",
            "range": {
              "end": {
                "character": 14,
                "line": 20
              },
              "start": {
                "character": 4,
                "line": 20
              }
            }
          },
          {
            "newText": "display-panel",
            "range": {
              "end": {
                "character": 41,
                "line": 22
              },
              "start": {
                "character": 31,
                "line": 22
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html",
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
  "editCount": 5,
  "expectedOldTexts": [
    "mode-panel",
    "mode"
  ],
  "filesTouched": [
    "src/template-local-template-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "display-panel",
      "oldText": "mode-panel",
      "range": {
        "end": {
          "character": 13,
          "line": 1
        },
        "start": {
          "character": 3,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "display-panel",
      "oldText": "mode-panel",
      "range": {
        "end": {
          "character": 14,
          "line": 9
        },
        "start": {
          "character": 4,
          "line": 9
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "display-panel",
      "oldText": "mode-panel",
      "range": {
        "end": {
          "character": 13,
          "line": 11
        },
        "start": {
          "character": 3,
          "line": 11
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "display-panel",
      "oldText": "mode-panel",
      "range": {
        "end": {
          "character": 14,
          "line": 20
        },
        "start": {
          "character": 4,
          "line": 20
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "display-panel",
      "oldText": "mode-panel",
      "range": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
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
diff --git a/src/template-local-template-semantics-app.html b/src/template-local-template-semantics-app.html
--- a/src/template-local-template-semantics-app.html
+++ b/src/template-local-template-semantics-app.html
@@ -1,60 +1,60 @@
 <template>
-  <mode-panel
+  <display-panel
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="defaultValue"
     mixed-value.bind="defaultValue"
     camel-case-value.bind="camelCaseValue">
-  </mode-panel>
+  </display-panel>

-  <mode-panel
+  <display-panel
     repeat.for="entry of entries"
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="entry.label"
     mixed-value.bind="$index"
     camel-case-value.bind="camelCaseValue">
-  </mode-panel>
+  </display-panel>

-  <template as-custom-element="mode-panel" class="local-panel">
+  <template as-custom-element="display-panel" class="local-panel">
     <bindable name="oneTimeValue" attribute="one-time-value" mode="oneTime"></bindable>
     <bindable name="toViewValue" attribute="to-view-value" mode="toView"></bindable>
     <bindable name="fromViewValue" attribute="from-view-value" mode="fromView"></bindable>
     <bindable name="twoWayValue" attribute="two-way-value" mode="twoWay"></bindable>
     <bindable name="defaultValue" attribute="default-value" mode="default"></bindable>
     <bindable name="mixedValue"></bindable>
     <bindable name="unusedValue"></bindable>
     <bindable name="camelCaseValue"></bindable>

     <section>
       <h2>${oneTimeValue}</h2>
       <p>${toViewValue}</p>
       <input value.bind="fromViewValue">
       <input value.bind="twoWayValue">
       <local-icon value.bind="defaultValue"></local-icon>
       <p>${mixedValue}</p>
       <owner-badge value.bind="camelCaseValue"></owner-badge>
       <nested-note note.bind="toViewValue"></nested-note>
       <div switch.bind="defaultValue">
         <span case="default">${twoWayValue}</span>
         <span default-case>${oneTimeValue}</span>
       </div>
     </section>

     <template as-custom-element="nested-note">
       <bindable name="note"></bindable>
       <small>${note}</small>
     </template>
   </template>

   <template as-custom-element="local-icon">
     <bindable name="value"></bindable>
     <span>${value}</span>
   </template>

   <footer>${ownerSummary}</footer>
 </template>
```

## local-bindable-property

### Probe

```json
{
  "anchor": "<bindable name=\"oneTimeValue\"",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:21",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 20,
    "line": 23
  },
  "newName": "primaryValue",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "oneTimeValue",
    "range": {
      "end": {
        "character": 32,
        "line": 23
      },
      "start": {
        "character": 20,
        "line": 23
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
            "newText": "primaryValue",
            "range": {
              "end": {
                "character": 32,
                "line": 23
              },
              "start": {
                "character": 20,
                "line": 23
              }
            }
          },
          {
            "newText": "primaryValue",
            "range": {
              "end": {
                "character": 24,
                "line": 33
              },
              "start": {
                "character": 12,
                "line": 33
              }
            }
          },
          {
            "newText": "primaryValue",
            "range": {
              "end": {
                "character": 41,
                "line": 43
              },
              "start": {
                "character": 29,
                "line": 43
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html",
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
    "oneTimeValue"
  ],
  "filesTouched": [
    "src/template-local-template-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primaryValue",
      "oldText": "oneTimeValue",
      "range": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primaryValue",
      "oldText": "oneTimeValue",
      "range": {
        "end": {
          "character": 24,
          "line": 33
        },
        "start": {
          "character": 12,
          "line": 33
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primaryValue",
      "oldText": "oneTimeValue",
      "range": {
        "end": {
          "character": 41,
          "line": 43
        },
        "start": {
          "character": 29,
          "line": 43
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
diff --git a/src/template-local-template-semantics-app.html b/src/template-local-template-semantics-app.html
--- a/src/template-local-template-semantics-app.html
+++ b/src/template-local-template-semantics-app.html
@@ -1,60 +1,60 @@
 <template>
   <mode-panel
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="defaultValue"
     mixed-value.bind="defaultValue"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <mode-panel
     repeat.for="entry of entries"
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="entry.label"
     mixed-value.bind="$index"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <template as-custom-element="mode-panel" class="local-panel">
-    <bindable name="oneTimeValue" attribute="one-time-value" mode="oneTime"></bindable>
+    <bindable name="primaryValue" attribute="one-time-value" mode="oneTime"></bindable>
     <bindable name="toViewValue" attribute="to-view-value" mode="toView"></bindable>
     <bindable name="fromViewValue" attribute="from-view-value" mode="fromView"></bindable>
     <bindable name="twoWayValue" attribute="two-way-value" mode="twoWay"></bindable>
     <bindable name="defaultValue" attribute="default-value" mode="default"></bindable>
     <bindable name="mixedValue"></bindable>
     <bindable name="unusedValue"></bindable>
     <bindable name="camelCaseValue"></bindable>

     <section>
-      <h2>${oneTimeValue}</h2>
+      <h2>${primaryValue}</h2>
       <p>${toViewValue}</p>
       <input value.bind="fromViewValue">
       <input value.bind="twoWayValue">
       <local-icon value.bind="defaultValue"></local-icon>
       <p>${mixedValue}</p>
       <owner-badge value.bind="camelCaseValue"></owner-badge>
       <nested-note note.bind="toViewValue"></nested-note>
       <div switch.bind="defaultValue">
         <span case="default">${twoWayValue}</span>
-        <span default-case>${oneTimeValue}</span>
+        <span default-case>${primaryValue}</span>
       </div>
     </section>

     <template as-custom-element="nested-note">
       <bindable name="note"></bindable>
       <small>${note}</small>
     </template>
   </template>

   <template as-custom-element="local-icon">
     <bindable name="value"></bindable>
     <span>${value}</span>
   </template>

   <footer>${ownerSummary}</footer>
 </template>
```

## local-bindable-alias

### Probe

```json
{
  "anchor": "attribute=\"one-time-value\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:46",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 45,
    "line": 23
  },
  "newName": "primary-value",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "one-time-value",
    "range": {
      "end": {
        "character": 59,
        "line": 23
      },
      "start": {
        "character": 45,
        "line": 23
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
            "newText": "primary-value",
            "range": {
              "end": {
                "character": 18,
                "line": 2
              },
              "start": {
                "character": 4,
                "line": 2
              }
            }
          },
          {
            "newText": "primary-value",
            "range": {
              "end": {
                "character": 18,
                "line": 13
              },
              "start": {
                "character": 4,
                "line": 13
              }
            }
          },
          {
            "newText": "primary-value",
            "range": {
              "end": {
                "character": 59,
                "line": 23
              },
              "start": {
                "character": 45,
                "line": 23
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html",
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
    "one-time-value",
    "one"
  ],
  "filesTouched": [
    "src/template-local-template-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primary-value",
      "oldText": "one-time-value",
      "range": {
        "end": {
          "character": 18,
          "line": 2
        },
        "start": {
          "character": 4,
          "line": 2
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primary-value",
      "oldText": "one-time-value",
      "range": {
        "end": {
          "character": 18,
          "line": 13
        },
        "start": {
          "character": 4,
          "line": 13
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "primary-value",
      "oldText": "one-time-value",
      "range": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
          "line": 23
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
diff --git a/src/template-local-template-semantics-app.html b/src/template-local-template-semantics-app.html
--- a/src/template-local-template-semantics-app.html
+++ b/src/template-local-template-semantics-app.html
@@ -1,60 +1,60 @@
 <template>
   <mode-panel
-    one-time-value.bind="oneTimeValue"
+    primary-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="defaultValue"
     mixed-value.bind="defaultValue"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <mode-panel
     repeat.for="entry of entries"
-    one-time-value.bind="oneTimeValue"
+    primary-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="entry.label"
     mixed-value.bind="$index"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <template as-custom-element="mode-panel" class="local-panel">
-    <bindable name="oneTimeValue" attribute="one-time-value" mode="oneTime"></bindable>
+    <bindable name="oneTimeValue" attribute="primary-value" mode="oneTime"></bindable>
     <bindable name="toViewValue" attribute="to-view-value" mode="toView"></bindable>
     <bindable name="fromViewValue" attribute="from-view-value" mode="fromView"></bindable>
     <bindable name="twoWayValue" attribute="two-way-value" mode="twoWay"></bindable>
     <bindable name="defaultValue" attribute="default-value" mode="default"></bindable>
     <bindable name="mixedValue"></bindable>
     <bindable name="unusedValue"></bindable>
     <bindable name="camelCaseValue"></bindable>

     <section>
       <h2>${oneTimeValue}</h2>
       <p>${toViewValue}</p>
       <input value.bind="fromViewValue">
       <input value.bind="twoWayValue">
       <local-icon value.bind="defaultValue"></local-icon>
       <p>${mixedValue}</p>
       <owner-badge value.bind="camelCaseValue"></owner-badge>
       <nested-note note.bind="toViewValue"></nested-note>
       <div switch.bind="defaultValue">
         <span case="default">${twoWayValue}</span>
         <span default-case>${oneTimeValue}</span>
       </div>
     </section>

     <template as-custom-element="nested-note">
       <bindable name="note"></bindable>
       <small>${note}</small>
     </template>
   </template>

   <template as-custom-element="local-icon">
     <bindable name="value"></bindable>
     <span>${value}</span>
   </template>

   <footer>${ownerSummary}</footer>
 </template>
```

## local-bindable-mode-refusal

### Probe

```json
{
  "anchor": "mode=\"oneTime\"",
  "at": "oneTime",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:68",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 67,
    "line": 23
  },
  "newName": "renamedMode",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": null
}
```

### rename

```json
{
  "error": {
    "code": -32803,
    "data": {
      "candidates": [],
      "mappingFailures": [],
      "reason": "cursor-not-on-renameable-reference"
    },
    "message": "The cursor is not on a renameable template reference for the selected member."
  },
  "outcome": "error"
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
  "editCount": 0,
  "expectedOldTexts": [
    "oneTime"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._

## nested-local-resource

### Probe

```json
{
  "anchor": "<nested-note note.bind",
  "at": "nested-note",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:41:8",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 7,
    "line": 40
  },
  "newName": "detail-note",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "nested-note",
    "range": {
      "end": {
        "character": 18,
        "line": 40
      },
      "start": {
        "character": 7,
        "line": 40
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
            "newText": "detail-note",
            "range": {
              "end": {
                "character": 18,
                "line": 40
              },
              "start": {
                "character": 7,
                "line": 40
              }
            }
          },
          {
            "newText": "detail-note",
            "range": {
              "end": {
                "character": 56,
                "line": 40
              },
              "start": {
                "character": 45,
                "line": 40
              }
            }
          },
          {
            "newText": "detail-note",
            "range": {
              "end": {
                "character": 44,
                "line": 47
              },
              "start": {
                "character": 33,
                "line": 47
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html",
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
    "nested-note",
    "nested"
  ],
  "filesTouched": [
    "src/template-local-template-semantics-app.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "detail-note",
      "oldText": "nested-note",
      "range": {
        "end": {
          "character": 18,
          "line": 40
        },
        "start": {
          "character": 7,
          "line": 40
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "detail-note",
      "oldText": "nested-note",
      "range": {
        "end": {
          "character": 56,
          "line": 40
        },
        "start": {
          "character": 45,
          "line": 40
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/template-local-template-semantics-app.html",
      "newText": "detail-note",
      "oldText": "nested-note",
      "range": {
        "end": {
          "character": 44,
          "line": 47
        },
        "start": {
          "character": 33,
          "line": 47
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
diff --git a/src/template-local-template-semantics-app.html b/src/template-local-template-semantics-app.html
--- a/src/template-local-template-semantics-app.html
+++ b/src/template-local-template-semantics-app.html
@@ -1,60 +1,60 @@
 <template>
   <mode-panel
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="defaultValue"
     mixed-value.bind="defaultValue"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <mode-panel
     repeat.for="entry of entries"
     one-time-value.bind="oneTimeValue"
     to-view-value.bind="toViewValue"
     from-view-value.bind="fromViewValue"
     two-way-value.bind="twoWayValue"
     default-value.bind="entry.label"
     mixed-value.bind="$index"
     camel-case-value.bind="camelCaseValue">
   </mode-panel>

   <template as-custom-element="mode-panel" class="local-panel">
     <bindable name="oneTimeValue" attribute="one-time-value" mode="oneTime"></bindable>
     <bindable name="toViewValue" attribute="to-view-value" mode="toView"></bindable>
     <bindable name="fromViewValue" attribute="from-view-value" mode="fromView"></bindable>
     <bindable name="twoWayValue" attribute="two-way-value" mode="twoWay"></bindable>
     <bindable name="defaultValue" attribute="default-value" mode="default"></bindable>
     <bindable name="mixedValue"></bindable>
     <bindable name="unusedValue"></bindable>
     <bindable name="camelCaseValue"></bindable>

     <section>
       <h2>${oneTimeValue}</h2>
       <p>${toViewValue}</p>
       <input value.bind="fromViewValue">
       <input value.bind="twoWayValue">
       <local-icon value.bind="defaultValue"></local-icon>
       <p>${mixedValue}</p>
       <owner-badge value.bind="camelCaseValue"></owner-badge>
-      <nested-note note.bind="toViewValue"></nested-note>
+      <detail-note note.bind="toViewValue"></detail-note>
       <div switch.bind="defaultValue">
         <span case="default">${twoWayValue}</span>
         <span default-case>${oneTimeValue}</span>
       </div>
     </section>

-    <template as-custom-element="nested-note">
+    <template as-custom-element="detail-note">
       <bindable name="note"></bindable>
       <small>${note}</small>
     </template>
   </template>

   <template as-custom-element="local-icon">
     <bindable name="value"></bindable>
     <span>${value}</span>
   </template>

   <footer>${ownerSummary}</footer>
 </template>
```
