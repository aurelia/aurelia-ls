# template-overlay-type-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors`
Probe file: `packages/lane-harness/probes/template-overlay-type-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-type-errors-template

### Probe

```json
{
  "file": "src/template-overlay-type-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 6,
  "diagnostics": [
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
                    "end": 79,
                    "kind": "source-span-address",
                    "label": "src/template-overlay-type-errors-app.html@62..79",
                    "path": "src/template-overlay-type-errors-app.html",
                    "role": "template-member-access",
                    "start": 62
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
            "end": 79,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@62..79",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "template-member-access",
            "start": 62
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
      "range": {
        "end": {
          "character": 25,
          "line": 3
        },
        "start": {
          "character": 13,
          "line": 3
        }
      },
      "rangeText": "missingLabel",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/template-overlay-type-errors-app.html",
          "message": "TS2339: Property 'missingLabel' does not exist on type 'OverlayItem'.",
          "range": {
            "end": {
              "character": 25,
              "line": 3
            },
            "start": {
              "character": 13,
              "line": 3
            }
          },
          "rangeText": "missingLabel",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS18046",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS18046",
        "missingInputs": [
          "typescript:TS18046"
        ],
        "phase": "semantic",
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "semantic-authoring-policy",
                "diagnosticDomain": "template",
                "diagnosticKind": "weak-expression-member-owner",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "expression-member-owner-type:no-members",
                "missingInputs": [
                  "expression-member-owner-type:no-members"
                ],
                "phase": null,
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
                "severity": "information",
                "sourceRole": "template",
                "subject": {
                  "source": {
                    "end": 166,
                    "kind": "source-span-address",
                    "label": "src/template-overlay-type-errors-app.html@149..166",
                    "path": "src/template-overlay-type-errors-app.html",
                    "role": "template-member-access",
                    "start": 149
                  },
                  "span": null,
                  "subjectKind": "template-member-access",
                  "uri": null
                },
                "typeScriptDiagnosticCode": null
              },
              "relation": "semantic-explanation"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 2
        },
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
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 166,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@149..166",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "template-member-access",
            "start": 149
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": 18046
      },
      "message": "TS18046: 'unknownItem' is of type 'unknown'.",
      "range": {
        "end": {
          "character": 19,
          "line": 6
        },
        "start": {
          "character": 8,
          "line": 6
        }
      },
      "rangeText": "unknownItem",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/template-overlay-type-errors-app.html",
          "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
          "range": {
            "end": {
              "character": 25,
              "line": 6
            },
            "start": {
              "character": 20,
              "line": 6
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      ],
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
                    "end": 254,
                    "kind": "source-span-address",
                    "label": "src/template-overlay-type-errors-app.html@228..254",
                    "path": "src/template-overlay-type-errors-app.html",
                    "role": "template-member-access",
                    "start": 228
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
            "end": 254,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@228..254",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "template-member-access",
            "start": 228
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
      "range": {
        "end": {
          "character": 32,
          "line": 11
        },
        "start": {
          "character": 19,
          "line": 11
        }
      },
      "rangeText": "missingStatus",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/template-overlay-type-errors-app.html",
          "message": "TS2339: Property 'missingStatus' does not exist on type 'OverlayItem'.",
          "range": {
            "end": {
              "character": 32,
              "line": 11
            },
            "start": {
              "character": 19,
              "line": 11
            }
          },
          "rangeText": "missingStatus",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS18047",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS18047",
        "missingInputs": [
          "typescript:TS18047"
        ],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 292,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@277..292",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "template-member-access",
            "start": 277
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": 18047
      },
      "message": "TS18047: 'maybeItem' is possibly 'null'.",
      "range": {
        "end": {
          "character": 16,
          "line": 14
        },
        "start": {
          "character": 7,
          "line": 14
        }
      },
      "rangeText": "maybeItem",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2345",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2345",
        "missingInputs": [
          "typescript:TS2345"
        ],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 444,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@431..444",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "typescript-overlay:semantic",
            "start": 431
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'.",
      "range": {
        "end": {
          "character": 59,
          "line": 20
        },
        "start": {
          "character": 46,
          "line": 20
        }
      },
      "rangeText": "'not-an-item'",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2554",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2554",
        "missingInputs": [
          "typescript:TS2554"
        ],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 552,
            "kind": "source-span-address",
            "label": "src/template-overlay-type-errors-app.html@540..552",
            "path": "src/template-overlay-type-errors-app.html",
            "role": "typescript-overlay:semantic",
            "start": 540
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2554
      },
      "message": "TS2554: Expected 1 arguments, but got 2.",
      "range": {
        "end": {
          "character": 72,
          "line": 24
        },
        "start": {
          "character": 60,
          "line": 24
        }
      },
      "rangeText": "selectedItem",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
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
  "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
}
```
