# i18n-translation-binding-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/i18n-translation-binding-errors`
Probe file: `packages/lane-harness/probes/i18n-translation-binding-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## i18n-translation-binding-template

### Probe

```json
{
  "file": "src/i18n-translation-binding-errors-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR4000",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4000",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4000",
        "missingInputs": [
          "runtime-binding:AUR4000"
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
      "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element..",
      "range": {
        "end": {
          "character": 45,
          "line": 1
        },
        "start": {
          "character": 7,
          "line": 1
        }
      },
      "rangeText": "t-params.bind=\"{ name: customerName }\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4002",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4002",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4002",
        "missingInputs": [
          "runtime-binding:AUR4002"
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
      "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
      "range": {
        "end": {
          "character": 24,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "t.bind=\"numericKey\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4002",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4002",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4002",
        "missingInputs": [
          "runtime-binding:AUR4002"
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
      "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
      "range": {
        "end": {
          "character": 32,
          "line": 3
        },
        "start": {
          "character": 5,
          "line": 3
        }
      },
      "rangeText": "t.bind=\"numericKey & state\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4001",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-framework-error",
        "frameworkErrorCode": "AUR4001",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding:AUR4001",
        "missingInputs": [
          "runtime-binding:AUR4001"
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
      "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element..",
      "range": {
        "end": {
          "character": 40,
          "line": 16
        },
        "start": {
          "character": 4,
          "line": 16
        }
      },
      "rangeText": "t-params.bind=\"{ other: otherName }\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
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
        "groupKey": "row:diagnostic:0:template:runtime-binding-framework-error:framework-error-code:AUR4000:src/i18n-translation-binding-errors-app.html:18:56:runtime-binding:AUR4000",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR4000",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR4000",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR4000",
              "missingInputs": [
                "runtime-binding:AUR4000"
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
            "file": "src/i18n-translation-binding-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4000",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.."
              }
            ],
            "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 56,
              "start": 18
            },
            "spanText": "t-params.bind=\"{ name: customerName }\"",
            "status": "primary",
            "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-binding-framework-error:framework-error-code:AUR4000:src/i18n-translation-binding-errors-app.html:18:56:runtime-binding:AUR4000"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:runtime-binding-framework-error:framework-error-code:AUR4002:src/i18n-translation-binding-errors-app.html:69:88:runtime-binding:AUR4002",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR4002",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR4002",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR4002",
              "missingInputs": [
                "runtime-binding:AUR4002"
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
            "file": "src/i18n-translation-binding-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4002",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
              }
            ],
            "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 88,
              "start": 69
            },
            "spanText": "t.bind=\"numericKey\"",
            "status": "primary",
            "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:runtime-binding-framework-error:framework-error-code:AUR4002:src/i18n-translation-binding-errors-app.html:69:88:runtime-binding:AUR4002"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:runtime-binding-framework-error:framework-error-code:AUR4002:src/i18n-translation-binding-errors-app.html:99:126:runtime-binding:AUR4002",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR4002",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR4002",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR4002",
              "missingInputs": [
                "runtime-binding:AUR4002"
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
            "file": "src/i18n-translation-binding-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4002",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
              }
            ],
            "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 126,
              "start": 99
            },
            "spanText": "t.bind=\"numericKey & state\"",
            "status": "primary",
            "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:runtime-binding-framework-error:framework-error-code:AUR4002:src/i18n-translation-binding-errors-app.html:99:126:runtime-binding:AUR4002"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-binding-framework-error:framework-error-code:AUR4001:src/i18n-translation-binding-errors-app.html:429:465:runtime-binding:AUR4001",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR4001",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-framework-error",
              "frameworkErrorCode": "AUR4001",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding:AUR4001",
              "missingInputs": [
                "runtime-binding:AUR4001"
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
            "file": "src/i18n-translation-binding-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4001",
                "kind": "runtime-binding-framework-error",
                "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element.."
              }
            ],
            "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 465,
              "start": 429
            },
            "spanText": "t-params.bind=\"{ other: otherName }\"",
            "status": "primary",
            "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-binding-framework-error:framework-error-code:AUR4001:src/i18n-translation-binding-errors-app.html:429:465:runtime-binding:AUR4001"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 4,
    "rawRowCount": 4
  },
  "raw": {
    "diagnosticCount": 4,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR4000",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR4000",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR4000",
          "missingInputs": [
            "runtime-binding:AUR4000"
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
        "file": "src/i18n-translation-binding-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4000",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.."
          }
        ],
        "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 56,
          "start": 18
        },
        "spanText": "t-params.bind=\"{ name: customerName }\"",
        "status": "canonical",
        "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR4001",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR4001",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR4001",
          "missingInputs": [
            "runtime-binding:AUR4001"
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
        "file": "src/i18n-translation-binding-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4001",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element.."
          }
        ],
        "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 465,
          "start": 429
        },
        "spanText": "t-params.bind=\"{ other: otherName }\"",
        "status": "canonical",
        "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR4002",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR4002",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR4002",
          "missingInputs": [
            "runtime-binding:AUR4002"
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
        "file": "src/i18n-translation-binding-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4002",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
          }
        ],
        "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 88,
          "start": 69
        },
        "spanText": "t.bind=\"numericKey\"",
        "status": "canonical",
        "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR4002",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-framework-error",
          "frameworkErrorCode": "AUR4002",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding:AUR4002",
          "missingInputs": [
            "runtime-binding:AUR4002"
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
        "file": "src/i18n-translation-binding-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4002",
            "kind": "runtime-binding-framework-error",
            "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
          }
        ],
        "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 126,
          "start": 99
        },
        "spanText": "t.bind=\"numericKey & state\"",
        "status": "canonical",
        "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 4,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR4000",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR4000",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR4000",
            "missingInputs": [
              "runtime-binding:AUR4000"
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
          "file": "src/i18n-translation-binding-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4000",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.."
            }
          ],
          "message": "Aurelia runtime binding AUR4000 rejects this binding input: TranslationBinding.bind would run with parameters but without a translation-key expression on the same element..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 56,
            "start": 18
          },
          "spanText": "t-params.bind=\"{ name: customerName }\"",
          "status": "primary",
          "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR4002",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR4002",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR4002",
            "missingInputs": [
              "runtime-binding:AUR4002"
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
          "file": "src/i18n-translation-binding-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4002",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
            }
          ],
          "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 88,
            "start": 69
          },
          "spanText": "t.bind=\"numericKey\"",
          "status": "primary",
          "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR4002",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR4002",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR4002",
            "missingInputs": [
              "runtime-binding:AUR4002"
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
          "file": "src/i18n-translation-binding-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4002",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string.."
            }
          ],
          "message": "Aurelia runtime binding AUR4002 rejects this binding input: TranslationBinding._ensureKeyExpression would reject this key expression because its TypeChecker type is not assignable to string..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 126,
            "start": 99
          },
          "spanText": "t.bind=\"numericKey & state\"",
          "status": "primary",
          "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR4001",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-framework-error",
            "frameworkErrorCode": "AUR4001",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding:AUR4001",
            "missingInputs": [
              "runtime-binding:AUR4001"
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
          "file": "src/i18n-translation-binding-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4001",
              "kind": "runtime-binding-framework-error",
              "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element.."
            }
          ],
          "message": "Aurelia runtime binding AUR4001 rejects this binding input: TranslationBinding.useParameter can only attach one t-params binding to the same translated element..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 465,
            "start": 429
          },
          "spanText": "t-params.bind=\"{ other: otherName }\"",
          "status": "primary",
          "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 4,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 4,
  "suppressedCount": 0
}
```
