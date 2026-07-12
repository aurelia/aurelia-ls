# unregistered-plugin-resources diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/unregistered-plugin-resources`
Probe file: `packages/lane-harness/probes/unregistered-plugin-resources.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## unregistered-plugin-resources-template

### Probe

```json
{
  "file": "src/unregistered-plugin-resources-app.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 11,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "router.default-resources",
        "missingInputs": [
          "router.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 21,
          "line": 0
        },
        "start": {
          "character": 8,
          "line": 0
        }
      },
      "rangeText": "load=\"orders\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "router.default-resources",
        "missingInputs": [
          "router.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 27,
          "line": 1
        },
        "start": {
          "character": 0,
          "line": 1
        }
      },
      "rangeText": "<au-viewport></au-viewport>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "ui-virtualization.default-resources",
        "missingInputs": [
          "ui-virtualization.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 40,
          "line": 4
        },
        "start": {
          "character": 6,
          "line": 4
        }
      },
      "rangeText": "virtual-repeat.for=\"item of items\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "validation-html.default-resources",
        "missingInputs": [
          "validation-html.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 23,
          "line": 9
        },
        "start": {
          "character": 0,
          "line": 7
        }
      },
      "rangeText": "<validation-container>\n  <div validation-errors.bind=\"errors\"></div>\n</validation-container>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "validation-html.default-resources",
        "missingInputs": [
          "validation-html.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 38,
          "line": 8
        },
        "start": {
          "character": 7,
          "line": 8
        }
      },
      "rangeText": "validation-errors.bind=\"errors\"",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "i18n.default-resources",
        "missingInputs": [
          "i18n.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 17,
          "line": 11
        },
        "start": {
          "character": 16,
          "line": 11
        }
      },
      "rangeText": "t",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0103",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-value-converter-framework-error",
        "frameworkErrorCode": "AUR0103",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-value-converter:AUR0103",
        "missingInputs": [
          "runtime-value-converter:AUR0103"
        ],
        "phase": "bind",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
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
      "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 17,
          "line": 11
        },
        "start": {
          "character": 16,
          "line": 11
        }
      },
      "rangeText": "t",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "validation-html.default-resources",
        "missingInputs": [
          "validation-html.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 41,
          "line": 12
        },
        "start": {
          "character": 33,
          "line": 12
        }
      },
      "rangeText": "validate",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0101",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0101",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0101",
        "missingInputs": [
          "runtime-binding-behavior:AUR0101"
        ],
        "phase": "bind",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 41,
          "line": 12
        },
        "start": {
          "character": 33,
          "line": 12
        }
      },
      "rangeText": "validate",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "framework-capability-not-registered",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "framework-capability-not-registered",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "state.default-resources",
        "missingInputs": [
          "state.default-resources"
        ],
        "phase": null,
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-framework-capability",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "framework-capability-registration",
          "readiness": "source-edit-policy-open",
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
      "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world.",
      "range": {
        "end": {
          "character": 49,
          "line": 13
        },
        "start": {
          "character": 44,
          "line": 13
        }
      },
      "rangeText": "state",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0101",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0101",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0101",
        "missingInputs": [
          "runtime-binding-behavior:AUR0101"
        ],
        "phase": "bind",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 49,
          "line": 13
        },
        "start": {
          "character": 44,
          "line": 13
        }
      },
      "rangeText": "state",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
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
        "groupKey": "row:diagnostic:10:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:8:21:router.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "router.default-resources",
              "missingInputs": [
                "router.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 21,
              "start": 8
            },
            "spanText": "load=\"orders\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:10:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:8:21:router.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:8:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:38:65:router.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "router.default-resources",
              "missingInputs": [
                "router.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 65,
              "start": 38
            },
            "spanText": "<au-viewport></au-viewport>",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:38:65:router.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:9:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:78:112:ui-virtualization.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "ui-virtualization.default-resources",
              "missingInputs": [
                "ui-virtualization.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 112,
              "start": 78
            },
            "spanText": "virtual-repeat.for=\"item of items\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:78:112:ui-virtualization.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:133:225:validation-html.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "validation-html.default-resources",
              "missingInputs": [
                "validation-html.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 225,
              "start": 133
            },
            "spanText": "<validation-container>\n  <div validation-errors.bind=\"errors\"></div>\n</validation-container>",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:133:225:validation-html.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:163:194:validation-html.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "validation-html.default-resources",
              "missingInputs": [
                "validation-html.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 194,
              "start": 163
            },
            "spanText": "validation-errors.bind=\"errors\"",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:163:194:validation-html.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:243:244:i18n.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "i18n.default-resources",
              "missingInputs": [
                "i18n.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 244,
              "start": 243
            },
            "spanText": "t",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:243:244:i18n.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/unregistered-plugin-resources-app.html:243:244:runtime-value-converter:AUR0103",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0103",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-value-converter-framework-error",
              "frameworkErrorCode": "AUR0103",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-value-converter:AUR0103",
              "missingInputs": [
                "runtime-value-converter:AUR0103"
              ],
              "phase": "bind",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-resource",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "resource-registration",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0103",
                "kind": "runtime-value-converter-framework-error",
                "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 244,
              "start": 243
            },
            "spanText": "t",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/unregistered-plugin-resources-app.html:243:244:runtime-value-converter:AUR0103"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:283:291:validation-html.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "validation-html.default-resources",
              "missingInputs": [
                "validation-html.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 291,
              "start": 283
            },
            "spanText": "validate",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:283:291:validation-html.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/unregistered-plugin-resources-app.html:283:291:runtime-binding-behavior:AUR0101",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0101",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0101",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0101",
              "missingInputs": [
                "runtime-binding-behavior:AUR0101"
              ],
              "phase": "bind",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-resource",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "resource-registration",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 291,
              "start": 283
            },
            "spanText": "validate",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/unregistered-plugin-resources-app.html:283:291:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:338:343:state.default-resources",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "framework-capability-not-registered",
            "data": {
              "diagnosticAuthority": "semantic-authoring-policy",
              "diagnosticDomain": "template",
              "diagnosticKind": "framework-capability-not-registered",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": "state.default-resources",
              "missingInputs": [
                "state.default-resources"
              ],
              "phase": null,
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-framework-capability",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "framework-capability-registration",
                "readiness": "source-edit-policy-open",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "framework-capability-not-registered",
                "kind": "framework-capability-not-registered",
                "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world."
              }
            ],
            "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 343,
              "start": 338
            },
            "spanText": "state",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:framework-capability-not-registered:semantic-authoring-policy:no-framework-code:src/unregistered-plugin-resources-app.html:338:343:state.default-resources"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/unregistered-plugin-resources-app.html:338:343:runtime-binding-behavior:AUR0101",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0101",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-binding-behavior-framework-error",
              "frameworkErrorCode": "AUR0101",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-binding-behavior:AUR0101",
              "missingInputs": [
                "runtime-binding-behavior:AUR0101"
              ],
              "phase": "bind",
              "relatedInformation": [],
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "register-resource",
                "actionability": "guided",
                "changeDomain": "app-source",
                "planKind": "resource-registration",
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
            "file": "src/unregistered-plugin-resources-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 343,
              "start": 338
            },
            "spanText": "state",
            "status": "primary",
            "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/unregistered-plugin-resources-app.html:338:343:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 11,
    "rawRowCount": 11
  },
  "raw": {
    "diagnosticCount": 11,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "validation-html.default-resources",
          "missingInputs": [
            "validation-html.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 225,
          "start": 133
        },
        "spanText": "<validation-container>\n  <div validation-errors.bind=\"errors\"></div>\n</validation-container>",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "validation-html.default-resources",
          "missingInputs": [
            "validation-html.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 194,
          "start": 163
        },
        "spanText": "validation-errors.bind=\"errors\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "i18n.default-resources",
          "missingInputs": [
            "i18n.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 244,
          "start": 243
        },
        "spanText": "t",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0103",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-value-converter-framework-error",
          "frameworkErrorCode": "AUR0103",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-value-converter:AUR0103",
          "missingInputs": [
            "runtime-value-converter:AUR0103"
          ],
          "phase": "bind",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-resource",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "resource-registration",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0103",
            "kind": "runtime-value-converter-framework-error",
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 244,
          "start": 243
        },
        "spanText": "t",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "validation-html.default-resources",
          "missingInputs": [
            "validation-html.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 291,
          "start": 283
        },
        "spanText": "validate",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0101",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0101",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0101",
          "missingInputs": [
            "runtime-binding-behavior:AUR0101"
          ],
          "phase": "bind",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-resource",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "resource-registration",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 291,
          "start": 283
        },
        "spanText": "validate",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "state.default-resources",
          "missingInputs": [
            "state.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 343,
          "start": 338
        },
        "spanText": "state",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0101",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-binding-behavior-framework-error",
          "frameworkErrorCode": "AUR0101",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-binding-behavior:AUR0101",
          "missingInputs": [
            "runtime-binding-behavior:AUR0101"
          ],
          "phase": "bind",
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-resource",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "resource-registration",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 343,
          "start": 338
        },
        "spanText": "state",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "router.default-resources",
          "missingInputs": [
            "router.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 65,
          "start": 38
        },
        "spanText": "<au-viewport></au-viewport>",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "ui-virtualization.default-resources",
          "missingInputs": [
            "ui-virtualization.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 112,
          "start": 78
        },
        "spanText": "virtual-repeat.for=\"item of items\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "framework-capability-not-registered",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "framework-capability-not-registered",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "router.default-resources",
          "missingInputs": [
            "router.default-resources"
          ],
          "phase": null,
          "relatedInformation": [],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "register-framework-capability",
            "actionability": "guided",
            "changeDomain": "app-source",
            "planKind": "framework-capability-registration",
            "readiness": "source-edit-policy-open",
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
        "file": "src/unregistered-plugin-resources-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "framework-capability-not-registered",
            "kind": "framework-capability-not-registered",
            "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
          }
        ],
        "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 21,
          "start": 8
        },
        "spanText": "load=\"orders\"",
        "status": "canonical",
        "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 11,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "router.default-resources",
            "missingInputs": [
              "router.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"load\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 21,
            "start": 8
          },
          "spanText": "load=\"orders\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "router.default-resources",
            "missingInputs": [
              "router.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Element \"au-viewport\" uses Aurelia router default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 65,
            "start": 38
          },
          "spanText": "<au-viewport></au-viewport>",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "ui-virtualization.default-resources",
            "missingInputs": [
              "ui-virtualization.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"virtual-repeat.for\" uses Aurelia UI virtualization default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 112,
            "start": 78
          },
          "spanText": "virtual-repeat.for=\"item of items\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "validation-html.default-resources",
            "missingInputs": [
              "validation-html.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Element \"validation-container\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 225,
            "start": 133
          },
          "spanText": "<validation-container>\n  <div validation-errors.bind=\"errors\"></div>\n</validation-container>",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "validation-html.default-resources",
            "missingInputs": [
              "validation-html.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Attribute \"validation-errors.bind\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 194,
            "start": 163
          },
          "spanText": "validation-errors.bind=\"errors\"",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "i18n.default-resources",
            "missingInputs": [
              "i18n.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Value converter \"t\" uses Aurelia i18n default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 244,
            "start": 243
          },
          "spanText": "t",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0103",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-value-converter-framework-error",
            "frameworkErrorCode": "AUR0103",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-value-converter:AUR0103",
            "missingInputs": [
              "runtime-value-converter:AUR0103"
            ],
            "phase": "bind",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-resource",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "resource-registration",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0103",
              "kind": "runtime-value-converter-framework-error",
              "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 't' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 244,
            "start": 243
          },
          "spanText": "t",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "validation-html.default-resources",
            "missingInputs": [
              "validation-html.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Binding behavior \"validate\" uses Aurelia validation-html default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 291,
            "start": 283
          },
          "spanText": "validate",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0101",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0101",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0101",
            "missingInputs": [
              "runtime-binding-behavior:AUR0101"
            ],
            "phase": "bind",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-resource",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "resource-registration",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'validate' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 291,
            "start": 283
          },
          "spanText": "validate",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "framework-capability-not-registered",
          "data": {
            "diagnosticAuthority": "semantic-authoring-policy",
            "diagnosticDomain": "template",
            "diagnosticKind": "framework-capability-not-registered",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": "state.default-resources",
            "missingInputs": [
              "state.default-resources"
            ],
            "phase": null,
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-framework-capability",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "framework-capability-registration",
              "readiness": "source-edit-policy-open",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "framework-capability-not-registered",
              "kind": "framework-capability-not-registered",
              "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world."
            }
          ],
          "message": "Binding behavior \"state\" uses Aurelia state default resources, but that framework capability is not registered in this app world.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 343,
            "start": 338
          },
          "spanText": "state",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0101",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-binding-behavior-framework-error",
            "frameworkErrorCode": "AUR0101",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-binding-behavior:AUR0101",
            "missingInputs": [
              "runtime-binding-behavior:AUR0101"
            ],
            "phase": "bind",
            "relatedInformation": [],
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "register-resource",
              "actionability": "guided",
              "changeDomain": "app-source",
              "planKind": "resource-registration",
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
          "file": "src/unregistered-plugin-resources-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'state' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 343,
            "start": 338
          },
          "spanText": "state",
          "status": "primary",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 11,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 11,
  "suppressedCount": 0
}
```
