# guidance-truth-canaries codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/guidance-truth-canaries`
Probe file: `packages/lane-harness/probes/guidance-truth-canaries.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## missing-root-member-titel

### Probe

```json
{
  "anchor": "${titel}",
  "at": "titel",
  "atOccurrence": 1,
  "displayPosition": "src/guidance-truth-canary-app.html:1:7",
  "file": "src/guidance-truth-canary-app.html",
  "lspPosition": {
    "character": 6,
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
      "title": "Declare member 'titel' on GuidanceTruthCanaryApp"
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
      "code": "missing-expression-member",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "missing-expression-member",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member:selected-member-missing",
        "missingInputs": [
          "expression-member:selected-member-missing"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 11,
            "kind": "source-span-address",
            "label": "src/guidance-truth-canary-app.html@6..11",
            "path": "src/guidance-truth-canary-app.html",
            "role": "name",
            "start": 6
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Template expression root \"titel\" is not available on the current binding scope.",
      "range": {
        "end": {
          "character": 11,
          "line": 0
        },
        "start": {
          "character": 6,
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
          "actionKind": "declare-member",
          "actionTarget": {
            "memberName": "titel",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/guidance-truth-canary-app.html",
                "path": "src/guidance-truth-canary-app.html",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "guidance-truth-canaries"
              },
              "end": 11,
              "kind": "source-span-address",
              "label": "src/guidance-truth-canary-app.html@6..11",
              "path": "src/guidance-truth-canary-app.html",
              "role": "name",
              "sourceFileRole": "template",
              "sourceWorkspaceKey": "guidance-truth-canaries",
              "start": 6
            },
            "targetKind": "expression",
            "typeDisplay": null
          },
          "diagnosticKind": "missing-expression-member",
          "queryKind": "template-code-actions",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "applicationKind": "single-edit",
            "changeDomain": "app-source",
            "editPlanState": "available",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "suggestionKind": "declare-explicit-member"
        }
      },
      "diagnosticCount": 1,
      "disabled": null,
      "index": 0,
      "isPreferred": true,
      "kind": "quickfix",
      "title": "Declare member 'titel' on GuidanceTruthCanaryApp"
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
      "editCount": 1,
      "expectedOldTexts": [
        ""
      ],
      "filesTouched": [
        "src/guidance-truth-canary-app.ts"
      ],
      "index": 0,
      "outcome": "applied",
      "title": "Declare member 'titel' on GuidanceTruthCanaryApp",
      "validation": [
        {
          "file": "src/guidance-truth-canary-app.ts",
          "newText": "\n  titel!: unknown;",
          "oldText": "",
          "range": {
            "end": {
              "character": 43,
              "line": 1
            },
            "start": {
              "character": 43,
              "line": 1
            }
          },
          "source": "documentChanges",
          "status": "ok"
        }
      ]
    }
  ],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

#### 0: Declare member 'titel' on GuidanceTruthCanaryApp

```diff
diff --git a/src/guidance-truth-canary-app.ts b/src/guidance-truth-canary-app.ts
--- a/src/guidance-truth-canary-app.ts
+++ b/src/guidance-truth-canary-app.ts
@@ -1,3 +1,4 @@
 export class GuidanceTruthCanaryApp {
   readonly title = 'Guidance truth canary';
+  titel!: unknown;
 }
```


## unsupported-global-console

### Probe

```json
{
  "anchor": "console.log(title)",
  "at": "console",
  "atOccurrence": 1,
  "displayPosition": "src/guidance-truth-canary-app.html:2:24",
  "file": "src/guidance-truth-canary-app.html",
  "lspPosition": {
    "character": 23,
    "line": 1
  },
  "occurrence": 1
}
```

### codeAction

```json
{
  "outcome": "result",
  "result": null
}
```

### Context diagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "code": "unsupported-expression-global",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "unsupported-expression-global",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-global:not-admitted",
        "missingInputs": [
          "expression-global:not-admitted"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 52,
            "kind": "source-span-address",
            "label": "src/guidance-truth-canary-app.html@41..52",
            "path": "src/guidance-truth-canary-app.html",
            "role": "template-member-call",
            "start": 41
          },
          "span": null,
          "subjectKind": "template-member-call",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia expression syntax does not admit host global \"console\" as an expression global in this template.",
      "range": {
        "end": {
          "character": 30,
          "line": 1
        },
        "start": {
          "character": 23,
          "line": 1
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
  "actionCount": 0,
  "actions": []
}
```

### In-memory apply

```json
{
  "actions": [],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

_No in-memory diff._

## overlapping-ghost-local

### Probe

```json
{
  "anchor": "$ghostLocal",
  "at": "$ghostLocal",
  "atOccurrence": 1,
  "displayPosition": "src/guidance-truth-canary-app.html:4:23",
  "file": "src/guidance-truth-canary-app.html",
  "lspPosition": {
    "character": 22,
    "line": 3
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
      "title": "Declare member '$ghostLocal' on GuidanceTruthCanaryApp"
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
      "code": "missing-expression-member",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "missing-expression-member",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member:selected-member-missing",
        "missingInputs": [
          "expression-member:selected-member-missing"
        ],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "subject": {
          "source": {
            "end": 170,
            "kind": "source-span-address",
            "label": "src/guidance-truth-canary-app.html@159..170",
            "path": "src/guidance-truth-canary-app.html",
            "role": "name",
            "start": 159
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Template expression root \"$ghostLocal\" is not available on the current binding scope.",
      "range": {
        "end": {
          "character": 33,
          "line": 3
        },
        "start": {
          "character": 22,
          "line": 3
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
          "actionKind": "declare-member",
          "actionTarget": {
            "memberName": "$ghostLocal",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/guidance-truth-canary-app.html",
                "path": "src/guidance-truth-canary-app.html",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "guidance-truth-canaries"
              },
              "end": 170,
              "kind": "source-span-address",
              "label": "src/guidance-truth-canary-app.html@159..170",
              "path": "src/guidance-truth-canary-app.html",
              "role": "name",
              "sourceFileRole": "template",
              "sourceWorkspaceKey": "guidance-truth-canaries",
              "start": 159
            },
            "targetKind": "expression",
            "typeDisplay": null
          },
          "diagnosticKind": "missing-expression-member",
          "queryKind": "template-code-actions",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "applicationKind": "single-edit",
            "changeDomain": "app-source",
            "editPlanState": "available",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "suggestionKind": "declare-explicit-member"
        }
      },
      "diagnosticCount": 1,
      "disabled": null,
      "index": 0,
      "isPreferred": true,
      "kind": "quickfix",
      "title": "Declare member '$ghostLocal' on GuidanceTruthCanaryApp"
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
      "editCount": 1,
      "expectedOldTexts": [
        ""
      ],
      "filesTouched": [
        "src/guidance-truth-canary-app.ts"
      ],
      "index": 0,
      "outcome": "applied",
      "title": "Declare member '$ghostLocal' on GuidanceTruthCanaryApp",
      "validation": [
        {
          "file": "src/guidance-truth-canary-app.ts",
          "newText": "\n  $ghostLocal!: unknown;",
          "oldText": "",
          "range": {
            "end": {
              "character": 43,
              "line": 1
            },
            "start": {
              "character": 43,
              "line": 1
            }
          },
          "source": "documentChanges",
          "status": "ok"
        }
      ]
    }
  ],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

#### 0: Declare member '$ghostLocal' on GuidanceTruthCanaryApp

```diff
diff --git a/src/guidance-truth-canary-app.ts b/src/guidance-truth-canary-app.ts
--- a/src/guidance-truth-canary-app.ts
+++ b/src/guidance-truth-canary-app.ts
@@ -1,3 +1,4 @@
 export class GuidanceTruthCanaryApp {
   readonly title = 'Guidance truth canary';
+  $ghostLocal!: unknown;
 }
```
