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

### publishDiagnostics

```json
{
  "diagnosticCount": 14,
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
          "character": 74,
          "line": 24
        },
        "start": {
          "character": 62,
          "line": 24
        }
      },
      "rangeText": "missingLabel",
      "relatedInformation": [],
      "severity": "warning",
      "source": "aurelia"
    },
    {
      "anomaly": null,
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
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
      "relatedInformation": [],
      "severity": "error",
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
        "taxonomy": {
          "actionability": "guided",
          "category": "expression",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "filePath": "src/read-expressions.html"
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
            "filePath": "src/read-expressions.html"
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
            "filePath": "src/read-expressions.html"
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
                "end": 1044,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1040..1044",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1040
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 118,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@106..118",
                "path": "src/read-expressions.html",
                "role": "name",
                "start": 106
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 118,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@106..118",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 106
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1098,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1087..1098",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1087
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1286,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1274..1286",
                "path": "src/read-expressions.html",
                "role": "name",
                "start": 1274
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1286,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1274..1286",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1274
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1377,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1367..1377",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1367
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1502,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1500..1502",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1500
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1828,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1823..1828",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1823
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 216,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@207..216",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 207
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 271,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@259..271",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 259
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 277,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@272..277",
                "path": "src/read-expressions.html",
                "role": "name",
                "start": 272
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 325,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@313..325",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 313
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 331,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@326..331",
                "path": "src/read-expressions.html",
                "role": "name",
                "start": 326
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 800,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@787..800",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 787
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 878,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@866..878",
                "path": "src/read-expressions.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 866
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
        "rationale": "Inspect template-diagnostics rows referenced by returned diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
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
                  "label": "src/read-expressions.html",
                  "path": "src/read-expressions.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
                },
                "end": 1358,
                "kind": "source-span-address",
                "label": "src/read-expressions.html@1343..1358",
                "path": "src/read-expressions.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 1343
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
        "rationale": "Inspect observation-issues rows referenced by returned diagnostics.",
        "targetQuery": {
          "kind": "observation-issues",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "observation-issues"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 17 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 3,
    "groups": [
      {
        "groupKey": "checker-agreement:missing-member:template-member-access:src/read-expressions.html:93:118:diagnostic:1:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/read-expressions.html:106:118:expression-member:selected-member-missing",
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
              "phase": null,
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
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
              "end": 118,
              "start": 106
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/read-expressions.html:106:118:expression-member:selected-member-missing"
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
                "taxonomy": {
                  "actionability": "manual",
                  "category": "template-syntax",
                  "confidence": null,
                  "impact": "blocking",
                  "schema": "diagnostics-taxonomy/1"
                }
              },
              "file": "src/read-expressions.html",
              "impact": "blocking",
              "issues": [
                {
                  "code": "TS2339",
                  "kind": "template-expression-typescript-diagnostic",
                  "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
                }
              ],
              "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
              "related": [],
              "severity": "error",
              "source": "semantic-runtime:template",
              "span": {
                "end": 118,
                "start": 106
              },
              "spanText": "missingLabel",
              "status": "contextual",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
            },
            "relation": "checker-evidence",
            "role": "contextual",
            "rowId": "diagnostic:2:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:106:118:typescript:TS2339"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 118,
            "start": 93
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:10:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:207:216:typescript:TS18047",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
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
              "phase": "semantic",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
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
              "end": 216,
              "start": 207
            },
            "spanText": "maybeItem",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:10:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:207:216:typescript:TS18047"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 222,
            "start": 207
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "template-member-access:src/read-expressions.html:259:277",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS18046",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS18046: 'unknownValue' is of type 'unknown'."
              }
            ],
            "message": "TS18046: 'unknownValue' is of type 'unknown'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 271,
              "start": 259
            },
            "spanText": "unknownValue",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:11:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:259:271:typescript:TS18046"
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
                "taxonomy": {
                  "actionability": "manual",
                  "category": "template-syntax",
                  "confidence": null,
                  "impact": "informational",
                  "schema": "diagnostics-taxonomy/1"
                }
              },
              "file": "src/read-expressions.html",
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
                "end": 277,
                "start": 272
              },
              "spanText": "label",
              "status": "contextual",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
            },
            "relation": "semantic-explanation",
            "role": "contextual",
            "rowId": "diagnostic:12:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/read-expressions.html:272:277:expression-member-owner-type:no-members"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 277,
            "start": 259
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "template-member-access:src/read-expressions.html:313:331",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS18046",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS18046: 'unknownValue' is of type 'unknown'."
              }
            ],
            "message": "TS18046: 'unknownValue' is of type 'unknown'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 325,
              "start": 313
            },
            "spanText": "unknownValue",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:13:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:313:325:typescript:TS18046"
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
                "taxonomy": {
                  "actionability": "manual",
                  "category": "template-syntax",
                  "confidence": null,
                  "impact": "informational",
                  "schema": "diagnostics-taxonomy/1"
                }
              },
              "file": "src/read-expressions.html",
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
                "end": 331,
                "start": 326
              },
              "spanText": "label",
              "status": "contextual",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
            },
            "relation": "semantic-explanation",
            "role": "contextual",
            "rowId": "diagnostic:14:template:weak-expression-member-owner:semantic-authoring-policy:no-framework-code:src/read-expressions.html:326:331:expression-member-owner-type:no-members"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 331,
            "start": 313
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:15:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:787:800:typescript:TS2345",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
              }
            ],
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 800,
              "start": 787
            },
            "spanText": "'not-an-item'",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:15:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:787:800:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 800,
            "start": 787
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:16:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:866:878:typescript:TS2554",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
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
              "end": 878,
              "start": 866
            },
            "spanText": "definiteItem",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:16:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:866:878:typescript:TS2554"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 878,
            "start": 866
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1040:1044:typescript:TS2769",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'."
              }
            ],
            "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1044,
              "start": 1040
            },
            "spanText": "true",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1040:1044:typescript:TS2769"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1044,
            "start": 1040
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:3:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1087:1098:typescript:TS2349",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2349",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures."
              }
            ],
            "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1098,
              "start": 1087
            },
            "spanText": "notCallable",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1087:1098:typescript:TS2349"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1098,
            "start": 1087
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:4:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/read-expressions.html:1274:1286:expression-member:selected-member-missing",
        "maxRawSeverity": "warning",
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
              "phase": null,
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
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
              "end": 1286,
              "start": 1274
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/read-expressions.html:1274:1286:expression-member:selected-member-missing"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1286,
            "start": 1269
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:5:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1274:1286:typescript:TS2339",
        "maxRawSeverity": "error",
        "primary": {
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2339",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
              }
            ],
            "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1286,
              "start": 1274
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1274:1286:typescript:TS2339"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1292,
            "start": 1251
          },
          "subjectKind": "template-member-call",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:6:observation:non-trackable-template-method-call:semantic-runtime-product:no-framework-code:src/read-expressions.html:1343:1358:no-missing-input",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "expression",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "expression",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "non-trackable-template-method-call",
                "kind": "non-trackable-template-method-call",
                "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads."
              }
            ],
            "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.",
            "related": [
              {
                "anomaly": null,
                "code": null,
                "file": "src/read-expressions.ts",
                "message": "Method 'acceptPredicate' is declared here.",
                "sourceRole": null,
                "span": {
                  "end": 925,
                  "start": 910
                },
                "spanText": "acceptPredicate",
                "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
              },
              {
                "anomaly": null,
                "code": null,
                "file": "src/read-expressions.ts",
                "message": "Method-body read 'this.items' is not observed through the template call.",
                "sourceRole": null,
                "span": {
                  "end": 1000,
                  "start": 990
                },
                "spanText": "this.items",
                "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
              }
            ],
            "severity": "warning",
            "source": "semantic-runtime:observation",
            "span": {
              "end": 1358,
              "start": 1343
            },
            "spanText": "acceptPredicate",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:observation:non-trackable-template-method-call:semantic-runtime-product:no-framework-code:src/read-expressions.html:1343:1358:no-missing-input"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1358,
            "start": 1343
          },
          "subjectKind": "observation-member",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:7:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1367:1377:typescript:TS2322",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2322",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2322: Type 'string' is not assignable to type 'boolean'."
              }
            ],
            "message": "TS2322: Type 'string' is not assignable to type 'boolean'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1377,
              "start": 1367
            },
            "spanText": "item.label",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1367:1377:typescript:TS2322"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1377,
            "start": 1367
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:8:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1500:1502:typescript:TS2345",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
              }
            ],
            "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1502,
              "start": 1500
            },
            "spanText": "42",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1500:1502:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1502,
            "start": 1500
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      },
      {
        "groupKey": "row:diagnostic:9:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1823:1828:typescript:TS2322",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/read-expressions.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2322",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2322: Type 'string' is not assignable to type 'number'."
              }
            ],
            "message": "TS2322: Type 'string' is not assignable to type 'number'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1828,
              "start": 1823
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/read-expressions.html:1823:1828:typescript:TS2322"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1828,
            "start": 1823
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      }
    ],
    "primaryCount": 14,
    "rawRowCount": 17
  },
  "raw": {
    "diagnosticCount": 17,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'."
          }
        ],
        "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1044,
          "start": 1040
        },
        "spanText": "true",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "phase": null,
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 118,
          "start": 106
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
          }
        ],
        "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 118,
          "start": 106
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2349",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures."
          }
        ],
        "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1098,
          "start": 1087
        },
        "spanText": "notCallable",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "phase": null,
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 1286,
          "start": 1274
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
          }
        ],
        "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1286,
          "start": 1274
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "expression",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "expression",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "non-trackable-template-method-call",
            "kind": "non-trackable-template-method-call",
            "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads."
          }
        ],
        "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.",
        "related": [
          {
            "anomaly": null,
            "code": null,
            "file": "src/read-expressions.ts",
            "message": "Method 'acceptPredicate' is declared here.",
            "sourceRole": null,
            "span": {
              "end": 925,
              "start": 910
            },
            "spanText": "acceptPredicate",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
          },
          {
            "anomaly": null,
            "code": null,
            "file": "src/read-expressions.ts",
            "message": "Method-body read 'this.items' is not observed through the template call.",
            "sourceRole": null,
            "span": {
              "end": 1000,
              "start": 990
            },
            "spanText": "this.items",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
          }
        ],
        "severity": "warning",
        "source": "semantic-runtime:observation",
        "span": {
          "end": 1358,
          "start": 1343
        },
        "spanText": "acceptPredicate",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2322",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2322: Type 'string' is not assignable to type 'boolean'."
          }
        ],
        "message": "TS2322: Type 'string' is not assignable to type 'boolean'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1377,
          "start": 1367
        },
        "spanText": "item.label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
          }
        ],
        "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1502,
          "start": 1500
        },
        "spanText": "42",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2322",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2322: Type 'string' is not assignable to type 'number'."
          }
        ],
        "message": "TS2322: Type 'string' is not assignable to type 'number'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1828,
          "start": 1823
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      },
      {
        "actionability": "guided",
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
          "phase": "semantic",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 216,
          "start": 207
        },
        "spanText": "maybeItem",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS18046",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS18046: 'unknownValue' is of type 'unknown'."
          }
        ],
        "message": "TS18046: 'unknownValue' is of type 'unknown'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 271,
          "start": 259
        },
        "spanText": "unknownValue",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "informational",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 277,
          "start": 272
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS18046",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS18046: 'unknownValue' is of type 'unknown'."
          }
        ],
        "message": "TS18046: 'unknownValue' is of type 'unknown'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 325,
          "start": 313
        },
        "spanText": "unknownValue",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "informational",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 331,
          "start": 326
        },
        "spanText": "label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
          }
        ],
        "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 800,
          "start": 787
        },
        "spanText": "'not-an-item'",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/read-expressions.html",
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
          "end": 878,
          "start": 866
        },
        "spanText": "definiteItem",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 14,
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
            "phase": null,
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
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
            "end": 118,
            "start": 106
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "guided",
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
            "phase": "semantic",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
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
            "end": 216,
            "start": 207
          },
          "spanText": "maybeItem",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS18046",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS18046: 'unknownValue' is of type 'unknown'."
            }
          ],
          "message": "TS18046: 'unknownValue' is of type 'unknown'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 271,
            "start": 259
          },
          "spanText": "unknownValue",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS18046",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS18046: 'unknownValue' is of type 'unknown'."
            }
          ],
          "message": "TS18046: 'unknownValue' is of type 'unknown'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 325,
            "start": 313
          },
          "spanText": "unknownValue",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
            }
          ],
          "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 800,
            "start": 787
          },
          "spanText": "'not-an-item'",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
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
            "end": 878,
            "start": 866
          },
          "spanText": "definiteItem",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'."
            }
          ],
          "message": "TS2769: No overload matches this call.\nOverload 1 of 2, '(value: string): string', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'string'.\nOverload 2 of 2, '(value: number): number', gave the following error.\nArgument of type 'boolean' is not assignable to parameter of type 'number'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1044,
            "start": 1040
          },
          "spanText": "true",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2349",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures."
            }
          ],
          "message": "TS2349: This expression is not callable.\nType 'String' has no call signatures.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1098,
            "start": 1087
          },
          "spanText": "notCallable",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "phase": null,
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
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
            "end": 1286,
            "start": 1274
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2339",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
            }
          ],
          "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1286,
            "start": 1274
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "expression",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "expression",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "non-trackable-template-method-call",
              "kind": "non-trackable-template-method-call",
              "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads."
            }
          ],
          "message": "Template method call \"acceptPredicate(...)\" reads this.items inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.",
          "related": [
            {
              "anomaly": null,
              "code": null,
              "file": "src/read-expressions.ts",
              "message": "Method 'acceptPredicate' is declared here.",
              "sourceRole": null,
              "span": {
                "end": 925,
                "start": 910
              },
              "spanText": "acceptPredicate",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
            },
            {
              "anomaly": null,
              "code": null,
              "file": "src/read-expressions.ts",
              "message": "Method-body read 'this.items' is not observed through the template call.",
              "sourceRole": null,
              "span": {
                "end": 1000,
                "start": 990
              },
              "spanText": "this.items",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.ts"
            }
          ],
          "severity": "warning",
          "source": "semantic-runtime:observation",
          "span": {
            "end": 1358,
            "start": 1343
          },
          "spanText": "acceptPredicate",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2322",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2322: Type 'string' is not assignable to type 'boolean'."
            }
          ],
          "message": "TS2322: Type 'string' is not assignable to type 'boolean'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1377,
            "start": 1367
          },
          "spanText": "item.label",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
            }
          ],
          "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1502,
            "start": 1500
          },
          "spanText": "42",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/read-expressions.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2322",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2322: Type 'string' is not assignable to type 'number'."
            }
          ],
          "message": "TS2322: Type 'string' is not assignable to type 'number'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1828,
            "start": 1823
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 14,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 14,
  "suppressedCount": 0
}
```

## typechecking-write-bindings

### Probe

```json
{
  "file": "src/write-bindings.html"
}
```

### publishDiagnostics

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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
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
            "filePath": "src/write-bindings.html"
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
            "filePath": "src/write-bindings.html"
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
            "filePath": "src/write-bindings.html"
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
                "end": 1054,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@1049..1054",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 1049
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1278,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@1273..1278",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 1273
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1372,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@1360..1372",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 1360
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 1465,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@1453..1465",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 1453
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 228,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@216..228",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 216
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 311,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@297..311",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 297
              }
            },
            {
              "count": 2,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 458,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@453..458",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 453
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 644,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@619..644",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 619
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 891,
                "kind": "source-span-address",
                "label": "src/write-bindings.html@879..891",
                "path": "src/write-bindings.html",
                "role": "binding-source-assignment",
                "start": 879
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
        "rationale": "Inspect template-diagnostics rows referenced by returned diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "template-diagnostics"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 10 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:4:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:216:228:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 228,
              "start": 216
            },
            "spanText": "readonlyText",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:216:228:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 228,
            "start": 216
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:5:template:binding-source-assignment-runtime-noop:framework-runtime-behavior:no-framework-code:src/write-bindings.html:297:311:binding-source-assignment:source-member-getter-without-setter",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-runtime-noop",
                "kind": "binding-source-assignment-runtime-noop",
                "message": "Source member 'getterOnlyText' is a getter without a setter at runtime."
              }
            ],
            "message": "Source member 'getterOnlyText' is a getter without a setter at runtime.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 311,
              "start": 297
            },
            "spanText": "getterOnlyText",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:binding-source-assignment-runtime-noop:framework-runtime-behavior:no-framework-code:src/write-bindings.html:297:311:binding-source-assignment:source-member-getter-without-setter"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 311,
            "start": 297
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:6:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:453:458:binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 458,
              "start": 453
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:453:458:binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 458,
            "start": 453
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:7:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:453:458:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type number is not assignable to target 'value' of type string."
              }
            ],
            "message": "Binding source type number is not assignable to target 'value' of type string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 458,
              "start": 453
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:453:458:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 458,
            "start": 453
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:8:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:619:644:binding-source-assignment:source-member-readonly",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects."
              }
            ],
            "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 644,
              "start": 619
            },
            "spanText": "readonlyRecord[activeKey]",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:619:644:binding-source-assignment:source-member-readonly"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 644,
            "start": 619
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:9:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:879:891:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 891,
              "start": 879
            },
            "spanText": "readonlyText",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:879:891:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 891,
            "start": 879
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:0:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1049:1054:binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1054,
              "start": 1049
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1049:1054:binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1054,
            "start": 1049
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:1:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1273:1278:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type number is not assignable to target 'requiredText' of type string."
              }
            ],
            "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1278,
              "start": 1273
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1273:1278:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1278,
            "start": 1273
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:2:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1360:1372:binding-target-assignment:source-nullish-to-required-target",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string."
              }
            ],
            "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1372,
              "start": 1360
            },
            "spanText": "nullableText",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1360:1372:binding-target-assignment:source-nullish-to-required-target"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1372,
            "start": 1360
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      },
      {
        "groupKey": "row:diagnostic:3:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1453:1465:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/write-bindings.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-source-assignment-strictness",
                "kind": "binding-source-assignment-strictness",
                "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
              }
            ],
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1465,
              "start": 1453
            },
            "spanText": "readonlyText",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:binding-source-assignment-strictness:semantic-runtime-product:no-framework-code:src/write-bindings.html:1453:1465:binding-source-assignment:source-member-readonly+binding-source-assignment:target-to-source-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1465,
            "start": 1453
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      }
    ],
    "primaryCount": 10,
    "rawRowCount": 10
  },
  "raw": {
    "diagnosticCount": 10,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1054,
          "start": 1049
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type number is not assignable to target 'requiredText' of type string."
          }
        ],
        "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1278,
          "start": 1273
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string."
          }
        ],
        "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1372,
          "start": 1360
        },
        "spanText": "nullableText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1465,
          "start": 1453
        },
        "spanText": "readonlyText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 228,
          "start": 216
        },
        "spanText": "readonlyText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-runtime-noop",
            "kind": "binding-source-assignment-runtime-noop",
            "message": "Source member 'getterOnlyText' is a getter without a setter at runtime."
          }
        ],
        "message": "Source member 'getterOnlyText' is a getter without a setter at runtime.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 311,
          "start": 297
        },
        "spanText": "getterOnlyText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 458,
          "start": 453
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type number is not assignable to target 'value' of type string."
          }
        ],
        "message": "Binding source type number is not assignable to target 'value' of type string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 458,
          "start": 453
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects."
          }
        ],
        "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 644,
          "start": 619
        },
        "spanText": "readonlyRecord[activeKey]",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/write-bindings.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-source-assignment-strictness",
            "kind": "binding-source-assignment-strictness",
            "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
          }
        ],
        "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 891,
          "start": 879
        },
        "spanText": "readonlyText",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 10,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 228,
            "start": 216
          },
          "spanText": "readonlyText",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-runtime-noop",
              "kind": "binding-source-assignment-runtime-noop",
              "message": "Source member 'getterOnlyText' is a getter without a setter at runtime."
            }
          ],
          "message": "Source member 'getterOnlyText' is a getter without a setter at runtime.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 311,
            "start": 297
          },
          "spanText": "getterOnlyText",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 458,
            "start": 453
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type number is not assignable to target 'value' of type string."
            }
          ],
          "message": "Binding source type number is not assignable to target 'value' of type string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 458,
            "start": 453
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects."
            }
          ],
          "message": "Owner type 'Readonly<Record<string, string>>' exposes a readonly string index signature; Aurelia astAssign still writes to runtime objects.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 644,
            "start": 619
          },
          "spanText": "readonlyRecord[activeKey]",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 891,
            "start": 879
          },
          "spanText": "readonlyText",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> number); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1054,
            "start": 1049
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type number is not assignable to target 'requiredText' of type string."
            }
          ],
          "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1278,
            "start": 1273
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string."
            }
          ],
          "message": "Binding source type string | null may be nullish, but target 'requiredText' requires string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1372,
            "start": 1360
          },
          "spanText": "nullableText",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/write-bindings.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-source-assignment-strictness",
              "kind": "binding-source-assignment-strictness",
              "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign."
            }
          ],
          "message": "Source member 'readonlyText' is readonly in the TypeChecker surface, but Aurelia astAssign performs a runtime property assignment. TypeChecker target-to-source assignment is not assignable after observer and value-converter writeback (string -> \"Readonly\"); Aurelia runtime still passes the observer value to astAssign.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1465,
            "start": 1453
          },
          "spanText": "readonlyText",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-typechecking-corpus/src/write-bindings.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 10,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 10,
  "suppressedCount": 0
}
```

## typechecking-resource-boundaries

### Probe

```json
{
  "file": "src/resource-boundaries.html"
}
```

### publishDiagnostics

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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "taxonomy": {
          "actionability": "manual",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope..",
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope..",
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding..",
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
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "degraded",
          "schema": "diagnostics-taxonomy/1"
        }
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
            "filePath": "src/resource-boundaries.html"
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
            "filePath": "src/resource-boundaries.html"
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
            "filePath": "src/resource-boundaries.html"
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
                "end": 1019,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@1009..1019",
                "path": "src/resource-boundaries.html",
                "role": "binding-source-assignment",
                "start": 1009
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 116,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@110..116",
                "path": "src/resource-boundaries.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 110
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 205,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@200..205",
                "path": "src/resource-boundaries.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 200
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
                  "label": "src/resource-boundaries.html",
                  "path": "src/resource-boundaries.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
                },
                "end": 506,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@491..506",
                "path": "src/resource-boundaries.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 491
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 645,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@633..645",
                "path": "src/resource-boundaries.html",
                "role": "name",
                "start": 633
              }
            },
            {
              "count": 1,
              "facets": [
                "authored-source",
                "exact-authored-span"
              ],
              "source": {
                "end": 645,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@633..645",
                "path": "src/resource-boundaries.html",
                "role": "typescript-overlay:semantic",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 633
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
                  "label": "src/resource-boundaries.html",
                  "path": "src/resource-boundaries.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
                },
                "end": 737,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@723..737",
                "path": "src/resource-boundaries.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 723
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
                  "label": "src/resource-boundaries.html",
                  "path": "src/resource-boundaries.html",
                  "sourceFileRole": "template",
                  "sourceWorkspaceKey": "aurelia-template-typechecking-corpus"
                },
                "end": 808,
                "kind": "source-span-address",
                "label": "src/resource-boundaries.html@798..808",
                "path": "src/resource-boundaries.html",
                "role": "name",
                "sourceFileRole": "template",
                "sourceWorkspaceKey": "aurelia-template-typechecking-corpus",
                "start": 798
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
        "rationale": "Inspect template-diagnostics rows referenced by returned diagnostics.",
        "targetQuery": {
          "diagnosticProjection": "type-projection",
          "kind": "template-diagnostics",
          "page": {
            "size": 200
          }
        },
        "targetQueryKind": "template-diagnostics"
      }
    ],
    "coverage": "complete",
    "page": null,
    "result": "answered",
    "schemaVersion": "0.2",
    "selection": "not-applicable",
    "summary": "Returned 8 app diagnostic(s)."
  },
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 1,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-boundaries.html:110:116:typescript:TS2345",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/resource-boundaries.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
              }
            ],
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 116,
              "start": 110
            },
            "spanText": "prefix",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-boundaries.html:110:116:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 116,
            "start": 110
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      },
      {
        "groupKey": "row:diagnostic:2:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-boundaries.html:200:205:typescript:TS2345",
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
              "taxonomy": {
                "actionability": "manual",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/resource-boundaries.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
              }
            ],
            "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 205,
              "start": 200
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-boundaries.html:200:205:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 205,
            "start": 200
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      },
      {
        "groupKey": "row:diagnostic:3:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-boundaries.html:491:506:runtime-value-converter:AUR0103",
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
            "file": "src/resource-boundaries.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0103",
                "kind": "runtime-value-converter-framework-error",
                "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 506,
              "start": 491
            },
            "spanText": "absentConverter",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-boundaries.html:491:506:runtime-value-converter:AUR0103"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "checker-agreement:missing-member:template-member-access:src/resource-boundaries.html:628:645:diagnostic:4:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/resource-boundaries.html:633:645:expression-member:selected-member-missing",
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
              "phase": null,
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/resource-boundaries.html",
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
              "end": 645,
              "start": 633
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/resource-boundaries.html:633:645:expression-member:selected-member-missing"
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
                "taxonomy": {
                  "actionability": "manual",
                  "category": "template-syntax",
                  "confidence": null,
                  "impact": "blocking",
                  "schema": "diagnostics-taxonomy/1"
                }
              },
              "file": "src/resource-boundaries.html",
              "impact": "blocking",
              "issues": [
                {
                  "code": "TS2339",
                  "kind": "template-expression-typescript-diagnostic",
                  "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
                }
              ],
              "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
              "related": [],
              "severity": "error",
              "source": "semantic-runtime:template",
              "span": {
                "end": 645,
                "start": 633
              },
              "spanText": "missingLabel",
              "status": "contextual",
              "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
            },
            "relation": "checker-evidence",
            "role": "contextual",
            "rowId": "diagnostic:5:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-boundaries.html:633:645:typescript:TS2339"
          }
        ],
        "subject": {
          "source": null,
          "span": {
            "end": 645,
            "start": 628
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      },
      {
        "groupKey": "row:diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-boundaries.html:723:737:runtime-binding-behavior:AUR0101",
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
            "file": "src/resource-boundaries.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 737,
              "start": 723
            },
            "spanText": "absentBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-boundaries.html:723:737:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0102:src/resource-boundaries.html:798:808:runtime-binding-behavior:AUR0102",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "blocking",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/resource-boundaries.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0102",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 808,
              "start": 798
            },
            "spanText": "auditValue",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0102:src/resource-boundaries.html:798:808:runtime-binding-behavior:AUR0102"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/resource-boundaries.html:1009:1019:binding-target-assignment:source-to-target-type-mismatch",
        "maxRawSeverity": "warning",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "taxonomy": {
                "actionability": "guided",
                "category": "template-syntax",
                "confidence": null,
                "impact": "degraded",
                "schema": "diagnostics-taxonomy/1"
              }
            },
            "file": "src/resource-boundaries.html",
            "impact": "degraded",
            "issues": [
              {
                "code": "binding-target-assignment-strictness",
                "kind": "binding-target-assignment-strictness",
                "message": "Binding source type number is not assignable to target 'requiredText' of type string."
              }
            ],
            "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
            "related": [],
            "severity": "warning",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1019,
              "start": 1009
            },
            "spanText": "item.score",
            "status": "primary",
            "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:binding-target-assignment-strictness:semantic-runtime-product:no-framework-code:src/resource-boundaries.html:1009:1019:binding-target-assignment:source-to-target-type-mismatch"
        },
        "primarySeverity": "warning",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 1019,
            "start": 1009
          },
          "subjectKind": "template-member-access",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      }
    ],
    "primaryCount": 7,
    "rawRowCount": 8
  },
  "raw": {
    "diagnosticCount": 8,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
        "impact": "degraded",
        "issues": [
          {
            "code": "binding-target-assignment-strictness",
            "kind": "binding-target-assignment-strictness",
            "message": "Binding source type number is not assignable to target 'requiredText' of type string."
          }
        ],
        "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
        "related": [],
        "severity": "warning",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1019,
          "start": 1009
        },
        "spanText": "item.score",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
          }
        ],
        "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 116,
          "start": 110
        },
        "spanText": "prefix",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
          }
        ],
        "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 205,
          "start": 200
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0103",
            "kind": "runtime-value-converter-framework-error",
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 506,
          "start": 491
        },
        "spanText": "absentConverter",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "phase": null,
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "degraded",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
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
          "end": 645,
          "start": 633
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "taxonomy": {
            "actionability": "manual",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2339",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'."
          }
        ],
        "message": "TS2339: Property 'missingLabel' does not exist on type 'CorpusItem'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 645,
          "start": 633
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 737,
          "start": 723
        },
        "spanText": "absentBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "taxonomy": {
            "actionability": "guided",
            "category": "template-syntax",
            "confidence": null,
            "impact": "blocking",
            "schema": "diagnostics-taxonomy/1"
          }
        },
        "file": "src/resource-boundaries.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0102",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 808,
          "start": 798
        },
        "spanText": "auditValue",
        "status": "canonical",
        "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
      }
    ]
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 7,
      "diagnostics": [
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/resource-boundaries.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'."
            }
          ],
          "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'CorpusItem'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 116,
            "start": 110
          },
          "spanText": "prefix",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
            "taxonomy": {
              "actionability": "manual",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/resource-boundaries.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
            }
          ],
          "message": "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 205,
            "start": 200
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "file": "src/resource-boundaries.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0103",
              "kind": "runtime-value-converter-framework-error",
              "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'absentConverter' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 506,
            "start": 491
          },
          "spanText": "absentConverter",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
            "phase": null,
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/resource-boundaries.html",
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
            "end": 645,
            "start": 633
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
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
          "file": "src/resource-boundaries.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'absentBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 737,
            "start": 723
          },
          "spanText": "absentBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "blocking",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/resource-boundaries.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0102",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'auditValue' is already applied to this binding..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 808,
            "start": 798
          },
          "spanText": "auditValue",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "taxonomy": {
              "actionability": "guided",
              "category": "template-syntax",
              "confidence": null,
              "impact": "degraded",
              "schema": "diagnostics-taxonomy/1"
            }
          },
          "file": "src/resource-boundaries.html",
          "impact": "degraded",
          "issues": [
            {
              "code": "binding-target-assignment-strictness",
              "kind": "binding-target-assignment-strictness",
              "message": "Binding source type number is not assignable to target 'requiredText' of type string."
            }
          ],
          "message": "Binding source type number is not assignable to target 'requiredText' of type string.",
          "related": [],
          "severity": "warning",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1019,
            "start": 1009
          },
          "spanText": "item.score",
          "status": "primary",
          "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-typechecking-corpus/src/resource-boundaries.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 7,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 7,
  "suppressedCount": 0
}
```
