# validation-rule-source-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors`
Probe file: `packages/lane-harness/probes/validation-rule-source-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## validation-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2449",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2449",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "relatedInformation": [
          {
            "code": "TS2728",
            "message": "'LocalValidationRulesKey' is declared here.",
            "source": {
              "end": 1048,
              "kind": "typescript-diagnostic",
              "label": "repo:///packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@1025..1048",
              "path": "repo:///packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
              "role": "line:32:character:6",
              "start": 1025
            },
            "sourceRole": "app-source"
          }
        ],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2449
      },
      "message": "Class 'LocalValidationRulesKey' used before its declaration.",
      "range": {
        "end": {
          "character": 46,
          "line": 20
        },
        "start": {
          "character": 23,
          "line": 20
        }
      },
      "rangeText": "LocalValidationRulesKey",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "'LocalValidationRulesKey' is declared here.",
          "range": {
            "end": {
              "character": 29,
              "line": 32
            },
            "start": {
              "character": 6,
              "line": 32
            }
          },
          "rangeText": "LocalValidationRulesKey",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
        }
      ],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "AUR4101",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "rule-provider-no-rule-found",
        "frameworkErrorCode": "AUR4101",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "fluent-rule-construction",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
      "range": {
        "end": {
          "character": 90,
          "line": 18
        },
        "start": {
          "character": 6,
          "line": 16
        }
      },
      "rangeText": "rules\n        .ensure('app-task-root')\n        .withMessage('AppTask declared service-key callbacks should be framework-rooted.')",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
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
  "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
}
```

## validation-app-source

### Probe

```json
{
  "file": "src/validation-rule-source-errors-app.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 6,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR4101",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "rule-provider-no-rule-found",
        "frameworkErrorCode": "AUR4101",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "fluent-rule-construction",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
      "range": {
        "end": {
          "character": 39,
          "line": 49
        },
        "start": {
          "character": 4,
          "line": 46
        }
      },
      "rangeText": "this.rules\n      .on(Person)\n      .ensure('name')\n      .withMessage('Name is required.')",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4102",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "unable-to-parse-accessor-function",
        "frameworkErrorCode": "AUR4102",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "accessor-parsing",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter.",
      "range": {
        "end": {
          "character": 54,
          "line": 52
        },
        "start": {
          "character": 14,
          "line": 52
        }
      },
      "rangeText": "(person: any) => person[getDynamicKey()]",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4108",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "group-rule-invalid-execution-result",
        "frameworkErrorCode": "AUR4108",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "group-rule-execution",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Group rule result targets \"email\", but that property is not part of the group.",
      "range": {
        "end": {
          "character": 62,
          "line": 56
        },
        "start": {
          "character": 55,
          "line": 56
        }
      },
      "rangeText": "'email'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4101",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "rule-provider-no-rule-found",
        "frameworkErrorCode": "AUR4101",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "fluent-rule-construction",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
      "range": {
        "end": {
          "character": 113,
          "line": 61
        },
        "start": {
          "character": 4,
          "line": 58
        }
      },
      "rangeText": "this.erasedContainer\n      .get(IValidationRules)\n      .ensure('container-root')\n      .withMessage('Container-returned validation rules stay framework-rooted when the receiver type is erased.')",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4106",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "hydrate-rule-invalid-name",
        "frameworkErrorCode": "AUR4106",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "model-rule-hydration",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Model-based validation property names must be non-empty strings.",
      "range": {
        "end": {
          "character": 10,
          "line": 65
        },
        "start": {
          "character": 8,
          "line": 65
        }
      },
      "rangeText": "''",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR4105",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "validation",
        "diagnosticKind": "hydrate-rule-unsupported",
        "frameworkErrorCode": "AUR4105",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "model-rule-hydration",
        "relatedInformation": [],
        "relatedQueryKind": "validation-issues",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "changeDomain": "inspection",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "not-applicable"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "The default validation model-rule hydrator does not support rule \"customRule\".",
      "range": {
        "end": {
          "character": 50,
          "line": 66
        },
        "start": {
          "character": 40,
          "line": 66
        }
      },
      "rangeText": "customRule",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
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
  "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
}
```
