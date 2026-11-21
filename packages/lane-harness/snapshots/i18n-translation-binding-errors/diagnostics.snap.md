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

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 5,
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
        "phase": "translation-bind",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "TranslationBinding.bind would run with parameters but without a translation-key expression on the same element.",
      "range": {
        "end": {
          "character": 45,
          "line": 10
        },
        "start": {
          "character": 7,
          "line": 10
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
        "phase": "translation-bind",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "The translation key can evaluate to a value other than a string, null, or undefined.",
      "range": {
        "end": {
          "character": 24,
          "line": 11
        },
        "start": {
          "character": 5,
          "line": 11
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
        "phase": "translation-bind",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "The translation key can evaluate to a value other than a string, null, or undefined.",
      "range": {
        "end": {
          "character": 32,
          "line": 12
        },
        "start": {
          "character": 5,
          "line": 12
        }
      },
      "rangeText": "t.bind=\"numericKey & state\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "missing-expression-member",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "missing-expression-member",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-member:selected-member-missing",
        "missingInputs": [
          "expression-member:selected-member-missing"
        ],
        "phase": null,
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "template",
                "diagnosticKind": "template-expression-typescript-diagnostic",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "typescript:TS2339",
                "missingInputs": [
                  "typescript:TS2339"
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
                "severity": "error",
                "sourceRole": "template",
                "subject": {
                  "source": {
                    "end": 822,
                    "kind": "source-span-address",
                    "label": "src/i18n-translation-binding-errors-app.html@797..822",
                    "path": "src/i18n-translation-binding-errors-app.html",
                    "role": "template-member-access",
                    "start": 797
                  },
                  "span": null,
                  "subjectKind": "template-member-access",
                  "uri": null
                },
                "typeScriptDiagnosticCode": 2339
              },
              "relation": "checker-evidence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "warning",
          "rawRowCount": 2
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 822,
            "kind": "source-span-address",
            "label": "src/i18n-translation-binding-errors-app.html@797..822",
            "path": "src/i18n-translation-binding-errors-app.html",
            "role": "template-member-access",
            "start": 797
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Member \"stateName\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
      "range": {
        "end": {
          "character": 52,
          "line": 20
        },
        "start": {
          "character": 43,
          "line": 20
        }
      },
      "rangeText": "stateName",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/i18n-translation-binding-errors-app.html",
          "message": "TS2339: Property 'stateName' does not exist on type '{ viewName: string; }'.",
          "range": {
            "end": {
              "character": 52,
              "line": 20
            },
            "start": {
              "character": 43,
              "line": 20
            }
          },
          "rangeText": "stateName",
          "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
        }
      ],
      "severity": "warning",
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
        "phase": "translation-create",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "TranslationBinding.useParameter can only attach one t-params binding to the same translated element.",
      "range": {
        "end": {
          "character": 40,
          "line": 25
        },
        "start": {
          "character": 4,
          "line": 25
        }
      },
      "rangeText": "t-params.bind=\"{ other: otherName }\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/i18n-translation-binding-errors/src/i18n-translation-binding-errors-app.html"
}
```
