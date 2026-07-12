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

### publishDiagnostics

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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "declare-missing-member",
          "actionability": "guided",
          "applicationKind": "none",
          "changeDomain": "app-source",
          "editPlanState": "not-available",
          "planKind": "source-member-declaration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "inspect-type-surface",
          "actionability": "manual",
          "applicationKind": "none",
          "changeDomain": "inspection",
          "editPlanState": "not-available",
          "planKind": "manual-inspection",
          "readiness": "inspection-required",
          "targetSourceCoverage": "all"
        },
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
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
        "groupKey": "checker-agreement:missing-member:template-member-access:src/template-overlay-type-errors-app.html:62:79:diagnostic:7:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/template-overlay-type-errors-app.html:67:79:expression-member:selected-member-missing",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "declare-missing-member",
                "actionability": "guided",
                "applicationKind": "none",
                "changeDomain": "app-source",
                "editPlanState": "not-available",
                "planKind": "source-member-declaration",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "missing-expression-member",
                "kind": "missing-expression-member",
                "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
              }
            ],
            "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 79,
              "start": 67
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/template-overlay-type-errors-app.html:67:79:expression-member:selected-member-missing"
        },
        "primarySeverity": "warning",
        "rawRowCount": 2,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "template-syntax",
              "code": "TS2339",
              "data": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "template",
                "diagnosticKind": "template-expression-typescript-diagnostic",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "typescript:TS2339",
                "missingInputs": [
                  "typescript:TS2339"
                ],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "applicationKind": "none",
                  "changeDomain": "inspection",
                  "editPlanState": "not-available",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
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
                "taxonomy": {
                  "actionability": null,
                  "category": null,
                  "confidence": null,
                  "impact": null,
                  "schema": null
                }
              },
              "file": "src/template-overlay-type-errors-app.html",
              "impact": "blocking",
              "issues": [
                {
                  "code": "TS2339",
                  "kind": "template-expression-typescript-diagnostic",
                  "message": "TS2339: Property 'missingLabel' does not exist on type 'OverlayItem'."
                }
              ],
              "message": "TS2339: Property 'missingLabel' does not exist on type 'OverlayItem'.",
              "related": [],
              "severity": "error",
              "source": "semantic-runtime:template",
              "span": {
                "end": 79,
                "start": 67
              },
              "spanText": "missingLabel",
              "status": "contextual",
              "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
            },
            "relation": "checker-evidence",
            "role": "contextual",
            "rowId": "diagnostic:8:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:67:79:typescript:TS2339"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 79,
            "start": 62
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      },
      {
        "groupKey": "template-member-access:src/template-overlay-type-errors-app.html:149:166",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS18046",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS18046: 'unknownItem' is of type 'unknown'."
              }
            ],
            "message": "TS18046: 'unknownItem' is of type 'unknown'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 160,
              "start": 149
            },
            "spanText": "unknownItem",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:149:160:typescript:TS18046"
        },
        "primarySeverity": "error",
        "rawRowCount": 2,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "template-syntax",
              "code": "weak-expression-member-owner",
              "data": {
                "diagnosticAuthority": "semantic-authoring-policy",
                "diagnosticDomain": "template",
                "diagnosticKind": "weak-expression-member-owner",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "expression-member-owner-type:no-members",
                "missingInputs": [
                  "expression-member-owner-type:no-members"
                ],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "applicationKind": "none",
                  "changeDomain": "inspection",
                  "editPlanState": "not-available",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
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
                "taxonomy": {
                  "actionability": null,
                  "category": null,
                  "confidence": null,
                  "impact": null,
                  "schema": null
                }
              },
              "file": "src/template-overlay-type-errors-app.html",
              "impact": "informational",
              "issues": [
                {
                  "code": "weak-expression-member-owner",
                  "kind": "weak-expression-member-owner",
                  "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated."
                }
              ],
              "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
              "related": [],
              "severity": "info",
              "source": "semantic-runtime:template",
              "span": {
                "end": 166,
                "start": 161
              },
              "spanText": "label",
              "status": "contextual",
              "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
            },
            "relation": "semantic-explanation",
            "role": "contextual",
            "rowId": "diagnostic:1:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/template-overlay-type-errors-app.html:161:166:expression-member-owner-type:no-members"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 166,
            "start": 149
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      },
      {
        "groupKey": "checker-agreement:missing-member:template-member-access:src/template-overlay-type-errors-app.html:228:254:diagnostic:2:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/template-overlay-type-errors-app.html:241:254:expression-member:selected-member-missing",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "declare-missing-member",
                "actionability": "guided",
                "applicationKind": "none",
                "changeDomain": "app-source",
                "editPlanState": "not-available",
                "planKind": "source-member-declaration",
                "readiness": "ready-to-plan",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "missing-expression-member",
                "kind": "missing-expression-member",
                "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
              }
            ],
            "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 254,
              "start": 241
            },
            "spanText": "missingStatus",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/template-overlay-type-errors-app.html:241:254:expression-member:selected-member-missing"
        },
        "primarySeverity": "warning",
        "rawRowCount": 2,
        "related": [
          {
            "diagnostic": {
              "actionability": "manual",
              "anomaly": null,
              "category": "template-syntax",
              "code": "TS2339",
              "data": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "template",
                "diagnosticKind": "template-expression-typescript-diagnostic",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": "typescript:TS2339",
                "missingInputs": [
                  "typescript:TS2339"
                ],
                "relatedQueryKind": "template-diagnostics",
                "repairAffordance": {
                  "actionKind": "inspect-type-surface",
                  "actionability": "manual",
                  "applicationKind": "none",
                  "changeDomain": "inspection",
                  "editPlanState": "not-available",
                  "planKind": "manual-inspection",
                  "readiness": "inspection-required",
                  "targetSourceCoverage": "all"
                },
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
                "taxonomy": {
                  "actionability": null,
                  "category": null,
                  "confidence": null,
                  "impact": null,
                  "schema": null
                }
              },
              "file": "src/template-overlay-type-errors-app.html",
              "impact": "blocking",
              "issues": [
                {
                  "code": "TS2339",
                  "kind": "template-expression-typescript-diagnostic",
                  "message": "TS2339: Property 'missingStatus' does not exist on type 'OverlayItem'."
                }
              ],
              "message": "TS2339: Property 'missingStatus' does not exist on type 'OverlayItem'.",
              "related": [],
              "severity": "error",
              "source": "semantic-runtime:template",
              "span": {
                "end": 254,
                "start": 241
              },
              "spanText": "missingStatus",
              "status": "contextual",
              "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
            },
            "relation": "checker-evidence",
            "role": "contextual",
            "rowId": "diagnostic:3:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:241:254:typescript:TS2339"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 254,
            "start": 228
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:4:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:277:286:typescript:TS18047",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS18047",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS18047: 'maybeItem' is possibly 'null'."
              }
            ],
            "message": "TS18047: 'maybeItem' is possibly 'null'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 286,
              "start": 277
            },
            "spanText": "maybeItem",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:277:286:typescript:TS18047"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 292,
            "start": 277
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:5:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:431:444:typescript:TS2345",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'."
              }
            ],
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 444,
              "start": 431
            },
            "spanText": "'not-an-item'",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:431:444:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 444,
            "start": 431
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      },
      {
        "groupKey": "row:diagnostic:6:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:540:552:typescript:TS2554",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "repairAffordance": {
                "actionKind": "inspect-type-surface",
                "actionability": "manual",
                "applicationKind": "none",
                "changeDomain": "inspection",
                "editPlanState": "not-available",
                "planKind": "manual-inspection",
                "readiness": "inspection-required",
                "targetSourceCoverage": "all"
              },
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/template-overlay-type-errors-app.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2554",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2554: Expected 1 arguments, but got 2."
              }
            ],
            "message": "TS2554: Expected 1 arguments, but got 2.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 552,
              "start": 540
            },
            "spanText": "selectedItem",
            "status": "primary",
            "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/template-overlay-type-errors-app.html:540:552:typescript:TS2554"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 552,
            "start": 540
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      }
    ],
    "primaryCount": 6,
    "rawRowCount": 9
  },
  "raw": {
    "diagnosticCount": 9,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS18046",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS18046: 'unknownItem' is of type 'unknown'."
          }
        ],
        "message": "TS18046: 'unknownItem' is of type 'unknown'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 160,
          "start": 149
        },
        "spanText": "unknownItem",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "weak-expression-member-owner",
        "data": {
          "diagnosticAuthority": "semantic-authoring-policy",
          "diagnosticDomain": "template",
          "diagnosticKind": "weak-expression-member-owner",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "expression-member-owner-type:no-members",
          "missingInputs": [
            "expression-member-owner-type:no-members"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "informational",
        "issues": [
          {
            "code": "weak-expression-member-owner",
            "kind": "weak-expression-member-owner",
            "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated."
          }
        ],
        "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
        "related": [],
        "severity": "info",
        "source": "semantic-runtime:template",
        "span": {
          "end": 166,
          "start": 161
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "applicationKind": "none",
            "changeDomain": "app-source",
            "editPlanState": "not-available",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "missing-expression-member",
            "kind": "missing-expression-member",
            "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
          }
        ],
        "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 254,
          "start": 241
        },
        "spanText": "missingStatus",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "TS2339",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-expression-typescript-diagnostic",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "typescript:TS2339",
          "missingInputs": [
            "typescript:TS2339"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'missingStatus' does not exist on type 'OverlayItem'."
          }
        ],
        "message": "TS2339: Property 'missingStatus' does not exist on type 'OverlayItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 254,
          "start": 241
        },
        "spanText": "missingStatus",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS18047",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS18047: 'maybeItem' is possibly 'null'."
          }
        ],
        "message": "TS18047: 'maybeItem' is possibly 'null'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 286,
          "start": 277
        },
        "spanText": "maybeItem",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'."
          }
        ],
        "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 444,
          "start": 431
        },
        "spanText": "'not-an-item'",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2554",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2554: Expected 1 arguments, but got 2."
          }
        ],
        "message": "TS2554: Expected 1 arguments, but got 2.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 552,
          "start": 540
        },
        "spanText": "selectedItem",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "declare-missing-member",
            "actionability": "guided",
            "applicationKind": "none",
            "changeDomain": "app-source",
            "editPlanState": "not-available",
            "planKind": "source-member-declaration",
            "readiness": "ready-to-plan",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "missing-expression-member",
            "kind": "missing-expression-member",
            "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
          }
        ],
        "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 79,
          "start": 67
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
        "code": "TS2339",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "template",
          "diagnosticKind": "template-expression-typescript-diagnostic",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": "typescript:TS2339",
          "missingInputs": [
            "typescript:TS2339"
          ],
          "relatedQueryKind": "template-diagnostics",
          "repairAffordance": {
            "actionKind": "inspect-type-surface",
            "actionability": "manual",
            "applicationKind": "none",
            "changeDomain": "inspection",
            "editPlanState": "not-available",
            "planKind": "manual-inspection",
            "readiness": "inspection-required",
            "targetSourceCoverage": "all"
          },
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/template-overlay-type-errors-app.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'missingLabel' does not exist on type 'OverlayItem'."
          }
        ],
        "message": "TS2339: Property 'missingLabel' does not exist on type 'OverlayItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 79,
          "start": 67
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 6,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "declare-missing-member",
              "actionability": "guided",
              "applicationKind": "none",
              "changeDomain": "app-source",
              "editPlanState": "not-available",
              "planKind": "source-member-declaration",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "missing-expression-member",
              "kind": "missing-expression-member",
              "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
            }
          ],
          "message": "Member \"missingLabel\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 79,
            "start": 67
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS18046",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS18046: 'unknownItem' is of type 'unknown'."
            }
          ],
          "message": "TS18046: 'unknownItem' is of type 'unknown'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 160,
            "start": 149
          },
          "spanText": "unknownItem",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "declare-missing-member",
              "actionability": "guided",
              "applicationKind": "none",
              "changeDomain": "app-source",
              "editPlanState": "not-available",
              "planKind": "source-member-declaration",
              "readiness": "ready-to-plan",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "missing-expression-member",
              "kind": "missing-expression-member",
              "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it."
            }
          ],
          "message": "Member \"missingStatus\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 254,
            "start": 241
          },
          "spanText": "missingStatus",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS18047",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS18047: 'maybeItem' is possibly 'null'."
            }
          ],
          "message": "TS18047: 'maybeItem' is possibly 'null'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 286,
            "start": 277
          },
          "spanText": "maybeItem",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'."
            }
          ],
          "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'OverlayItem'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 444,
            "start": 431
          },
          "spanText": "'not-an-item'",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "repairAffordance": {
              "actionKind": "inspect-type-surface",
              "actionability": "manual",
              "applicationKind": "none",
              "changeDomain": "inspection",
              "editPlanState": "not-available",
              "planKind": "manual-inspection",
              "readiness": "inspection-required",
              "targetSourceCoverage": "all"
            },
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/template-overlay-type-errors-app.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2554",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2554: Expected 1 arguments, but got 2."
            }
          ],
          "message": "TS2554: Expected 1 arguments, but got 2.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 552,
            "start": 540
          },
          "spanText": "selectedItem",
          "status": "primary",
          "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-overlay-type-errors/src/template-overlay-type-errors-app.html"
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
