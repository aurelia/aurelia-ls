# runtime-html-view-factory-provider-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-view-factory-provider-errors`
Probe file: `packages/lane-harness/probes/runtime-html-view-factory-provider-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-html-view-factory-template-html

### Probe

```json
{
  "file": "src/runtime-html-view-factory-provider-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.html"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [],
    "primaryCount": 0,
    "rawRowCount": 0
  },
  "raw": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 0,
      "diagnostics": []
    }
  },
  "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 0,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 0,
  "suppressedCount": 0
}
```

## runtime-html-view-factory-template-ts

### Probe

```json
{
  "file": "src/runtime-html-view-factory-provider-errors-app.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0755",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0755",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0755",
        "missingInputs": [
          "runtime-controller:AUR0755"
        ],
        "phase": "controller-activation",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "app-source",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider..",
      "range": {
        "end": {
          "character": 54,
          "line": 15
        },
        "start": {
          "character": 33,
          "line": 15
        }
      },
      "rangeText": "resolve(IViewFactory)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0755:src/runtime-html-view-factory-provider-errors-app.ts:514:535:runtime-controller:AUR0755",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0755",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0755",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0755",
              "missingInputs": [
                "runtime-controller:AUR0755"
              ],
              "phase": "controller-activation",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "rewrite-template-syntax",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "template-syntax-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": null,
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/runtime-html-view-factory-provider-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0755",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider.."
              }
            ],
            "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 535,
              "start": 514
            },
            "spanText": "resolve(IViewFactory)",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0755:src/runtime-html-view-factory-provider-errors-app.ts:514:535:runtime-controller:AUR0755"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0755",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0755",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0755",
          "missingInputs": [
            "runtime-controller:AUR0755"
          ],
          "phase": "controller-activation",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "rewrite-template-syntax",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "template-syntax-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": null,
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/runtime-html-view-factory-provider-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0755",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider.."
          }
        ],
        "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 535,
          "start": 514
        },
        "spanText": "resolve(IViewFactory)",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 1,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0755",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0755",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0755",
            "missingInputs": [
              "runtime-controller:AUR0755"
            ],
            "phase": "controller-activation",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "rewrite-template-syntax",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "template-syntax-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": null,
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/runtime-html-view-factory-provider-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0755",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider.."
            }
          ],
          "message": "Aurelia runtime controller AUR0755 rejects this controller input: Resource view model resolves IViewFactory where runtime-html has not prepared a template-controller view factory provider..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 535,
            "start": 514
          },
          "spanText": "resolve(IViewFactory)",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-view-factory-provider-errors/src/runtime-html-view-factory-provider-errors-app.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 1,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 1,
  "suppressedCount": 0
}
```
