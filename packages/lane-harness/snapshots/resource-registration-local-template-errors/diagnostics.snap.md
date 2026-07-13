# resource-registration-local-template-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-registration-local-template-errors`
Probe file: `packages/lane-harness/probes/resource-registration-local-template-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## forbidden-host-attribute

### Probe

```json
{
  "file": "src/local-surrogate-invalid-attribute.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0702",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0702",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0702",
        "missingInputs": [
          "template-compiler:AUR0702"
        ],
        "phase": "compiled-template",
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
      "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 78,
          "line": 3
        },
        "start": {
          "character": 56,
          "line": 3
        }
      },
      "rangeText": "id=\"forbidden-host-id\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/local-surrogate-invalid-attribute.html:122:144:template-compiler:AUR0702",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0702",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0702",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0702",
              "missingInputs": [
                "template-compiler:AUR0702"
              ],
              "phase": "compiled-template",
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
            "file": "src/local-surrogate-invalid-attribute.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0702",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 144,
              "start": 122
            },
            "spanText": "id=\"forbidden-host-id\"",
            "status": "primary",
            "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0702:src/local-surrogate-invalid-attribute.html:122:144:template-compiler:AUR0702"
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
        "code": "AUR0702",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0702",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0702",
          "missingInputs": [
            "template-compiler:AUR0702"
          ],
          "phase": "compiled-template",
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
        "file": "src/local-surrogate-invalid-attribute.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0702",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 144,
          "start": 122
        },
        "spanText": "id=\"forbidden-host-id\"",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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
          "code": "AUR0702",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0702",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0702",
            "missingInputs": [
              "template-compiler:AUR0702"
            ],
            "phase": "compiled-template",
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
          "file": "src/local-surrogate-invalid-attribute.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0702",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0702 rejects this template syntax: Template compilation error: attribute \"id\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 144,
            "start": 122
          },
          "spanText": "id=\"forbidden-host-id\"",
          "status": "primary",
          "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-invalid-attribute.html"
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

## host-template-controller

### Probe

```json
{
  "file": "src/local-surrogate-template-controller.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0703",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0703",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0703",
        "missingInputs": [
          "template-compiler:AUR0703"
        ],
        "phase": "compiled-template",
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
      "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
      "range": {
        "end": {
          "character": 50,
          "line": 1
        },
        "start": {
          "character": 48,
          "line": 1
        }
      },
      "rangeText": "if",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
        "groupKey": "row:diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/local-surrogate-template-controller.html:59:61:template-compiler:AUR0703",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0703",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "template-compiler-error",
              "frameworkErrorCode": "AUR0703",
              "frameworkRawErrorAuthority": null,
              "missingInput": "template-compiler:AUR0703",
              "missingInputs": [
                "template-compiler:AUR0703"
              ],
              "phase": "compiled-template",
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
            "file": "src/local-surrogate-template-controller.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0703",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
              }
            ],
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 61,
              "start": 59
            },
            "spanText": "if",
            "status": "primary",
            "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-compiler-error:framework-error-code:AUR0703:src/local-surrogate-template-controller.html:59:61:template-compiler:AUR0703"
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
        "code": "AUR0703",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-compiler-error",
          "frameworkErrorCode": "AUR0703",
          "frameworkRawErrorAuthority": null,
          "missingInput": "template-compiler:AUR0703",
          "missingInputs": [
            "template-compiler:AUR0703"
          ],
          "phase": "compiled-template",
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
        "file": "src/local-surrogate-template-controller.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0703",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
          }
        ],
        "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 61,
          "start": 59
        },
        "spanText": "if",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
          "code": "AUR0703",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "template-compiler-error",
            "frameworkErrorCode": "AUR0703",
            "frameworkRawErrorAuthority": null,
            "missingInput": "template-compiler:AUR0703",
            "missingInputs": [
              "template-compiler:AUR0703"
            ],
            "phase": "compiled-template",
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
          "file": "src/local-surrogate-template-controller.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0703",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate.."
            }
          ],
          "message": "Aurelia template compiler AUR0703 rejects this template syntax: Template compilation error: template controller \"if\" is invalid on element surrogate..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 61,
            "start": 59
          },
          "spanText": "if",
          "status": "primary",
          "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-registration-local-template-errors/src/local-surrogate-template-controller.html"
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
