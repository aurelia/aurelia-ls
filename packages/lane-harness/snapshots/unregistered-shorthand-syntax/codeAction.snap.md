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

### Diagnostic pull

```json
{
  "diagnosticCount": 2,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
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
      "hasEdit": false,
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
      "anomaly": null,
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
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": null,
        "typeScriptDiagnosticCode": null
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
      "rangeText": ":value=\"value\"",
      "relatedInformation": [],
      "severity": "error",
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
          "queryKind": "template-code-actions",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
            "targetSourceCoverage": "all"
          },
          "resolve": {
            "actionIdentity": "template-code-action:sha256:cfa8577c92f9520c69ee8b8d8544c72b2002b9f493124e210531db0e8e51cea5",
            "position": {
              "character": 7,
              "line": 0
            },
            "schema": "aurelia.template-code-action-resolve/1",
            "textDocument": {
              "uri": "fixtures://pressure/unregistered-shorthand-syntax/src/unregistered-shorthand-syntax-app.html"
            }
          }
        }
      },
      "diagnosticCount": 1,
      "disabled": null,
      "index": 0,
      "isPreferred": true,
      "kind": "quickfix",
      "resolution": {
        "error": null,
        "hasCommand": false,
        "hasEdit": true,
        "outcome": "resolved"
      },
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
          "source": "documentChanges",
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
          "source": "documentChanges",
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
