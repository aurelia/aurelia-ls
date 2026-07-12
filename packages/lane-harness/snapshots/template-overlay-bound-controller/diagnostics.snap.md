# template-overlay-bound-controller diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-bound-controller`
Probe file: `packages/lane-harness/probes/template-overlay-bound-controller.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-bound-controller-host-template

### Probe

```json
{
  "file": "src/template-overlay-bound-controller-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
        "missingInputs": [
          "binding-target-assignment:source-to-target-type-mismatch"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-expression",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-expression-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 92,
            "kind": "source-span-address",
            "label": "src/template-overlay-bound-controller-app.html@74..92",
            "path": "src/template-overlay-bound-controller-app.html",
            "role": "template-member-access",
            "start": 74
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean.",
      "range": {
        "end": {
          "character": 81,
          "line": 1
        },
        "start": {
          "character": 63,
          "line": 1
        }
      },
      "rangeText": "state.handleAction",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
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
        "groupKey": "row:diagnostic:0:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-overlay-bound-controller-app.html:74:92:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "binding-target-assignment-strictness",
            "data": {
              "diagnosticAuthority": "semantic-runtime-product",
              "diagnosticDomain": "template",
              "diagnosticKind": "binding-target-assignment-strictness",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
              "missingInputs": [
                "binding-target-assignment:source-to-target-type-mismatch"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "rewrite-expression",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "template-expression-rewrite",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 92,
                  "kind": "source-span-address",
                  "label": "src/template-overlay-bound-controller-app.html@74..92",
                  "path": "src/template-overlay-bound-controller-app.html",
                  "role": "template-member-access",
                  "start": 74
                },
                "span": null,
                "subjectKind": "template-member-access",
                "uri": null
              },
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-bound-controller-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean."
              }
            ],
            "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 92,
              "start": 74
            },
            "spanText": "state.handleAction",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/template-overlay-bound-controller-app.html:74:92:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 92,
            "start": 74
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
        }
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
        "code": "binding-target-assignment-strictness",
        "data": {
          "diagnosticAuthority": "semantic-runtime-product",
          "diagnosticDomain": "template",
          "diagnosticKind": "binding-target-assignment-strictness",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
          "missingInputs": [
            "binding-target-assignment:source-to-target-type-mismatch"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "rewrite-expression",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "template-expression-rewrite",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 92,
              "kind": "source-span-address",
              "label": "src/template-overlay-bound-controller-app.html@74..92",
              "path": "src/template-overlay-bound-controller-app.html",
              "role": "template-member-access",
              "start": 74
            },
            "span": null,
            "subjectKind": "template-member-access",
            "uri": null
          },
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-bound-controller-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean."
          }
        ],
        "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 92,
          "start": 74
        },
        "spanText": "state.handleAction",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
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
          "code": "binding-target-assignment-strictness",
          "data": {
            "diagnosticAuthority": "semantic-runtime-product",
            "diagnosticDomain": "template",
            "diagnosticKind": "binding-target-assignment-strictness",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
            "missingInputs": [
              "binding-target-assignment:source-to-target-type-mismatch"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "rewrite-expression",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "template-expression-rewrite",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 92,
                "kind": "source-span-address",
                "label": "src/template-overlay-bound-controller-app.html@74..92",
                "path": "src/template-overlay-bound-controller-app.html",
                "role": "template-member-access",
                "start": 74
              },
              "span": null,
              "subjectKind": "template-member-access",
              "uri": null
            },
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-bound-controller-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean."
            }
          ],
          "message": "Binding source type (action: OverlayAction) => boolean is not assignable to target 'onAction' of type () => boolean.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 92,
            "start": 74
          },
          "spanText": "state.handleAction",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
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

## overlay-bound-controller-child-template

### Probe

```json
{
  "file": "src/callback-panel.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "published",
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/callback-panel.html"
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
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/callback-panel.html"
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
