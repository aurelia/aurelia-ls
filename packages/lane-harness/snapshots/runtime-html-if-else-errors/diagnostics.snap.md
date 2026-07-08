# runtime-html-if-else-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-if-else-errors`
Probe file: `packages/lane-harness/probes/runtime-html-if-else-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-if-else-template

### Probe

```json
{
  "file": "src/runtime-html-if-else-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0810",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0810",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0810",
        "missingInputs": [
          "runtime-controller:AUR0810"
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
      "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
      "range": {
        "end": {
          "character": 14,
          "line": 0
        },
        "start": {
          "character": 10,
          "line": 0
        }
      },
      "rangeText": "else",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0810:src/runtime-html-if-else-errors-app.html:10:14:runtime-controller:AUR0810",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0810",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0810",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0810",
              "missingInputs": [
                "runtime-controller:AUR0810"
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
            "file": "src/runtime-html-if-else-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0810",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
              }
            ],
            "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 14,
              "start": 10
            },
            "spanText": "else",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0810:src/runtime-html-if-else-errors-app.html:10:14:runtime-controller:AUR0810"
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
        "code": "AUR0810",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0810",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0810",
          "missingInputs": [
            "runtime-controller:AUR0810"
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
        "file": "src/runtime-html-if-else-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0810",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
          }
        ],
        "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 14,
          "start": 10
        },
        "spanText": "else",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
          "code": "AUR0810",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0810",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0810",
            "missingInputs": [
              "runtime-controller:AUR0810"
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
          "file": "src/runtime-html-if-else-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0810",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if].."
            }
          ],
          "message": "Aurelia runtime controller AUR0810 rejects this controller input: Invalid [else] usage. The previous controller sibling is not [if]..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 14,
            "start": 10
          },
          "spanText": "else",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-if-else-errors/src/runtime-html-if-else-errors-app.html"
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
