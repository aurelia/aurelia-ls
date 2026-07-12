# resource-definition-api-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-definition-api-errors`
Probe file: `packages/lane-harness/probes/resource-definition-api-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## resource-definition-api-main

### Probe

```json
{
  "file": "src/main.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 5,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0761",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-element-definition-only-name",
        "frameworkErrorCode": "AUR0761",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
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
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Cannot create a custom element definition with only a name and no type.",
      "range": {
        "end": {
          "character": 50,
          "line": 13
        },
        "start": {
          "character": 0,
          "line": 13
        }
      },
      "rangeText": "CustomElementDefinition.create('name-only' as any)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0760",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-element-definition-not-found",
        "frameworkErrorCode": "AUR0760",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
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
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "No custom element definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 39,
          "line": 14
        },
        "start": {
          "character": 0,
          "line": 14
        }
      },
      "rangeText": "CustomElement.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0759",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "custom-attribute-definition-not-found",
        "frameworkErrorCode": "AUR0759",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
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
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "No custom attribute definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 41,
          "line": 15
        },
        "start": {
          "character": 0,
          "line": 15
        }
      },
      "rangeText": "CustomAttribute.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0152",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "value-converter-definition-not-found",
        "frameworkErrorCode": "AUR0152",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
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
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "No value converter definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 40,
          "line": 16
        },
        "start": {
          "character": 0,
          "line": 16
        }
      },
      "rangeText": "ValueConverter.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0151",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "binding-behavior-definition-not-found",
        "frameworkErrorCode": "AUR0151",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "resource-definition-api",
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
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
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "No binding behavior definition found for type PlainThing.",
      "range": {
        "end": {
          "character": 41,
          "line": 17
        },
        "start": {
          "character": 0,
          "line": 17
        }
      },
      "rangeText": "BindingBehavior.getDefinition(PlainThing)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
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
        "groupKey": "row:diagnostic:0:resource:custom-element-definition-only-name:framework-error-code:AUR0761:src/main.ts:216:266:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0761",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "custom-element-definition-only-name",
              "frameworkErrorCode": "AUR0761",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "resource-definition-api",
              "relatedInformation": [],
              "relatedQueryKind": "resource-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
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
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0761",
                "kind": "custom-element-definition-only-name",
                "message": "Cannot create a custom element definition with only a name and no type."
              }
            ],
            "message": "Cannot create a custom element definition with only a name and no type.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 266,
              "start": 216
            },
            "spanText": "CustomElementDefinition.create('name-only' as any)",
            "status": "primary",
            "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:resource:custom-element-definition-only-name:framework-error-code:AUR0761:src/main.ts:216:266:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:resource:custom-element-definition-not-found:framework-error-code:AUR0760:src/main.ts:268:307:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0760",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "custom-element-definition-not-found",
              "frameworkErrorCode": "AUR0760",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "resource-definition-api",
              "relatedInformation": [],
              "relatedQueryKind": "resource-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
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
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0760",
                "kind": "custom-element-definition-not-found",
                "message": "No custom element definition found for type PlainThing."
              }
            ],
            "message": "No custom element definition found for type PlainThing.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 307,
              "start": 268
            },
            "spanText": "CustomElement.getDefinition(PlainThing)",
            "status": "primary",
            "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:resource:custom-element-definition-not-found:framework-error-code:AUR0760:src/main.ts:268:307:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:resource:custom-attribute-definition-not-found:framework-error-code:AUR0759:src/main.ts:309:350:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0759",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "custom-attribute-definition-not-found",
              "frameworkErrorCode": "AUR0759",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "resource-definition-api",
              "relatedInformation": [],
              "relatedQueryKind": "resource-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
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
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0759",
                "kind": "custom-attribute-definition-not-found",
                "message": "No custom attribute definition found for type PlainThing."
              }
            ],
            "message": "No custom attribute definition found for type PlainThing.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 350,
              "start": 309
            },
            "spanText": "CustomAttribute.getDefinition(PlainThing)",
            "status": "primary",
            "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:resource:custom-attribute-definition-not-found:framework-error-code:AUR0759:src/main.ts:309:350:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:resource:value-converter-definition-not-found:framework-error-code:AUR0152:src/main.ts:352:392:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0152",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "value-converter-definition-not-found",
              "frameworkErrorCode": "AUR0152",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "resource-definition-api",
              "relatedInformation": [],
              "relatedQueryKind": "resource-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
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
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0152",
                "kind": "value-converter-definition-not-found",
                "message": "No value converter definition found for type PlainThing."
              }
            ],
            "message": "No value converter definition found for type PlainThing.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 392,
              "start": 352
            },
            "spanText": "ValueConverter.getDefinition(PlainThing)",
            "status": "primary",
            "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:resource:value-converter-definition-not-found:framework-error-code:AUR0152:src/main.ts:352:392:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:resource:binding-behavior-definition-not-found:framework-error-code:AUR0151:src/main.ts:394:435:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0151",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "binding-behavior-definition-not-found",
              "frameworkErrorCode": "AUR0151",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "resource-definition-api",
              "relatedInformation": [],
              "relatedQueryKind": "resource-issues",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "changeDomain": "inspection",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "not-applicable"
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
            "file": "src/main.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0151",
                "kind": "binding-behavior-definition-not-found",
                "message": "No binding behavior definition found for type PlainThing."
              }
            ],
            "message": "No binding behavior definition found for type PlainThing.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 435,
              "start": 394
            },
            "spanText": "BindingBehavior.getDefinition(PlainThing)",
            "status": "primary",
            "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:resource:binding-behavior-definition-not-found:framework-error-code:AUR0151:src/main.ts:394:435:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 5,
    "rawRowCount": 5
  },
  "raw": {
    "diagnosticCount": 5,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0761",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-element-definition-only-name",
          "frameworkErrorCode": "AUR0761",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-definition-api",
          "relatedInformation": [],
          "relatedQueryKind": "resource-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
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
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0761",
            "kind": "custom-element-definition-only-name",
            "message": "Cannot create a custom element definition with only a name and no type."
          }
        ],
        "message": "Cannot create a custom element definition with only a name and no type.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 266,
          "start": 216
        },
        "spanText": "CustomElementDefinition.create('name-only' as any)",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0760",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-element-definition-not-found",
          "frameworkErrorCode": "AUR0760",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-definition-api",
          "relatedInformation": [],
          "relatedQueryKind": "resource-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
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
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0760",
            "kind": "custom-element-definition-not-found",
            "message": "No custom element definition found for type PlainThing."
          }
        ],
        "message": "No custom element definition found for type PlainThing.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 307,
          "start": 268
        },
        "spanText": "CustomElement.getDefinition(PlainThing)",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0759",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-attribute-definition-not-found",
          "frameworkErrorCode": "AUR0759",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-definition-api",
          "relatedInformation": [],
          "relatedQueryKind": "resource-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
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
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0759",
            "kind": "custom-attribute-definition-not-found",
            "message": "No custom attribute definition found for type PlainThing."
          }
        ],
        "message": "No custom attribute definition found for type PlainThing.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 350,
          "start": 309
        },
        "spanText": "CustomAttribute.getDefinition(PlainThing)",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0152",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "value-converter-definition-not-found",
          "frameworkErrorCode": "AUR0152",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-definition-api",
          "relatedInformation": [],
          "relatedQueryKind": "resource-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
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
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0152",
            "kind": "value-converter-definition-not-found",
            "message": "No value converter definition found for type PlainThing."
          }
        ],
        "message": "No value converter definition found for type PlainThing.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 392,
          "start": 352
        },
        "spanText": "ValueConverter.getDefinition(PlainThing)",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0151",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "binding-behavior-definition-not-found",
          "frameworkErrorCode": "AUR0151",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-definition-api",
          "relatedInformation": [],
          "relatedQueryKind": "resource-issues",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "changeDomain": "inspection",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "not-applicable"
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
        "file": "src/main.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0151",
            "kind": "binding-behavior-definition-not-found",
            "message": "No binding behavior definition found for type PlainThing."
          }
        ],
        "message": "No binding behavior definition found for type PlainThing.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 435,
          "start": 394
        },
        "spanText": "BindingBehavior.getDefinition(PlainThing)",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 5,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0761",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "custom-element-definition-only-name",
            "frameworkErrorCode": "AUR0761",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "resource-definition-api",
            "relatedInformation": [],
            "relatedQueryKind": "resource-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
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
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0761",
              "kind": "custom-element-definition-only-name",
              "message": "Cannot create a custom element definition with only a name and no type."
            }
          ],
          "message": "Cannot create a custom element definition with only a name and no type.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 266,
            "start": 216
          },
          "spanText": "CustomElementDefinition.create('name-only' as any)",
          "status": "primary",
          "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0760",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "custom-element-definition-not-found",
            "frameworkErrorCode": "AUR0760",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "resource-definition-api",
            "relatedInformation": [],
            "relatedQueryKind": "resource-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
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
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0760",
              "kind": "custom-element-definition-not-found",
              "message": "No custom element definition found for type PlainThing."
            }
          ],
          "message": "No custom element definition found for type PlainThing.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 307,
            "start": 268
          },
          "spanText": "CustomElement.getDefinition(PlainThing)",
          "status": "primary",
          "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0759",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "custom-attribute-definition-not-found",
            "frameworkErrorCode": "AUR0759",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "resource-definition-api",
            "relatedInformation": [],
            "relatedQueryKind": "resource-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
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
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0759",
              "kind": "custom-attribute-definition-not-found",
              "message": "No custom attribute definition found for type PlainThing."
            }
          ],
          "message": "No custom attribute definition found for type PlainThing.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 350,
            "start": 309
          },
          "spanText": "CustomAttribute.getDefinition(PlainThing)",
          "status": "primary",
          "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0152",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "value-converter-definition-not-found",
            "frameworkErrorCode": "AUR0152",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "resource-definition-api",
            "relatedInformation": [],
            "relatedQueryKind": "resource-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
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
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0152",
              "kind": "value-converter-definition-not-found",
              "message": "No value converter definition found for type PlainThing."
            }
          ],
          "message": "No value converter definition found for type PlainThing.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 392,
            "start": 352
          },
          "spanText": "ValueConverter.getDefinition(PlainThing)",
          "status": "primary",
          "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0151",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "binding-behavior-definition-not-found",
            "frameworkErrorCode": "AUR0151",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "resource-definition-api",
            "relatedInformation": [],
            "relatedQueryKind": "resource-issues",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "changeDomain": "inspection",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "not-applicable"
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
          "file": "src/main.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0151",
              "kind": "binding-behavior-definition-not-found",
              "message": "No binding behavior definition found for type PlainThing."
            }
          ],
          "message": "No binding behavior definition found for type PlainThing.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 435,
            "start": 394
          },
          "spanText": "BindingBehavior.getDefinition(PlainThing)",
          "status": "primary",
          "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-definition-api-errors/src/main.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 5,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 5,
  "suppressedCount": 0
}
```
