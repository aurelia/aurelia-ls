# template-typechecking-corpus diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus`
Probe file: `packages/lane-harness/probes/template-typechecking-corpus.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## typechecking-read-expressions

### Probe

```json
{
  "file": "src/read-expressions.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 13,
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
                    "end": 118,
                    "kind": "source-span-address",
                    "label": "src/read-expressions.html@93..118",
                    "path": "src/read-expressions.html",
                    "role": "template-member-access",
                    "start": 93
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
            "end": 118,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@93..118",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 93
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
          "character": 55,
          "line": 2
        },
        "start": {
          "character": 43,
          "line": 2
        }
      },
      "rangeText": "missingLabel",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/read-expressions.html",
          "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
          "range": {
            "end": {
              "character": 55,
              "line": 2
            },
            "start": {
              "character": 43,
              "line": 2
            }
          },
          "rangeText": "missingLabel",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "end": 222,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@207..222",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 207
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
          "character": 40,
          "line": 4
        },
        "start": {
          "character": 31,
          "line": 4
        }
      },
      "rangeText": "maybeItem",
      "relatedInformation": [],
      "severity": "error",
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
                    "end": 277,
                    "kind": "source-span-address",
                    "label": "src/read-expressions.html@259..277",
                    "path": "src/read-expressions.html",
                    "role": "template-member-access",
                    "start": 259
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
            "end": 277,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@259..277",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 259
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": 18046
      },
      "message": "TS18046: 'unknownValue' is of type 'unknown'.",
      "range": {
        "end": {
          "character": 43,
          "line": 5
        },
        "start": {
          "character": 31,
          "line": 5
        }
      },
      "rangeText": "unknownValue",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/read-expressions.html",
          "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
          "range": {
            "end": {
              "character": 49,
              "line": 5
            },
            "start": {
              "character": 44,
              "line": 5
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      ],
      "severity": "error",
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
                    "end": 331,
                    "kind": "source-span-address",
                    "label": "src/read-expressions.html@313..331",
                    "path": "src/read-expressions.html",
                    "role": "template-member-access",
                    "start": 313
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
            "end": 331,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@313..331",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 313
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": 18046
      },
      "message": "TS18046: 'unknownValue' is of type 'unknown'.",
      "range": {
        "end": {
          "character": 42,
          "line": 6
        },
        "start": {
          "character": 30,
          "line": 6
        }
      },
      "rangeText": "unknownValue",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/read-expressions.html",
          "message": "The owner type has no projected members at this cursor, so the selected member cannot be validated or navigated.",
          "range": {
            "end": {
              "character": 48,
              "line": 6
            },
            "start": {
              "character": 43,
              "line": 6
            }
          },
          "rangeText": "label",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      ],
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
            "end": 800,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@787..800",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 787
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
      "range": {
        "end": {
          "character": 61,
          "line": 16
        },
        "start": {
          "character": 48,
          "line": 16
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
            "end": 878,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@866..878",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 866
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
          "character": 71,
          "line": 17
        },
        "start": {
          "character": 59,
          "line": 17
        }
      },
      "rangeText": "definiteItem",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2769",
        "missingInputs": [
          "typescript:TS2769"
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
            "end": 1044,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1040..1044",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 1040
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2769
      },
      "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'.",
      "range": {
        "end": {
          "character": 45,
          "line": 20
        },
        "start": {
          "character": 41,
          "line": 20
        }
      },
      "rangeText": "true",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2349",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2349",
        "missingInputs": [
          "typescript:TS2349"
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
            "end": 1098,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1087..1098",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 1087
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2349
      },
      "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures.",
      "range": {
        "end": {
          "character": 47,
          "line": 21
        },
        "start": {
          "character": 36,
          "line": 21
        }
      },
      "rangeText": "notCallable",
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
                    "end": 1292,
                    "kind": "source-span-address",
                    "label": "src/read-expressions.html@1251..1292",
                    "path": "src/read-expressions.html",
                    "role": "template-member-call",
                    "start": 1251
                  },
                  "span": null,
                  "subjectKind": "template-member-call",
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
            "end": 1286,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1269..1286",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 1269
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
          "character": 74,
          "line": 24
        },
        "start": {
          "character": 62,
          "line": 24
        }
      },
      "rangeText": "missingLabel",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/read-expressions.html",
          "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
          "range": {
            "end": {
              "character": 74,
              "line": 24
            },
            "start": {
              "character": 62,
              "line": 24
            }
          },
          "rangeText": "missingLabel",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "non-trackable-template-method-call",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "observation",
        "diagnosticKind": "non-trackable-template-method-call",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "binding-observation",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [
          {
            "message": "Method 'acceptPredicate' is declared here.",
            "relationKind": "subject-declaration",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/read-expressions.ts",
                "path": "src/read-expressions.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
              },
              "end": 925,
              "kind": "source-span-address",
              "label": "src/read-expressions.ts@910..925",
              "path": "src/read-expressions.ts",
              "role": "name",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
              "start": 910
            }
          },
          {
            "message": "Method-body read 'this.items' is not observed through the template call.",
            "relationKind": "hidden-state-read",
            "source": {
              "anchor": {
                "kind": "source-file-address",
                "label": "src/read-expressions.ts",
                "path": "src/read-expressions.ts",
                "sourceFileRole": "app-source",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
              },
              "end": 1000,
              "kind": "source-span-address",
              "label": "src/read-expressions.ts@990..1000",
              "path": "src/read-expressions.ts",
              "role": "range",
              "sourceFileRole": "app-source",
              "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
              "start": 990
            }
          }
        ],
        "relatedQueryKind": "observation-issues",
        "repairAffordance": {
          "actionKind": "configure-observer",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "observation-configuration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 1358,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1343..1358",
            "path": "src/read-expressions.html",
            "role": "name",
            "start": 1343
          },
          "span": null,
          "subjectKind": "observation-member",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.",
      "range": {
        "end": {
          "character": 54,
          "line": 25
        },
        "start": {
          "character": 39,
          "line": 25
        }
      },
      "rangeText": "acceptPredicate",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/read-expressions.ts",
          "message": "Method 'acceptPredicate' is declared here.",
          "range": {
            "end": {
              "character": 17,
              "line": 26
            },
            "start": {
              "character": 2,
              "line": 26
            }
          },
          "rangeText": "acceptPredicate",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
        },
        {
          "anomaly": null,
          "file": "src/read-expressions.ts",
          "message": "Method-body read 'this.items' is not observed through the template call.",
          "range": {
            "end": {
              "character": 21,
              "line": 27
            },
            "start": {
              "character": 11,
              "line": 27
            }
          },
          "rangeText": "this.items",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
        }
      ],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2322",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2322",
        "missingInputs": [
          "typescript:TS2322"
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
            "end": 1377,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1367..1377",
            "path": "src/read-expressions.html",
            "role": "template-member-access",
            "start": 1367
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2322
      },
      "message": "TS2322: Type 'string' is not assignable to type 'boolean'.",
      "range": {
        "end": {
          "character": 73,
          "line": 25
        },
        "start": {
          "character": 63,
          "line": 25
        }
      },
      "rangeText": "item.label",
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
            "end": 1502,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1500..1502",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 1500
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
      "range": {
        "end": {
          "character": 52,
          "line": 28
        },
        "start": {
          "character": 50,
          "line": 28
        }
      },
      "rangeText": "42",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2322",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-expression-typescript-diagnostic",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "typescript:TS2322",
        "missingInputs": [
          "typescript:TS2322"
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
            "end": 1828,
            "kind": "source-span-address",
            "label": "src/read-expressions.html@1823..1828",
            "path": "src/read-expressions.html",
            "role": "typescript-overlay:semantic",
            "start": 1823
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2322
      },
      "message": "TS2322: Type 'string' is not assignable to type 'number'.",
      "range": {
        "end": {
          "character": 83,
          "line": 32
        },
        "start": {
          "character": 78,
          "line": 32
        }
      },
      "rangeText": "count",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
  "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
}
```

## typechecking-write-bindings

### Probe

```json
{
  "file": "src/write-bindings.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 10,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:source-member-readonly",
        "missingInputs": [
          "binding-source-assignment:source-member-readonly",
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "make-source-writable",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-writeability-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 228,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@216..228",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 216
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 76,
          "line": 3
        },
        "start": {
          "character": 64,
          "line": 3
        }
      },
      "rangeText": "readonlyText",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-runtime-noop",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-runtime-noop",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:source-member-getter-without-setter",
        "missingInputs": [
          "binding-source-assignment:source-member-getter-without-setter"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
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
            "end": 311,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@297..311",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 297
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Source member 'getterOnlyText' is a getter without a setter at runtime.",
      "range": {
        "end": {
          "character": 80,
          "line": 4
        },
        "start": {
          "character": 66,
          "line": 4
        }
      },
      "rangeText": "getterOnlyText",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
        "missingInputs": [
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "align-assignment-type",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-assignment-type-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 458,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@453..458",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 453
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 67,
          "line": 6
        },
        "start": {
          "character": 62,
          "line": 6
        }
      },
      "rangeText": "count",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
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
            "end": 458,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@453..458",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 453
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type number is not assignable to target 'value' of type string.",
      "range": {
        "end": {
          "character": 67,
          "line": 6
        },
        "start": {
          "character": 62,
          "line": 6
        }
      },
      "rangeText": "count",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:source-member-readonly",
        "missingInputs": [
          "binding-source-assignment:source-member-readonly"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "make-source-writable",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-writeability-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 644,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@619..644",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 619
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.",
      "range": {
        "end": {
          "character": 96,
          "line": 8
        },
        "start": {
          "character": 71,
          "line": 8
        }
      },
      "rangeText": "readonlyRecord[activeKey]",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:source-member-readonly",
        "missingInputs": [
          "binding-source-assignment:source-member-readonly",
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "make-source-writable",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-writeability-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 891,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@879..891",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 879
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 75,
          "line": 12
        },
        "start": {
          "character": 63,
          "line": 12
        }
      },
      "rangeText": "readonlyText",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:target-to-source-type-mismatch",
        "missingInputs": [
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "align-assignment-type",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-assignment-type-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 1054,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@1049..1054",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 1049
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 73,
          "line": 15
        },
        "start": {
          "character": 68,
          "line": 15
        }
      },
      "rangeText": "count",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
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
            "end": 1278,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@1273..1278",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 1273
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
      "range": {
        "end": {
          "character": 69,
          "line": 18
        },
        "start": {
          "character": 64,
          "line": 18
        }
      },
      "rangeText": "count",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-target-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-target-assignment:source-nullish-to-required-target",
        "missingInputs": [
          "binding-target-assignment:source-nullish-to-required-target"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
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
            "end": 1372,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@1360..1372",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 1360
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string.",
      "range": {
        "end": {
          "character": 77,
          "line": 19
        },
        "start": {
          "character": 65,
          "line": 19
        }
      },
      "rangeText": "nullableText",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-source-assignment-strictness",
      "data": {
        "diagnosticAuthority": "semantic-runtime-product",
        "diagnosticDomain": "template",
        "diagnosticKind": "binding-source-assignment-strictness",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "binding-source-assignment:source-member-readonly",
        "missingInputs": [
          "binding-source-assignment:source-member-readonly",
          "binding-source-assignment:target-to-source-type-mismatch"
        ],
        "phase": null,
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "make-source-writable",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "source-writeability-alignment",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 1465,
            "kind": "source-span-address",
            "label": "src/write-bindings.html@1453..1465",
            "path": "src/write-bindings.html",
            "role": "binding-source-assignment",
            "start": 1453
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
      "range": {
        "end": {
          "character": 76,
          "line": 20
        },
        "start": {
          "character": 64,
          "line": 20
        }
      },
      "rangeText": "readonlyText",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
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
  "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
}
```

## typechecking-resource-boundaries

### Probe

```json
{
  "file": "src/resource-boundaries.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 7,
  "diagnostics": [
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
            "end": 116,
            "kind": "source-span-address",
            "label": "src/resource-boundaries.html@110..116",
            "path": "src/resource-boundaries.html",
            "role": "typescript-overlay:semantic",
            "start": 110
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
      "range": {
        "end": {
          "character": 45,
          "line": 2
        },
        "start": {
          "character": 39,
          "line": 2
        }
      },
      "rangeText": "prefix",
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
            "end": 205,
            "kind": "source-span-address",
            "label": "src/resource-boundaries.html@200..205",
            "path": "src/resource-boundaries.html",
            "role": "typescript-overlay:semantic",
            "start": 200
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
      "range": {
        "end": {
          "character": 64,
          "line": 3
        },
        "start": {
          "character": 59,
          "line": 3
        }
      },
      "rangeText": "count",
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "Value converter 'absentConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 69,
          "line": 8
        },
        "start": {
          "character": 54,
          "line": 8
        }
      },
      "rangeText": "absentConverter",
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
                    "end": 645,
                    "kind": "source-span-address",
                    "label": "src/resource-boundaries.html@628..645",
                    "path": "src/resource-boundaries.html",
                    "role": "template-member-access",
                    "start": 628
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
            "end": 645,
            "kind": "source-span-address",
            "label": "src/resource-boundaries.html@628..645",
            "path": "src/resource-boundaries.html",
            "role": "template-member-access",
            "start": 628
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
          "character": 61,
          "line": 11
        },
        "start": {
          "character": 49,
          "line": 11
        }
      },
      "rangeText": "missingLabel",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/resource-boundaries.html",
          "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
          "range": {
            "end": {
              "character": 61,
              "line": 11
            },
            "start": {
              "character": 49,
              "line": 11
            }
          },
          "rangeText": "missingLabel",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      ],
      "severity": "warning",
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
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
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 73,
          "line": 12
        },
        "start": {
          "character": 59,
          "line": 12
        }
      },
      "rangeText": "absentBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0102",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-binding-behavior-framework-error",
        "frameworkErrorCode": "AUR0102",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-binding-behavior:AUR0102",
        "missingInputs": [
          "runtime-binding-behavior:AUR0102"
        ],
        "phase": "bind",
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
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding behavior 'auditValue' is already applied to this binding.",
      "range": {
        "end": {
          "character": 65,
          "line": 13
        },
        "start": {
          "character": 55,
          "line": 13
        }
      },
      "rangeText": "auditValue",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "binding-target-assignment-strictness",
      "data": {
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
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "warning",
          "primarySeverity": "warning",
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
            "end": 1019,
            "kind": "source-span-address",
            "label": "src/resource-boundaries.html@1009..1019",
            "path": "src/resource-boundaries.html",
            "role": "template-member-access",
            "start": 1009
          },
          "span": null,
          "subjectKind": "template-member-access",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
      "range": {
        "end": {
          "character": 76,
          "line": 16
        },
        "start": {
          "character": 66,
          "line": 16
        }
      },
      "rangeText": "item.score",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
  "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
}
```
