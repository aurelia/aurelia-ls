# unregistered-shorthand-syntax codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-shorthand-syntax`
Probe file: `packages/lane-harness/probes/unregistered-shorthand-syntax.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## register-shorthand-syntax-value

### Probe

```json
{
  "anchor": "<input :value=\"value\">",
  "at": ":value",
  "atOccurrence": 1,
  "displayPosition": "src/unregistered-shorthand-syntax-app.html:1:8",
  "file": "src/unregistered-shorthand-syntax-app.html",
  "lspPosition": {
    "character": 7,
    "line": 0
  },
  "occurrence": 1
}
```

### codeAction

```json
{
  "actionCount": 1,
  "actions": [
    {
      "diagnosticCount": 1,
      "hasCommand": false,
      "hasEdit": true,
      "isPreferred": true,
      "kind": "quickfix",
      "title": "Register ShortHandBindingSyntax for runtime-html.short-hand-binding-syntax"
    }
  ],
  "outcome": "result"
}
```

### Context diagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-html.short-hand-binding-syntax",
        "missingInputs": [
          "runtime-html.short-hand-binding-syntax"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
          "targetSourceCoverage": "all"
        },
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Attribute \":value\" uses Aurelia shorthand binding syntax, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 21,
          "line": 0
        },
        "start": {
          "character": 7,
          "line": 0
        }
      },
      "source": "aurelia"
    }
  ]
}
```

### Actions

```json
{
  "actionCount": 1,
  "actions": [
    {
      "command": null,
      "data": {
        "semanticRuntime": {
          "actionKind": "register-framework-capability",
          "actionTarget": {
            "memberName": "runtime-html.short-hand-binding-syntax",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/unregistered-shorthand-syntax-app.html",
                "path": "src/unregistered-shorthand-syntax-app.html",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-shorthand-syntax"
              },
              "end": 21,
              "kind": "source-span-address",
              "label": "src/unregistered-shorthand-syntax-app.html@7..21",
              "path": "src/unregistered-shorthand-syntax-app.html",
              "role": "range",
              "sourceFileRole": "template",
              "sourceWorkspaceKey": "unregistered-shorthand-syntax",
              "start": 7
            },
            "targetKind": "framework-capability",
            "typeDisplay": "@aurelia/runtime-html"
          },
          "diagnosticKind": "framework-capability-not-registered",
          "queryKind": "template-code-actions",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "applicationKind": "single-edit",
            "changeDomain": "app-source",
            "editPlanState": "available",
            "planKind": "framework-capability-registration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "suggestionKind": "register-framework-capability"
        }
      },
      "diagnosticCount": 1,
      "disabled": null,
      "index": 0,
      "isPreferred": true,
      "kind": "quickfix",
      "title": "Register ShortHandBindingSyntax for runtime-html.short-hand-binding-syntax"
    }
  ]
}
```

### In-memory apply

```json
{
  "actions": [
    {
      "anomalies": [],
      "editCount": 2,
      "expectedOldTexts": [
        "{ Aurelia, StandardConfiguration }",
        ""
      ],
      "filesTouched": [
        "src/main.ts"
      ],
      "index": 0,
      "outcome": "applied",
      "title": "Register ShortHandBindingSyntax for runtime-html.short-hand-binding-syntax",
      "validation": [
        {
          "file": "src/main.ts",
          "newText": "{ Aurelia, StandardConfiguration, ShortHandBindingSyntax }",
          "oldText": "{ Aurelia, StandardConfiguration }",
          "range": {
            "end": {
              "character": 41,
              "line": 0
            },
            "start": {
              "character": 7,
              "line": 0
            }
          },
          "source": "changes",
          "status": "ok"
        },
        {
          "file": "src/main.ts",
          "newText": ".register(ShortHandBindingSyntax)\n  ",
          "oldText": "",
          "range": {
            "end": {
              "character": 2,
              "line": 5
            },
            "start": {
              "character": 2,
              "line": 5
            }
          },
          "source": "changes",
          "status": "ok"
        }
      ]
    }
  ],
  "expectedOldTexts": [
    "{ Aurelia, StandardConfiguration }",
    ""
  ]
}
```

### Applied diffs

#### 0: Register ShortHandBindingSyntax for runtime-html.short-hand-binding-syntax

```diff
diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,10 +1,11 @@
-import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
+import { Aurelia, StandardConfiguration, ShortHandBindingSyntax } from '@aurelia/runtime-html';
 import { UnregisteredShorthandSyntaxApp } from './unregistered-shorthand-syntax-app';

 new Aurelia()
   .register(StandardConfiguration)
+  .register(ShortHandBindingSyntax)
   .app({
     host: document.body,
     component: UnregisteredShorthandSyntaxApp,
   })
   .start();
```
