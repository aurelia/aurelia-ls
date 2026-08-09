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

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 8,
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
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
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
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
                "severity": "error",
                "sourceRole": "template",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "derived-consequence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 2
        },
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
        "typeScriptDiagnosticCode": null
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
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/unregistered-plugin-resources-app.html",
          "message": "Value converter 't' was not resolved through the current compiler resource scope.",
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
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        }
      ],
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
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
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
                "severity": "error",
                "sourceRole": "template",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "derived-consequence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 2
        },
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
        "typeScriptDiagnosticCode": null
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
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/unregistered-plugin-resources-app.html",
          "message": "Binding behavior 'validate' was not resolved through the current compiler resource scope.",
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
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        }
      ],
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
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "semantic-runtime-product",
                "diagnosticDomain": "template",
                "diagnosticKind": "binding-target-assignment-strictness",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "binding-target-assignment:source-to-target-type-mismatch",
                "missingInputs": [
                  "binding-target-assignment:source-to-target-type-mismatch"
                ],
                "phase": null,
                "relatedInformation": [],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "rewrite-expression",
                  "actionability": "guided",
                  "changeDomain": "app-source",
                  "planKind": "template-expression-rewrite",
                  "readiness": "ready-to-plan",
                  "targetSourceCoverage": "all"
                },
                "severity": "warning",
                "sourceRole": "template",
                "subject": {
                  "source": {
                    "end": 335,
                    "kind": "source-span-address",
                    "label": "src/unregistered-plugin-resources-app.html@321..335",
                    "path": "src/unregistered-plugin-resources-app.html",
                    "role": "binding-source-assignment",
                    "start": 321
                  },
                  "span": null,
                  "subjectKind": "template-expression",
                  "uri": null
                },
                "typeScriptDiagnosticCode": null
              },
              "relation": "derived-consequence"
            },
            {
              "diagnostic": {
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
                "severity": "error",
                "sourceRole": "template",
                "subject": null,
                "typeScriptDiagnosticCode": null
              },
              "relation": "derived-consequence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 3
        },
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
        "typeScriptDiagnosticCode": null
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
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/unregistered-plugin-resources-app.html",
          "message": "Binding source type { ready: boolean; } is not assignable to target 'textContent' of type string.",
          "range": {
            "end": {
              "character": 41,
              "line": 13
            },
            "start": {
              "character": 27,
              "line": 13
            }
          },
          "rangeText": "dashboardState",
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        },
        {
          "anomaly": null,
          "file": "src/unregistered-plugin-resources-app.html",
          "message": "Binding behavior 'state' was not resolved through the current compiler resource scope.",
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
          "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
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
  "uri": "fixtures://pressure/unregistered-plugin-resources/src/unregistered-plugin-resources-app.html"
}
```
