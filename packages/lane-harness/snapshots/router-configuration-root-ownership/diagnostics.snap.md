# router-configuration-root-ownership diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/router-configuration-root-ownership`
Probe file: `packages/lane-harness/probes/router-configuration-root-ownership.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## duplicate-router-configuration-one-causal-error

### Probe

```json
{
  "file": "src/main.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR3168",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "router",
        "diagnosticKind": "duplicate-router-configuration",
        "frameworkErrorCode": "AUR3168",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "router-configuration-registration",
        "relatedInformation": [
          {
            "message": "The first RouterConfiguration registration in this application container tree is here.",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/main.ts",
                "path": "src/main.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "router-configuration-root-ownership"
              },
              "end": 2852,
              "kind": "source-span-address",
              "label": "src/main.ts@2787..2852",
              "path": "src/main.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "router-configuration-root-ownership",
              "start": 2787
            }
          }
        ],
        "relatedQueryKind": "router-issues",
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
      "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.",
      "range": {
        "end": {
          "character": 70,
          "line": 125
        },
        "start": {
          "character": 4,
          "line": 125
        }
      },
      "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "The first RouterConfiguration registration in this application container tree is here.",
          "range": {
            "end": {
              "character": 69,
              "line": 124
            },
            "start": {
              "character": 4,
              "line": 124
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Attribute \"load\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Attribute \"href\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        },
        {
          "anomaly": null,
          "file": "src/main.ts",
          "message": "Element \"au-viewport\" has already been registered.",
          "range": {
            "end": {
              "character": 70,
              "line": 125
            },
            "start": {
              "character": 4,
              "line": 125
            }
          },
          "rangeText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 3,
    "groups": [
      {
        "groupKey": "router-registration:diagnostic:3:router:duplicate-router-configuration:framework-error-code:AUR3168:src/main.ts:2858:2924:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR3168",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "router",
              "diagnosticKind": "duplicate-router-configuration",
              "frameworkErrorCode": "AUR3168",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "phase": "router-configuration-registration",
              "relatedInformation": [],
              "relatedQueryKind": "router-issues",
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
                "code": "AUR3168",
                "kind": "duplicate-router-configuration",
                "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously."
              }
            ],
            "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.",
            "related": [
              {
                "anomaly": null,
                "code": null,
                "file": "src/main.ts",
                "message": "The first RouterConfiguration registration in this application container tree is here.",
                "sourceRole": null,
                "span": {
                  "end": 2852,
                  "start": 2787
                },
                "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
                "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
              }
            ],
            "severity": "error",
            "source": "semantic-runtime:router",
            "span": {
              "end": 2924,
              "start": 2858
            },
            "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
            "status": "primary",
            "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:router:duplicate-router-configuration:framework-error-code:AUR3168:src/main.ts:2858:2924:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 4,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "resource-resolution",
              "code": "AUR0154",
              "data": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-attribute-already-registered",
                "frameworkErrorCode": "AUR0154",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
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
              "impact": "degraded",
              "issues": [
                {
                  "code": "AUR0154",
                  "kind": "custom-attribute-already-registered",
                  "message": "Attribute \"load\" has already been registered."
                }
              ],
              "message": "Attribute \"load\" has already been registered.",
              "related": [
                {
                  "anomaly": null,
                  "code": null,
                  "file": "src/main.ts",
                  "message": "Resource was first registered here.",
                  "sourceRole": null,
                  "span": {
                    "end": 2852,
                    "start": 2787
                  },
                  "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
                  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
                }
              ],
              "severity": "warning",
              "source": "semantic-runtime:resource",
              "span": {
                "end": 2924,
                "start": 2858
              },
              "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
              "status": "contextual",
              "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
            },
            "relation": "runtime-consequence",
            "role": "contextual",
            "rowId": "diagnostic:0:resource:custom-attribute-already-registered:framework-error-code:AUR0154:src/main.ts:2858:2924:no-missing-input"
          },
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "resource-resolution",
              "code": "AUR0154",
              "data": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-attribute-already-registered",
                "frameworkErrorCode": "AUR0154",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
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
              "impact": "degraded",
              "issues": [
                {
                  "code": "AUR0154",
                  "kind": "custom-attribute-already-registered",
                  "message": "Attribute \"href\" has already been registered."
                }
              ],
              "message": "Attribute \"href\" has already been registered.",
              "related": [
                {
                  "anomaly": null,
                  "code": null,
                  "file": "src/main.ts",
                  "message": "Resource was first registered here.",
                  "sourceRole": null,
                  "span": {
                    "end": 2852,
                    "start": 2787
                  },
                  "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
                  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
                }
              ],
              "severity": "warning",
              "source": "semantic-runtime:resource",
              "span": {
                "end": 2924,
                "start": 2858
              },
              "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
              "status": "contextual",
              "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
            },
            "relation": "runtime-consequence",
            "role": "contextual",
            "rowId": "diagnostic:1:resource:custom-attribute-already-registered:framework-error-code:AUR0154:src/main.ts:2858:2924:no-missing-input"
          },
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "resource-resolution",
              "code": "AUR0153",
              "data": {
                "diagnosticAuthority": "framework-error-code",
                "diagnosticDomain": "resource",
                "diagnosticKind": "custom-element-already-registered",
                "frameworkErrorCode": "AUR0153",
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "resource-registration",
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
              "impact": "degraded",
              "issues": [
                {
                  "code": "AUR0153",
                  "kind": "custom-element-already-registered",
                  "message": "Element \"au-viewport\" has already been registered."
                }
              ],
              "message": "Element \"au-viewport\" has already been registered.",
              "related": [
                {
                  "anomaly": null,
                  "code": null,
                  "file": "src/main.ts",
                  "message": "Resource was first registered here.",
                  "sourceRole": null,
                  "span": {
                    "end": 2852,
                    "start": 2787
                  },
                  "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
                  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
                }
              ],
              "severity": "warning",
              "source": "semantic-runtime:resource",
              "span": {
                "end": 2924,
                "start": 2858
              },
              "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
              "status": "contextual",
              "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
            },
            "relation": "runtime-consequence",
            "role": "contextual",
            "rowId": "diagnostic:2:resource:custom-element-already-registered:framework-error-code:AUR0153:src/main.ts:2858:2924:no-missing-input"
          }
        ],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 4
  },
  "raw": {
    "diagnosticCount": 4,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0154",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-attribute-already-registered",
          "frameworkErrorCode": "AUR0154",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-registration",
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
        "impact": "degraded",
        "issues": [
          {
            "code": "AUR0154",
            "kind": "custom-attribute-already-registered",
            "message": "Attribute \"load\" has already been registered."
          }
        ],
        "message": "Attribute \"load\" has already been registered.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/main.ts",
            "message": "Resource was first registered here.",
            "sourceRole": null,
            "span": {
              "end": 2852,
              "start": 2787
            },
            "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
            "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
          }
        ],
        "severity": "warning",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2924,
          "start": 2858
        },
        "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
        "status": "canonical",
        "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0154",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-attribute-already-registered",
          "frameworkErrorCode": "AUR0154",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-registration",
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
        "impact": "degraded",
        "issues": [
          {
            "code": "AUR0154",
            "kind": "custom-attribute-already-registered",
            "message": "Attribute \"href\" has already been registered."
          }
        ],
        "message": "Attribute \"href\" has already been registered.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/main.ts",
            "message": "Resource was first registered here.",
            "sourceRole": null,
            "span": {
              "end": 2852,
              "start": 2787
            },
            "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
            "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
          }
        ],
        "severity": "warning",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2924,
          "start": 2858
        },
        "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
        "status": "canonical",
        "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0153",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "custom-element-already-registered",
          "frameworkErrorCode": "AUR0153",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "resource-registration",
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
        "impact": "degraded",
        "issues": [
          {
            "code": "AUR0153",
            "kind": "custom-element-already-registered",
            "message": "Element \"au-viewport\" has already been registered."
          }
        ],
        "message": "Element \"au-viewport\" has already been registered.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/main.ts",
            "message": "Resource was first registered here.",
            "sourceRole": null,
            "span": {
              "end": 2852,
              "start": 2787
            },
            "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
            "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
          }
        ],
        "severity": "warning",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2924,
          "start": 2858
        },
        "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
        "status": "canonical",
        "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR3168",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "router",
          "diagnosticKind": "duplicate-router-configuration",
          "frameworkErrorCode": "AUR3168",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "phase": "router-configuration-registration",
          "relatedInformation": [],
          "relatedQueryKind": "router-issues",
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
            "code": "AUR3168",
            "kind": "duplicate-router-configuration",
            "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously."
          }
        ],
        "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/main.ts",
            "message": "The first RouterConfiguration registration in this application container tree is here.",
            "sourceRole": null,
            "span": {
              "end": 2852,
              "start": 2787
            },
            "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
            "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
          }
        ],
        "severity": "error",
        "source": "semantic-runtime:router",
        "span": {
          "end": 2924,
          "start": 2858
        },
        "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
        "status": "canonical",
        "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
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
          "category": "project",
          "code": "AUR3168",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "router",
            "diagnosticKind": "duplicate-router-configuration",
            "frameworkErrorCode": "AUR3168",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "phase": "router-configuration-registration",
            "relatedInformation": [],
            "relatedQueryKind": "router-issues",
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
              "code": "AUR3168",
              "kind": "duplicate-router-configuration",
              "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously."
            }
          ],
          "message": "RouterConfiguration is registered more than once in the same application container tree; the root RouteContext cannot be installed unambiguously.",
          "related": [
            {
              "anomaly": null,
              "code": null,
              "file": "src/main.ts",
              "message": "The first RouterConfiguration registration in this application container tree is here.",
              "sourceRole": null,
              "span": {
                "end": 2852,
                "start": 2787
              },
              "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-first' })",
              "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
            }
          ],
          "severity": "error",
          "source": "semantic-runtime:router",
          "span": {
            "end": 2924,
            "start": 2858
          },
          "spanText": "RouterConfiguration.customize({ activeClass: 'duplicate-second' })",
          "status": "primary",
          "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/router-configuration-root-ownership/src/main.ts"
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
