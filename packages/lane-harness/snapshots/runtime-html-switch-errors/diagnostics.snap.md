# runtime-html-switch-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-switch-errors`
Probe file: `packages/lane-harness/probes/runtime-html-switch-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-controller-switch-template

### Probe

```json
{
  "file": "src/runtime-html-switch-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0815",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0815",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0815",
        "missingInputs": [
          "runtime-controller:AUR0815"
        ],
        "relatedQueryKind": "template-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found..",
      "range": {
        "end": {
          "character": 20,
          "line": 0
        },
        "start": {
          "character": 5,
          "line": 0
        }
      },
      "rangeText": "case=\"'orphan'\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0816",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0816",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0816",
        "missingInputs": [
          "runtime-controller:AUR0816"
        ],
        "relatedQueryKind": "template-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch]..",
      "range": {
        "end": {
          "character": 24,
          "line": 5
        },
        "start": {
          "character": 12,
          "line": 5
        }
      },
      "rangeText": "default-case",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
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
        "groupKey": "row:diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0815:src/runtime-html-switch-errors-app.html:5:20:runtime-controller:AUR0815",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0815",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0815",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0815",
              "missingInputs": [
                "runtime-controller:AUR0815"
              ],
              "relatedQueryKind": "template-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/runtime-html-switch-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0815",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found.."
              }
            ],
            "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 20,
              "start": 5
            },
            "spanText": "case=\"'orphan'\"",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-controller-framework-error:framework-error-code:AUR0815:src/runtime-html-switch-errors-app.html:5:20:runtime-controller:AUR0815"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0816:src/runtime-html-switch-errors-app.html:174:186:runtime-controller:AUR0816",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0816",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0816",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0816",
              "missingInputs": [
                "runtime-controller:AUR0816"
              ],
              "relatedQueryKind": "template-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/runtime-html-switch-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0816",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch].."
              }
            ],
            "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch]..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 186,
              "start": 174
            },
            "spanText": "default-case",
            "status": "primary",
            "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-controller-framework-error:framework-error-code:AUR0816:src/runtime-html-switch-errors-app.html:174:186:runtime-controller:AUR0816"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 2,
    "rawRowCount": 2
  },
  "raw": {
    "diagnosticCount": 2,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0816",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0816",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0816",
          "missingInputs": [
            "runtime-controller:AUR0816"
          ],
          "relatedQueryKind": "template-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/runtime-html-switch-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0816",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch].."
          }
        ],
        "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch]..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 186,
          "start": 174
        },
        "spanText": "default-case",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0815",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0815",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0815",
          "missingInputs": [
            "runtime-controller:AUR0815"
          ],
          "relatedQueryKind": "template-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/runtime-html-switch-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0815",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found.."
          }
        ],
        "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 20,
          "start": 5
        },
        "spanText": "case=\"'orphan'\"",
        "status": "canonical",
        "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 2,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0815",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0815",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0815",
            "missingInputs": [
              "runtime-controller:AUR0815"
            ],
            "relatedQueryKind": "template-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/runtime-html-switch-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0815",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found.."
            }
          ],
          "message": "Aurelia runtime controller AUR0815 rejects this controller input: Invalid [case] usage. The parent [switch] controller was not found..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 20,
            "start": 5
          },
          "spanText": "case=\"'orphan'\"",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0816",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0816",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0816",
            "missingInputs": [
              "runtime-controller:AUR0816"
            ],
            "relatedQueryKind": "template-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/runtime-html-switch-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0816",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch].."
            }
          ],
          "message": "Aurelia runtime controller AUR0816 rejects this controller input: Invalid [default-case] usage. Multiple default-case controllers are linked to the same [switch]..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 186,
            "start": 174
          },
          "spanText": "default-case",
          "status": "primary",
          "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/runtime-html-switch-errors/src/runtime-html-switch-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 2,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 2,
  "suppressedCount": 0
}
```
