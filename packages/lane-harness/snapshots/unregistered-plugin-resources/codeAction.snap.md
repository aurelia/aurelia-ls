# unregistered-plugin-resources codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-plugin-resources`
Probe file: `packages/lane-harness/probes/unregistered-plugin-resources.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## register-router-configuration-load

### Probe

```json
{
  "anchor": "<button load=\"orders\">",
  "at": "load",
  "atOccurrence": 1,
  "displayPosition": "src/unregistered-plugin-resources-app.html:1:9",
  "file": "src/unregistered-plugin-resources-app.html",
  "lspPosition": {
    "character": 8,
    "line": 0
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 8,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
}
```

### codeAction

```json
{
  "actionCount": 2,
  "actions": [
    {
      "diagnosticCount": 1,
      "hasCommand": false,
      "hasEdit": false,
      "isPreferred": true,
      "kind": "quickfix",
      "title": "Register RouterConfiguration for router.default-resources"
    },
    {
      "diagnosticCount": 1,
      "hasCommand": true,
      "hasEdit": false,
      "isPreferred": false,
      "kind": "quickfix",
      "title": "Explain this Aurelia diagnostic"
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
        "missingInput": "router.default-resources",
        "missingInputs": [
          "router.default-resources"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
      "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 21,
          "line": 0
        },
        "start": {
          "character": 8,
          "line": 0
        }
      },
      "rangeText": "load=\"orders\"",
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
  "actionCount": 2,
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
            "actionIdentity": "template-code-action:sha256:3e2ff54e819a7b096df77cdc4691dcdce37e15c6f9433ed664049773c6affb02",
            "position": {
              "character": 8,
              "line": 0
            },
            "schema": "aurelia.template-code-action-resolve/1",
            "textDocument": {
              "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
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
      "title": "Register RouterConfiguration for router.default-resources"
    },
    {
      "command": {
        "arguments": [
          {
            "documentVersion": 1,
            "frameworkCapability": "router.default-resources",
            "position": {
              "character": 8,
              "line": 0
            },
            "projectKey": "unregistered-plugin-resources",
            "range": {
              "end": {
                "character": 21,
                "line": 0
              },
              "start": {
                "character": 8,
                "line": 0
              }
            },
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          }
        ],
        "command": "aurelia.explainFrameworkCapability",
        "title": "Explain Aurelia diagnostic"
      },
      "data": {
        "semanticRuntime": {
          "explanationSeed": {
            "documentVersion": 1,
            "frameworkCapability": "router.default-resources",
            "position": {
              "character": 8,
              "line": 0
            },
            "projectKey": "unregistered-plugin-resources",
            "range": {
              "end": {
                "character": 21,
                "line": 0
              },
              "start": {
                "character": 8,
                "line": 0
              }
            },
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "queryKind": "framework-capability-explanation"
        }
      },
      "diagnosticCount": 1,
      "disabled": null,
      "index": 1,
      "isPreferred": false,
      "kind": "quickfix",
      "resolution": {
        "hasCommand": true,
        "hasEdit": false,
        "outcome": "not-requested"
      },
      "title": "Explain this Aurelia diagnostic"
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
        "src/main.ts"
      ],
      "index": 0,
      "outcome": "applied",
      "title": "Register RouterConfiguration for router.default-resources",
      "validation": [
        {
          "file": "src/main.ts",
          "newText": ".register(RouterConfiguration)\n  ",
          "oldText": "",
          "range": {
            "end": {
              "character": 2,
              "line": 16
            },
            "start": {
              "character": 2,
              "line": 16
            }
          },
          "source": "documentChanges",
          "status": "ok"
        }
      ]
    },
    {
      "anomalies": [],
      "editCount": 0,
      "expectedOldTexts": [
        ""
      ],
      "filesTouched": [],
      "index": 1,
      "outcome": "no-workspace-edit",
      "title": "Explain this Aurelia diagnostic",
      "validation": []
    }
  ],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

#### 0: Register RouterConfiguration for router.default-resources

```diff
diff --git a/src/main.ts b/src/main.ts
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,21 +1,22 @@
 import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
 import { I18nConfiguration } from '@aurelia/i18n';
 import { RouterConfiguration } from '@aurelia/router';
 import { StateDefaultConfiguration } from '@aurelia/state';
 import { DefaultVirtualizationConfiguration } from '@aurelia/ui-virtualization';
 import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
 import { UnregisteredPluginResourcesApp } from './unregistered-plugin-resources-app';

 void I18nConfiguration;
 void RouterConfiguration;
 void StateDefaultConfiguration;
 void DefaultVirtualizationConfiguration;
 void ValidationHtmlConfiguration;

 new Aurelia()
   .register(StandardConfiguration)
+  .register(RouterConfiguration)
   .app({
     host: document.body,
     component: UnregisteredPluginResourcesApp,
   })
   .start();
```

#### 1: Explain this Aurelia diagnostic

_No in-memory diff._
