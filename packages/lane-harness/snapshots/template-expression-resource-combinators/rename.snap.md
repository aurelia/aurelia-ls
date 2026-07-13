# template-expression-resource-combinators rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inner-behavior-behind-missing-outer

### Probe

```json
{
  "anchor": "${item.label & innerAudit:'inner' & missingBehavior}",
  "at": "innerAudit",
  "atOccurrence": 1,
  "displayPosition": "src/resource-combinator-gallery.html:14:65",
  "file": "src/resource-combinator-gallery.html",
  "lspPosition": {
    "character": 64,
    "line": 13
  },
  "newName": "innerTrace",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "innerAudit",
    "range": {
      "end": {
        "character": 74,
        "line": 13
      },
      "start": {
        "character": 64,
        "line": 13
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
            "newText": "innerTrace",
            "range": {
              "end": {
                "character": 28,
                "line": 32
              },
              "start": {
                "character": 18,
                "line": 32
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/expression-resources.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "innerTrace",
            "range": {
              "end": {
                "character": 59,
                "line": 11
              },
              "start": {
                "character": 49,
                "line": 11
              }
            }
          },
          {
            "newText": "innerTrace",
            "range": {
              "end": {
                "character": 57,
                "line": 12
              },
              "start": {
                "character": 47,
                "line": 12
              }
            }
          },
          {
            "newText": "innerTrace",
            "range": {
              "end": {
                "character": 78,
                "line": 12
              },
              "start": {
                "character": 68,
                "line": 12
              }
            }
          },
          {
            "newText": "innerTrace",
            "range": {
              "end": {
                "character": 74,
                "line": 13
              },
              "start": {
                "character": 64,
                "line": 13
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html",
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
    "innerAudit"
  ],
  "filesTouched": [
    "src/expression-resources.ts",
    "src/resource-combinator-gallery.html"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/expression-resources.ts",
      "newText": "innerTrace",
      "oldText": "innerAudit",
      "range": {
        "end": {
          "character": 28,
          "line": 32
        },
        "start": {
          "character": 18,
          "line": 32
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/resource-combinator-gallery.html",
      "newText": "innerTrace",
      "oldText": "innerAudit",
      "range": {
        "end": {
          "character": 59,
          "line": 11
        },
        "start": {
          "character": 49,
          "line": 11
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/resource-combinator-gallery.html",
      "newText": "innerTrace",
      "oldText": "innerAudit",
      "range": {
        "end": {
          "character": 57,
          "line": 12
        },
        "start": {
          "character": 47,
          "line": 12
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/resource-combinator-gallery.html",
      "newText": "innerTrace",
      "oldText": "innerAudit",
      "range": {
        "end": {
          "character": 78,
          "line": 12
        },
        "start": {
          "character": 68,
          "line": 12
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/resource-combinator-gallery.html",
      "newText": "innerTrace",
      "oldText": "innerAudit",
      "range": {
        "end": {
          "character": 74,
          "line": 13
        },
        "start": {
          "character": 64,
          "line": 13
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
diff --git a/src/expression-resources.ts b/src/expression-resources.ts
--- a/src/expression-resources.ts
+++ b/src/expression-resources.ts
@@ -1,41 +1,41 @@
 import { bindingBehavior, valueConverter } from 'aurelia';

 @valueConverter('numberText')
 export class NumberTextValueConverter {
   toView(value: number, prefix: string): string {
     return `${prefix}${value}`;
   }

   fromView(value: string, prefix: string): number {
     return Number(value.slice(prefix.length));
   }
 }

 @valueConverter('textLength')
 export class TextLengthValueConverter {
   toView(value: string): number {
     return value.length;
   }

   fromView(value: number): string {
     return String(value);
   }
 }

 @valueConverter('identityValue')
 export class IdentityValueConverter {}

 @bindingBehavior('typedAudit')
 export class TypedAuditBindingBehavior {
   bind(_scope: unknown, _binding: unknown, _label: string, _threshold: number): void {}
 }

-@bindingBehavior('innerAudit')
+@bindingBehavior('innerTrace')
 export class InnerAuditBindingBehavior {
   bind(_scope: unknown, _binding: unknown, _label: string): void {}
 }

 @bindingBehavior('outerAudit')
 export class OuterAuditBindingBehavior {
   bind(_scope: unknown, _binding: unknown, _label: string): void {}
 }
diff --git a/src/resource-combinator-gallery.html b/src/resource-combinator-gallery.html
--- a/src/resource-combinator-gallery.html
+++ b/src/resource-combinator-gallery.html
@@ -1,20 +1,20 @@
 <template>
   <p class="converter-chain-valid">${count | numberText:prefix | textLength}</p>
   <p class="converter-input-invalid">${count | textLength}</p>
   <p class="converter-argument-invalid">${count | numberText:limit}</p>
   <p class="converter-identity">${item | identityValue}</p>
   <p class="converter-behavior-combined">${count | numberText:prefix & typedAudit:'combined':limit}</p>
   <numeric-target class="converter-writeback-chain" value.two-way="count | numberText:prefix | textLength"></numeric-target>

   <p class="behavior-arguments-valid">${item.label & typedAudit:'view':limit}</p>
   <p class="behavior-argument-types-invalid">${item.label & typedAudit:limit:'wrong'}</p>
   <p class="behavior-argument-member-invalid">${item.label & typedAudit:missingLabel:limit}</p>
-  <p class="behavior-chain-order">${item.label & innerAudit:'inner' & outerAudit:'outer'}</p>
-  <p class="behavior-duplicate">${item.label & innerAudit:'first' & innerAudit:'second'}</p>
-  <p class="behavior-inner-behind-missing-outer">${item.label & innerAudit:'inner' & missingBehavior}</p>
+  <p class="behavior-chain-order">${item.label & innerTrace:'inner' & outerAudit:'outer'}</p>
+  <p class="behavior-duplicate">${item.label & innerTrace:'first' & innerTrace:'second'}</p>
+  <p class="behavior-inner-behind-missing-outer">${item.label & innerTrace:'inner' & missingBehavior}</p>
   <p class="converter-behind-missing-behavior">${count | numberText:prefix & missingBehavior}</p>
   <p class="converter-after-behavior">${item.label & typedAudit:'reverse':limit | numberText:prefix}</p>
   <p class="missing-converter">${count | missingConverter}</p>
   <p class="converter-inner-behind-missing-outer">${count | numberText:prefix | missingConverter}</p>
   <p class="missing-behavior">${item.label & missingBehavior}</p>
 </template>
```
