# template-overlay-value-converter diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-value-converter`
Probe file: `packages/lane-harness/probes/template-overlay-value-converter.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-value-converter-template

### Probe

```json
{
  "file": "src/template-overlay-value-converter-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2345",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2345",
        "missingInputs": [
          "typescript:TS2345"
        ],
        "phase": "semantic",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 94,
            "kind": "source-span-address",
            "label": "src/template-overlay-value-converter-app.html@83..94",
            "path": "src/template-overlay-value-converter-app.html",
            "role": "typescript-overlay:semantic",
            "start": 83
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
      "range": {
        "end": {
          "character": 38,
          "line": 2
        },
        "start": {
          "character": 27,
          "line": 2
        }
      },
      "rangeText": "minimumText",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
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
        "groupKey": "row:diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-value-converter-app.html:83:94:typescript:TS2345",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
            "code": "TS2345",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-expression-typescript-diagnostic",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "typescript:TS2345",
              "missingInputs": [
                "typescript:TS2345"
              ],
              "phase": "semantic",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 94,
                  "kind": "source-span-address",
                  "label": "src/template-overlay-value-converter-app.html@83..94",
                  "path": "src/template-overlay-value-converter-app.html",
                  "role": "typescript-overlay:semantic",
                  "start": 83
                },
                "span": null,
                "subjectKind": "template-expression",
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
            "file": "src/template-overlay-value-converter-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
              }
            ],
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 94,
              "start": 83
            },
            "spanText": "minimumText",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-value-converter-app.html:83:94:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 94,
            "start": 83
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
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
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "TS2345",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-expression-typescript-diagnostic",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "typescript:TS2345",
          "missingInputs": [
            "typescript:TS2345"
          ],
          "phase": "semantic",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 94,
              "kind": "source-span-address",
              "label": "src/template-overlay-value-converter-app.html@83..94",
              "path": "src/template-overlay-value-converter-app.html",
              "role": "typescript-overlay:semantic",
              "start": 83
            },
            "span": null,
            "subjectKind": "template-expression",
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
        "file": "src/template-overlay-value-converter-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
          }
        ],
        "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 94,
          "start": 83
        },
        "spanText": "minimumText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
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
          "category": "template-syntax",
          "code": "TS2345",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-expression-typescript-diagnostic",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "typescript:TS2345",
            "missingInputs": [
              "typescript:TS2345"
            ],
            "phase": "semantic",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 94,
                "kind": "source-span-address",
                "label": "src/template-overlay-value-converter-app.html@83..94",
                "path": "src/template-overlay-value-converter-app.html",
                "role": "typescript-overlay:semantic",
                "start": 83
              },
              "span": null,
              "subjectKind": "template-expression",
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
          "file": "src/template-overlay-value-converter-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
            }
          ],
          "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 94,
            "start": 83
          },
          "spanText": "minimumText",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-overlay-value-converter/src/template-overlay-value-converter-app.html"
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
