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

### publishDiagnostics

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
              "label": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@1025..1048",
              "path": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
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
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
}
```

### aurelia/getDiagnostics

```json
{
  "answer": {
    "analysisDepth": "binding-observation",
    "continuations": [
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "orient",
          "inspect"
        ],
        "kind": "follow-query",
        "rationale": "Cluster detailed diagnostics back into a summary view.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "app-diagnostic-summary",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/main.ts"
          }
        },
        "targetQueryKind": "app-diagnostic-summary"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with ordinary TypeScript diagnostics.",
        "targetQuery": {
          "kind": "typescript-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/main.ts"
          }
        },
        "targetQueryKind": "typescript-diagnostics"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with template diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/main.ts"
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world"
          ],
          "sourceFacts": [
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 694,
                "kind": "typescript-diagnostic",
                "label": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@671..694",
                "path": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
                "role": "line:20:character:23",
                "start": 671
              }
            }
          ],
          "sourceRequirement": "exact-authored-span"
        },
        "intents": [
          "diagnose",
          "repair"
        ],
        "kind": "follow-query",
        "rationale": "Inspect typescript-diagnostics rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "typescript-diagnostics",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "typescript-diagnostics"
      },
      {
        "blockers": [],
        "cost": "app-world",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world"
          ],
          "sourceFacts": [
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/main.ts",
                  "path": "src/main.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 638,
                "kind": "source-span-address",
                "label": "src/main.ts@509..638",
                "path": "src/main.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 509
              }
            }
          ],
          "sourceRequirement": "exact-authored-span"
        },
        "intents": [
          "diagnose",
          "repair"
        ],
        "kind": "follow-query",
        "rationale": "Inspect validation-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "validation-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "validation-issues"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 2 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:typescript:TS2449:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts:671:694:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
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
                    "label": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@1025..1048",
                    "path": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "expression",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2449",
                "kind": "TS2449",
                "message": "Class 'LocalValidationRulesKey' used before its declaration."
              }
            ],
            "message": "Class 'LocalValidationRulesKey' used before its declaration.",
            "related": [
              {
                "anomaly": null,
                "code": "TS2728",
                "file": "src/main.ts",
                "message": "'LocalValidationRulesKey' is declared here.",
                "sourceRole": "app-source",
                "span": {
                  "end": 1048,
                  "start": 1025
                },
                "spanText": "LocalValidationRulesKey",
                "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
              }
            ],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 694,
              "start": 671
            },
            "spanText": "LocalValidationRulesKey",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:typescript:TS2449:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts:671:694:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/main.ts:509:638:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4101",
                "kind": "rule-provider-no-rule-found",
                "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
              }
            ],
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 638,
              "start": 509
            },
            "spanText": "rules\n        .ensure('app-task-root')\n        .withMessage('AppTask declared service-key callbacks should be framework-rooted.')",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/main.ts:509:638:no-missing-input"
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
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
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
                "label": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@1025..1048",
                "path": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "expression",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2449",
            "kind": "TS2449",
            "message": "Class 'LocalValidationRulesKey' used before its declaration."
          }
        ],
        "message": "Class 'LocalValidationRulesKey' used before its declaration.",
        "related": [
          {
            "anomaly": null,
            "code": "TS2728",
            "file": "src/main.ts",
            "message": "'LocalValidationRulesKey' is declared here.",
            "sourceRole": "app-source",
            "span": {
              "end": 1048,
              "start": 1025
            },
            "spanText": "LocalValidationRulesKey",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
          }
        ],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 694,
          "start": 671
        },
        "spanText": "LocalValidationRulesKey",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4101",
            "kind": "rule-provider-no-rule-found",
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
          }
        ],
        "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 638,
          "start": 509
        },
        "spanText": "rules\n        .ensure('app-task-root')\n        .withMessage('AppTask declared service-key callbacks should be framework-rooted.')",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 2,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
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
                  "label": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts@1025..1048",
                  "path": "c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/validation-rule-source-errors/src/main.ts",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "expression",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2449",
              "kind": "TS2449",
              "message": "Class 'LocalValidationRulesKey' used before its declaration."
            }
          ],
          "message": "Class 'LocalValidationRulesKey' used before its declaration.",
          "related": [
            {
              "anomaly": null,
              "code": "TS2728",
              "file": "src/main.ts",
              "message": "'LocalValidationRulesKey' is declared here.",
              "sourceRole": "app-source",
              "span": {
                "end": 1048,
                "start": 1025
              },
              "spanText": "LocalValidationRulesKey",
              "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
            }
          ],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 694,
            "start": 671
          },
          "spanText": "LocalValidationRulesKey",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4101",
              "kind": "rule-provider-no-rule-found",
              "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
            }
          ],
          "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 638,
            "start": 509
          },
          "spanText": "rules\n        .ensure('app-task-root')\n        .withMessage('AppTask declared service-key callbacks should be framework-rooted.')",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/validation-rule-source-errors/src/main.ts"
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

## validation-app-source

### Probe

```json
{
  "file": "src/validation-rule-source-errors-app.ts"
}
```

### publishDiagnostics

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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "bindable-validation",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
}
```

### aurelia/getDiagnostics

```json
{
  "answer": {
    "analysisDepth": "binding-observation",
    "continuations": [
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "orient",
          "inspect"
        ],
        "kind": "follow-query",
        "rationale": "Cluster detailed diagnostics back into a summary view.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "app-diagnostic-summary",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/validation-rule-source-errors-app.ts"
          }
        },
        "targetQueryKind": "app-diagnostic-summary"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with ordinary TypeScript diagnostics.",
        "targetQuery": {
          "kind": "typescript-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/validation-rule-source-errors-app.ts"
          }
        },
        "targetQueryKind": "typescript-diagnostics"
      },
      {
        "blockers": [],
        "cost": "query-type-projection",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world",
            "source-input"
          ],
          "sourceFacts": [],
          "sourceRequirement": "authored-source"
        },
        "intents": [
          "diagnose"
        ],
        "kind": "follow-query",
        "rationale": "Compare unified diagnostics with template diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          },
          "sourceFile": {
            "filePath": "src/validation-rule-source-errors-app.ts"
          }
        },
        "targetQueryKind": "template-diagnostics"
      },
      {
        "blockers": [],
        "cost": "app-world",
        "evidence": {
          "epochDependencies": [
            "project-input",
            "app-world"
          ],
          "sourceFacts": [
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1284,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1194..1284",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1194
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1356,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1316..1356",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1316
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1455,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1448..1455",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1448
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1661,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1466..1661",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1466
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1747,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1745..1747",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1745
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "carrier-span",
                "exact-authored-span"
              ],
              "source": {
                "anchor": {
                  "kind": "source-file-address",
                  "label": "src/validation-rule-source-errors-app.ts",
                  "path": "src/validation-rule-source-errors-app.ts",
                  "sourceFileRole": "app-source",
                  "sourceWorkspaceKey": "validation-rule-source-errors"
                },
                "end": 1830,
                "kind": "source-span-address",
                "label": "src/validation-rule-source-errors-app.ts@1820..1830",
                "path": "src/validation-rule-source-errors-app.ts",
                "role": "primary",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "validation-rule-source-errors",
                "start": 1820
              }
            }
          ],
          "sourceRequirement": "exact-authored-span"
        },
        "intents": [
          "diagnose",
          "repair"
        ],
        "kind": "follow-query",
        "rationale": "Inspect validation-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "validation-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "validation-issues"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 6 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:0:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/validation-rule-source-errors-app.ts:1194:1284:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4101",
                "kind": "rule-provider-no-rule-found",
                "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
              }
            ],
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1284,
              "start": 1194
            },
            "spanText": "this.rules\n      .on(Person)\n      .ensure('name')\n      .withMessage('Name is required.')",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/validation-rule-source-errors-app.ts:1194:1284:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:validation:unable-to-parse-accessor-function:framework-runtime-behavior:AUR4102:src/validation-rule-source-errors-app.ts:1316:1356:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4102",
                "kind": "unable-to-parse-accessor-function",
                "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter."
              }
            ],
            "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1356,
              "start": 1316
            },
            "spanText": "(person: any) => person[getDynamicKey()]",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:validation:unable-to-parse-accessor-function:framework-runtime-behavior:AUR4102:src/validation-rule-source-errors-app.ts:1316:1356:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:validation:group-rule-invalid-execution-result:framework-runtime-behavior:AUR4108:src/validation-rule-source-errors-app.ts:1448:1455:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4108",
                "kind": "group-rule-invalid-execution-result",
                "message": "Group rule result targets \"email\", but that property is not part of the group."
              }
            ],
            "message": "Group rule result targets \"email\", but that property is not part of the group.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1455,
              "start": 1448
            },
            "spanText": "'email'",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:validation:group-rule-invalid-execution-result:framework-runtime-behavior:AUR4108:src/validation-rule-source-errors-app.ts:1448:1455:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/validation-rule-source-errors-app.ts:1466:1661:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4101",
                "kind": "rule-provider-no-rule-found",
                "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
              }
            ],
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1661,
              "start": 1466
            },
            "spanText": "this.erasedContainer\n      .get(IValidationRules)\n      .ensure('container-root')\n      .withMessage('Container-returned validation rules stay framework-rooted when the receiver type is erased.')",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:validation:rule-provider-no-rule-found:framework-runtime-behavior:AUR4101:src/validation-rule-source-errors-app.ts:1466:1661:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:validation:hydrate-rule-invalid-name:framework-runtime-behavior:AUR4106:src/validation-rule-source-errors-app.ts:1745:1747:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4106",
                "kind": "hydrate-rule-invalid-name",
                "message": "Model-based validation property names must be non-empty strings."
              }
            ],
            "message": "Model-based validation property names must be non-empty strings.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1747,
              "start": 1745
            },
            "spanText": "''",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:validation:hydrate-rule-invalid-name:framework-runtime-behavior:AUR4106:src/validation-rule-source-errors-app.ts:1745:1747:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:validation:hydrate-rule-unsupported:framework-runtime-behavior:AUR4105:src/validation-rule-source-errors-app.ts:1820:1830:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "bindable-validation",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "bindable-validation",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/validation-rule-source-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR4105",
                "kind": "hydrate-rule-unsupported",
                "message": "The default validation model-rule hydrator does not support rule \"customRule\"."
              }
            ],
            "message": "The default validation model-rule hydrator does not support rule \"customRule\".",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:validation",
            "span": {
              "end": 1830,
              "start": 1820
            },
            "spanText": "customRule",
            "status": "primary",
            "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:validation:hydrate-rule-unsupported:framework-runtime-behavior:AUR4105:src/validation-rule-source-errors-app.ts:1820:1830:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 6,
    "rawRowCount": 6
  },
  "raw": {
    "diagnosticCount": 6,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4101",
            "kind": "rule-provider-no-rule-found",
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
          }
        ],
        "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1284,
          "start": 1194
        },
        "spanText": "this.rules\n      .on(Person)\n      .ensure('name')\n      .withMessage('Name is required.')",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4102",
            "kind": "unable-to-parse-accessor-function",
            "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter."
          }
        ],
        "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1356,
          "start": 1316
        },
        "spanText": "(person: any) => person[getDynamicKey()]",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4108",
            "kind": "group-rule-invalid-execution-result",
            "message": "Group rule result targets \"email\", but that property is not part of the group."
          }
        ],
        "message": "Group rule result targets \"email\", but that property is not part of the group.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1455,
          "start": 1448
        },
        "spanText": "'email'",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4101",
            "kind": "rule-provider-no-rule-found",
            "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
          }
        ],
        "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1661,
          "start": 1466
        },
        "spanText": "this.erasedContainer\n      .get(IValidationRules)\n      .ensure('container-root')\n      .withMessage('Container-returned validation rules stay framework-rooted when the receiver type is erased.')",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4106",
            "kind": "hydrate-rule-invalid-name",
            "message": "Model-based validation property names must be non-empty strings."
          }
        ],
        "message": "Model-based validation property names must be non-empty strings.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1747,
          "start": 1745
        },
        "spanText": "''",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "bindable-validation",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "bindable-validation",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/validation-rule-source-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR4105",
            "kind": "hydrate-rule-unsupported",
            "message": "The default validation model-rule hydrator does not support rule \"customRule\"."
          }
        ],
        "message": "The default validation model-rule hydrator does not support rule \"customRule\".",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:validation",
        "span": {
          "end": 1830,
          "start": 1820
        },
        "spanText": "customRule",
        "status": "canonical",
        "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 6,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4101",
              "kind": "rule-provider-no-rule-found",
              "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
            }
          ],
          "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1284,
            "start": 1194
          },
          "spanText": "this.rules\n      .on(Person)\n      .ensure('name')\n      .withMessage('Name is required.')",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4102",
              "kind": "unable-to-parse-accessor-function",
              "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter."
            }
          ],
          "message": "Validation accessor functions must return a direct property/keyed access path rooted at their single parameter.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1356,
            "start": 1316
          },
          "spanText": "(person: any) => person[getDynamicKey()]",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4108",
              "kind": "group-rule-invalid-execution-result",
              "message": "Group rule result targets \"email\", but that property is not part of the group."
            }
          ],
          "message": "Group rule result targets \"email\", but that property is not part of the group.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1455,
            "start": 1448
          },
          "spanText": "'email'",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4101",
              "kind": "rule-provider-no-rule-found",
              "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule."
            }
          ],
          "message": "withMessage(...) is called before this PropertyRule chain has added a validation rule.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1661,
            "start": 1466
          },
          "spanText": "this.erasedContainer\n      .get(IValidationRules)\n      .ensure('container-root')\n      .withMessage('Container-returned validation rules stay framework-rooted when the receiver type is erased.')",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4106",
              "kind": "hydrate-rule-invalid-name",
              "message": "Model-based validation property names must be non-empty strings."
            }
          ],
          "message": "Model-based validation property names must be non-empty strings.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1747,
            "start": 1745
          },
          "spanText": "''",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "bindable-validation",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "bindable-validation",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/validation-rule-source-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR4105",
              "kind": "hydrate-rule-unsupported",
              "message": "The default validation model-rule hydrator does not support rule \"customRule\"."
            }
          ],
          "message": "The default validation model-rule hydrator does not support rule \"customRule\".",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:validation",
          "span": {
            "end": 1830,
            "start": 1820
          },
          "spanText": "customRule",
          "status": "primary",
          "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/validation-rule-source-errors/src/validation-rule-source-errors-app.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 6,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 6,
  "suppressedCount": 0
}
```
