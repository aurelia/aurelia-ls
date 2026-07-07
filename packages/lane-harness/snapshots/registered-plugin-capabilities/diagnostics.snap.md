# registered-plugin-capabilities diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/registered-plugin-capabilities`
Probe file: `packages/lane-harness/probes/registered-plugin-capabilities.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## registered-plugin-state-store-template

### Probe

```json
{
  "file": "src/registered-plugin-capabilities-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "store-not-found",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "state",
        "diagnosticKind": "store-not-found",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": "state:aurelia/packages/state/src/store-registry.ts:16:raw-new-error:throw",
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "state-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
      "range": {
        "end": {
          "character": 40,
          "line": 2
        },
        "start": {
          "character": 8,
          "line": 2
        }
      },
      "rangeText": "click.dispatch:main=\"dispatch()\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
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
        "groupKey": "row:diagnostic:0:state:store-not-found:framework-runtime-behavior:no-framework-code:src/registered-plugin-capabilities-app.html:64:96:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "store-not-found",
            "data": {
              "diagnosticAuthority": "framework-runtime-behavior",
              "diagnosticDomain": "state",
              "diagnosticKind": "store-not-found",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "state-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/registered-plugin-capabilities-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "store-not-found",
                "kind": "store-not-found",
                "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
                "rawCode": "state:aurelia/packages/state/src/store-registry.ts:16:raw-new-error:throw"
              }
            ],
            "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:state",
            "span": {
              "end": 96,
              "start": 64
            },
            "spanText": "click.dispatch:main=\"dispatch()\"",
            "status": "primary",
            "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:state:store-not-found:framework-runtime-behavior:no-framework-code:src/registered-plugin-capabilities-app.html:64:96:no-missing-input"
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
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "store-not-found",
        "data": {
          "diagnosticAuthority": "framework-runtime-behavior",
          "diagnosticDomain": "state",
          "diagnosticKind": "store-not-found",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "state-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/registered-plugin-capabilities-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "store-not-found",
            "kind": "store-not-found",
            "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
            "rawCode": "state:aurelia/packages/state/src/store-registry.ts:16:raw-new-error:throw"
          }
        ],
        "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:state",
        "span": {
          "end": 96,
          "start": 64
        },
        "spanText": "click.dispatch:main=\"dispatch()\"",
        "status": "canonical",
        "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
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
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "store-not-found",
          "data": {
            "diagnosticAuthority": "framework-runtime-behavior",
            "diagnosticDomain": "state",
            "diagnosticKind": "store-not-found",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "state-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/registered-plugin-capabilities-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "store-not-found",
              "kind": "store-not-found",
              "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
              "rawCode": "state:aurelia/packages/state/src/store-registry.ts:16:raw-new-error:throw"
            }
          ],
          "message": "The dispatch binding command references store \"main\", but no @aurelia/state store with that name is configured.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:state",
          "span": {
            "end": 96,
            "start": 64
          },
          "spanText": "click.dispatch:main=\"dispatch()\"",
          "status": "primary",
          "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
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
