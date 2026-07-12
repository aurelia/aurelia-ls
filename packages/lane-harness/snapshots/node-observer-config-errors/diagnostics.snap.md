# node-observer-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/node-observer-config-errors`
Probe file: `packages/lane-harness/probes/node-observer-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## node-observer-main-source

### Probe

```json
{
  "file": "src/main.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 3,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
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
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Mapping for property value of <INPUT /> already exists.",
      "range": {
        "end": {
          "character": 64,
          "line": 19
        },
        "start": {
          "character": 6,
          "line": 19
        }
      },
      "rangeText": "locator.useConfig('INPUT', 'value', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
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
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Mapping for property textContent of <* /> already exists.",
      "range": {
        "end": {
          "character": 67,
          "line": 20
        },
        "start": {
          "character": 6,
          "line": 20
        }
      },
      "rangeText": "locator.useConfigGlobal('textContent', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0653",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "node-observer-mapping-existed",
        "frameworkErrorCode": "AUR0653",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "framework-service-customization",
        "relatedInformation": [],
        "relatedQueryKind": "configuration-issues",
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
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Mapping for property value of <MY-ELEMENT /> already exists.",
      "range": {
        "end": {
          "character": 69,
          "line": 22
        },
        "start": {
          "character": 6,
          "line": 22
        }
      },
      "rangeText": "locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig)",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
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
        "groupKey": "row:diagnostic:0:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:448:506:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0653",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "node-observer-mapping-existed",
              "frameworkErrorCode": "AUR0653",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "framework-service-customization",
              "relatedInformation": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0653",
                "kind": "node-observer-mapping-existed",
                "message": "Mapping for property value of <INPUT /> already exists."
              }
            ],
            "message": "Mapping for property value of <INPUT /> already exists.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 506,
              "start": 448
            },
            "spanText": "locator.useConfig('INPUT', 'value', appNodeObserverConfig)",
            "status": "primary",
            "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:448:506:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:514:575:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0653",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "node-observer-mapping-existed",
              "frameworkErrorCode": "AUR0653",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "framework-service-customization",
              "relatedInformation": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0653",
                "kind": "node-observer-mapping-existed",
                "message": "Mapping for property textContent of <* /> already exists."
              }
            ],
            "message": "Mapping for property textContent of <* /> already exists.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 575,
              "start": 514
            },
            "spanText": "locator.useConfigGlobal('textContent', appNodeObserverConfig)",
            "status": "primary",
            "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:514:575:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:654:717:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0653",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "node-observer-mapping-existed",
              "frameworkErrorCode": "AUR0653",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "framework-service-customization",
              "relatedInformation": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0653",
                "kind": "node-observer-mapping-existed",
                "message": "Mapping for property value of <MY-ELEMENT /> already exists."
              }
            ],
            "message": "Mapping for property value of <MY-ELEMENT /> already exists.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 717,
              "start": 654
            },
            "spanText": "locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig)",
            "status": "primary",
            "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:configuration:node-observer-mapping-existed:framework-error-code:AUR0653:src/main.ts:654:717:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 3,
    "rawRowCount": 3
  },
  "raw": {
    "diagnosticCount": 3,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0653",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "node-observer-mapping-existed",
          "frameworkErrorCode": "AUR0653",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "framework-service-customization",
          "relatedInformation": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0653",
            "kind": "node-observer-mapping-existed",
            "message": "Mapping for property value of <INPUT /> already exists."
          }
        ],
        "message": "Mapping for property value of <INPUT /> already exists.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 506,
          "start": 448
        },
        "spanText": "locator.useConfig('INPUT', 'value', appNodeObserverConfig)",
        "status": "canonical",
        "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0653",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "node-observer-mapping-existed",
          "frameworkErrorCode": "AUR0653",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "framework-service-customization",
          "relatedInformation": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0653",
            "kind": "node-observer-mapping-existed",
            "message": "Mapping for property textContent of <* /> already exists."
          }
        ],
        "message": "Mapping for property textContent of <* /> already exists.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 575,
          "start": 514
        },
        "spanText": "locator.useConfigGlobal('textContent', appNodeObserverConfig)",
        "status": "canonical",
        "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0653",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "node-observer-mapping-existed",
          "frameworkErrorCode": "AUR0653",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "framework-service-customization",
          "relatedInformation": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0653",
            "kind": "node-observer-mapping-existed",
            "message": "Mapping for property value of <MY-ELEMENT /> already exists."
          }
        ],
        "message": "Mapping for property value of <MY-ELEMENT /> already exists.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 717,
          "start": 654
        },
        "spanText": "locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig)",
        "status": "canonical",
        "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 3,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0653",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "node-observer-mapping-existed",
            "frameworkErrorCode": "AUR0653",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "framework-service-customization",
            "relatedInformation": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0653",
              "kind": "node-observer-mapping-existed",
              "message": "Mapping for property value of <INPUT /> already exists."
            }
          ],
          "message": "Mapping for property value of <INPUT /> already exists.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 506,
            "start": 448
          },
          "spanText": "locator.useConfig('INPUT', 'value', appNodeObserverConfig)",
          "status": "primary",
          "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0653",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "node-observer-mapping-existed",
            "frameworkErrorCode": "AUR0653",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "framework-service-customization",
            "relatedInformation": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0653",
              "kind": "node-observer-mapping-existed",
              "message": "Mapping for property textContent of <* /> already exists."
            }
          ],
          "message": "Mapping for property textContent of <* /> already exists.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 575,
            "start": 514
          },
          "spanText": "locator.useConfigGlobal('textContent', appNodeObserverConfig)",
          "status": "primary",
          "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0653",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "node-observer-mapping-existed",
            "frameworkErrorCode": "AUR0653",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "framework-service-customization",
            "relatedInformation": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0653",
              "kind": "node-observer-mapping-existed",
              "message": "Mapping for property value of <MY-ELEMENT /> already exists."
            }
          ],
          "message": "Mapping for property value of <MY-ELEMENT /> already exists.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 717,
            "start": 654
          },
          "spanText": "locator.useConfig('MY-ELEMENT', 'value', appNodeObserverConfig)",
          "status": "primary",
          "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/node-observer-config-errors/src/main.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 3,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 3,
  "suppressedCount": 0
}
```
