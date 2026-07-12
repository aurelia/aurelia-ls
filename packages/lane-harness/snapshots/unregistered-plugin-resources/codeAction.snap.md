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
      "title": "Register RouterConfiguration for router.default-resources"
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
        "missingInput": "router.default-resources",
        "missingInputs": [
          "router.default-resources"
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
            "actionIdentity": "template-code-action:sha256:3e2ff54e819a7b096df77cdc4691dcdce37e15c6f9433ed664049773c6affb02",
            "position": {
              "character": 8,
              "line": 0
            },
            "schema": "aurelia.template-code-action-resolve/1",
            "textDocument": {
              "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
            }
          },
          "sourceDiagnostics": [
            {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "missingInput": "router.default-resources",
              "missingInputs": [
                "router.default-resources"
              ],
              "ownerTypeDisplay": null,
              "ownerTypeOrigin": null,
              "ownerTypeShapeKind": null,
              "phase": null,
              "selectedMemberName": "load",
              "severity": "error",
              "siteKind": "attribute-name",
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/unregistered-plugin-resources-app.html",
                  "path": "src/unregistered-plugin-resources-app.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-resources"
                },
                "end": 21,
                "kind": "source-span-address",
                "label": "src/unregistered-plugin-resources-app.html@8..21",
                "path": "src/unregistered-plugin-resources-app.html",
                "role": "range",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "unregistered-plugin-resources",
                "start": 8
              },
              "suggestion": {
                "actionKind": "register-framework-capability",
                "actionTarget": {
                  "memberName": "router.default-resources",
                  "source": {
                    "anchor": {
                      "kind": "source-file-address",
                      "label": "src/unregistered-plugin-resources-app.html",
                      "path": "src/unregistered-plugin-resources-app.html",
                      "sourceFileRole": "template",
                      "sourceWorkspaceKey": "unregistered-plugin-resources"
                    },
                    "end": 21,
                    "kind": "source-span-address",
                    "label": "src/unregistered-plugin-resources-app.html@8..21",
                    "path": "src/unregistered-plugin-resources-app.html",
                    "role": "range",
                    "sourceFileRole": "template",
                    "sourceWorkspaceKey": "unregistered-plugin-resources",
                    "start": 8
                  },
                  "targetKind": "framework-capability",
                  "typeDisplay": "@aurelia/router"
                },
                "ownerTypeDisplay": null,
                "suggestionKind": "register-framework-capability",
                "summary": "Register RouterConfiguration or DefaultResources from @aurelia/router with the app container. Availability evidence was found for @aurelia/router.",
                "targetMemberName": "router.default-resources",
                "valueTypeDisplay": "@aurelia/router",
                "valueTypeSource": null
              },
              "summary": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
              "template": {
                "compilationLane": "app-runtime",
                "source": {
                  "anchor": {
                    "kind": "source-file-address",
                    "label": "src/unregistered-plugin-resources-app.html",
                    "path": "src/unregistered-plugin-resources-app.html",
                    "sourceFileRole": "template",
                    "sourceWorkspaceKey": "unregistered-plugin-resources"
                  },
                  "end": 356,
                  "kind": "source-span-address",
                  "label": "src/unregistered-plugin-resources-app.html@0..356",
                  "path": "src/unregistered-plugin-resources-app.html",
                  "role": "value",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "unregistered-plugin-resources",
                  "start": 0
                }
              },
              "valueSiteKind": null
            }
          ]
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
