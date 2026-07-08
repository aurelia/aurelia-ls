# runtime-html-spread-renderer-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-spread-renderer-errors`
Probe file: `packages/lane-harness/probes/runtime-html-spread-renderer-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-renderer-spread-template

### Probe

```json
{
  "file": "src/runtime-html-spread-renderer-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0820",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0820",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0820",
        "missingInputs": [
          "runtime-renderer:AUR0820"
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
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
      "range": {
        "end": {
          "character": 53,
          "line": 1
        },
        "start": {
          "character": 20,
          "line": 1
        }
      },
      "rangeText": "$element.spread=\"elementBindings\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-spread-renderer-errors/src/runtime-html-spread-renderer-errors-app.html"
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
        "groupKey": "row:diagnostic:0:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/runtime-html-spread-renderer-errors-app.html:91:124:runtime-renderer:AUR0820",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0820",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-renderer-framework-error",
              "frameworkErrorCode": "AUR0820",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-renderer:AUR0820",
              "missingInputs": [
                "runtime-renderer:AUR0820"
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
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/runtime-html-spread-renderer-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0820",
                "kind": "runtime-renderer-framework-error",
                "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
              }
            ],
            "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 124,
              "start": 91
            },
            "spanText": "$element.spread=\"elementBindings\"",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-spread-renderer-errors/src/runtime-html-spread-renderer-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-renderer-framework-error:framework-error-code:AUR0820:src/runtime-html-spread-renderer-errors-app.html:91:124:runtime-renderer:AUR0820"
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
        "code": "AUR0820",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-renderer-framework-error",
          "frameworkErrorCode": "AUR0820",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-renderer:AUR0820",
          "missingInputs": [
            "runtime-renderer:AUR0820"
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
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/runtime-html-spread-renderer-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0820",
            "kind": "runtime-renderer-framework-error",
            "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
          }
        ],
        "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 124,
          "start": 91
        },
        "spanText": "$element.spread=\"elementBindings\"",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-spread-renderer-errors/src/runtime-html-spread-renderer-errors-app.html"
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
          "code": "AUR0820",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-renderer-framework-error",
            "frameworkErrorCode": "AUR0820",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-renderer:AUR0820",
            "missingInputs": [
              "runtime-renderer:AUR0820"
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
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/runtime-html-spread-renderer-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0820",
              "kind": "runtime-renderer-framework-error",
              "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element.."
            }
          ],
          "message": "Aurelia runtime renderer AUR0820 rejects this instruction input: Invalid spread target $element..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 124,
            "start": 91
          },
          "spanText": "$element.spread=\"elementBindings\"",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-spread-renderer-errors/src/runtime-html-spread-renderer-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-spread-renderer-errors/src/runtime-html-spread-renderer-errors-app.html"
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
