# typescript-project-diagnostics diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics`
Probe file: `packages/lane-harness/probes/typescript-project-diagnostics.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## typescript-state-source-file

### Probe

```json
{
  "file": "src/typescript-project-diagnostics-state.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 2,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2322",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2322",
        "frameworkErrorCode": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Type 'number' is not assignable to type 'string'.",
      "range": {
        "end": {
          "character": 18,
          "line": 1
        },
        "start": {
          "character": 11,
          "line": 1
        }
      },
      "rangeText": "summary",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.",
      "range": {
        "end": {
          "character": 42,
          "line": 4
        },
        "start": {
          "character": 39,
          "line": 4
        }
      },
      "rangeText": "123",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
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
        "groupKey": "row:diagnostic:1:typescript:TS2322:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts:49:56:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2322",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2322",
              "frameworkErrorCode": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/typescript-project-diagnostics-state.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2322",
                "kind": "TS2322",
                "message": "Type 'number' is not assignable to type 'string'."
              }
            ],
            "message": "Type 'number' is not assignable to type 'string'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 56,
              "start": 49
            },
            "spanText": "summary",
            "status": "primary",
            "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:typescript:TS2322:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts:49:56:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts:150:153:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2769",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2769",
              "frameworkErrorCode": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/typescript-project-diagnostics-state.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "TS2769",
                "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'."
              }
            ],
            "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 153,
              "start": 150
            },
            "spanText": "123",
            "status": "primary",
            "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts:150:153:no-missing-input"
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
        "code": "TS2769",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2769",
          "frameworkErrorCode": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/typescript-project-diagnostics-state.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "TS2769",
            "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'."
          }
        ],
        "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 153,
          "start": 150
        },
        "spanText": "123",
        "status": "canonical",
        "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2322",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2322",
          "frameworkErrorCode": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/typescript-project-diagnostics-state.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2322",
            "kind": "TS2322",
            "message": "Type 'number' is not assignable to type 'string'."
          }
        ],
        "message": "Type 'number' is not assignable to type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 56,
          "start": 49
        },
        "spanText": "summary",
        "status": "canonical",
        "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 2,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2322",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2322",
            "frameworkErrorCode": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/typescript-project-diagnostics-state.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2322",
              "kind": "TS2322",
              "message": "Type 'number' is not assignable to type 'string'."
            }
          ],
          "message": "Type 'number' is not assignable to type 'string'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 56,
            "start": 49
          },
          "spanText": "summary",
          "status": "primary",
          "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2769",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2769",
            "frameworkErrorCode": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/typescript-project-diagnostics-state.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "TS2769",
              "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'."
            }
          ],
          "message": "No overload matches this call.\nOverload 1 of 2, '(type: \"click\", listener: (this: Document, ev: PointerEvent) => any, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type '(this: Document, ev: PointerEvent) => any'.\nOverload 2 of 2, '(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void', gave the following error.\nArgument of type 'number' is not assignable to parameter of type 'EventListenerOrEventListenerObject'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 153,
            "start": 150
          },
          "spanText": "123",
          "status": "primary",
          "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-project-diagnostics-state.ts"
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

## typescript-related-information-cross-file

### Probe

```json
{
  "file": "src/typescript-related-information.ts"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 1,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2741",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2741",
        "frameworkErrorCode": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'.",
      "range": {
        "end": {
          "character": 32,
          "line": 2
        },
        "start": {
          "character": 13,
          "line": 2
        }
      },
      "rangeText": "relatedInfoContract",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/diagnostic-contract.ts",
          "message": "'requiredName' is declared here.",
          "range": {
            "end": {
              "character": 14,
              "line": 1
            },
            "start": {
              "character": 2,
              "line": 1
            }
          },
          "rangeText": "requiredName",
          "uri": "fixtures://pressure/typescript-project-diagnostics/src/diagnostic-contract.ts"
        }
      ],
      "severity": "error",
      "source": "typescript"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
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
        "groupKey": "row:diagnostic:0:typescript:TS2741:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-related-information.ts:79:98:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2741",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2741",
              "frameworkErrorCode": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/typescript-related-information.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2741",
                "kind": "TS2741",
                "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'."
              }
            ],
            "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'.",
            "related": [
              {
                "anomaly": null,
                "code": "TS2728",
                "file": "src/diagnostic-contract.ts",
                "message": "'requiredName' is declared here.",
                "sourceRole": "app-source",
                "span": {
                  "end": 57,
                  "start": 45
                },
                "spanText": "requiredName",
                "uri": "fixtures://pressure/typescript-project-diagnostics/src/diagnostic-contract.ts"
              }
            ],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 98,
              "start": 79
            },
            "spanText": "relatedInfoContract",
            "status": "primary",
            "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:typescript:TS2741:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/typescript-project-diagnostics/src/typescript-related-information.ts:79:98:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 1,
    "rawRowCount": 1
  },
  "raw": {
    "diagnosticCount": 1,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2741",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2741",
          "frameworkErrorCode": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/typescript-related-information.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2741",
            "kind": "TS2741",
            "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'."
          }
        ],
        "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'.",
        "related": [
          {
            "anomaly": null,
            "code": "TS2728",
            "file": "src/diagnostic-contract.ts",
            "message": "'requiredName' is declared here.",
            "sourceRole": "app-source",
            "span": {
              "end": 57,
              "start": 45
            },
            "spanText": "requiredName",
            "uri": "fixtures://pressure/typescript-project-diagnostics/src/diagnostic-contract.ts"
          }
        ],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 98,
          "start": 79
        },
        "spanText": "relatedInfoContract",
        "status": "canonical",
        "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
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
          "category": "expression",
          "code": "TS2741",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2741",
            "frameworkErrorCode": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/typescript-related-information.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2741",
              "kind": "TS2741",
              "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'."
            }
          ],
          "message": "Property 'requiredName' is missing in type '{}' but required in type 'RequiredProjectContract'.",
          "related": [
            {
              "anomaly": null,
              "code": "TS2728",
              "file": "src/diagnostic-contract.ts",
              "message": "'requiredName' is declared here.",
              "sourceRole": "app-source",
              "span": {
                "end": 57,
                "start": 45
              },
              "spanText": "requiredName",
              "uri": "fixtures://pressure/typescript-project-diagnostics/src/diagnostic-contract.ts"
            }
          ],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 98,
            "start": 79
          },
          "spanText": "relatedInfoContract",
          "status": "primary",
          "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/typescript-project-diagnostics/src/typescript-related-information.ts"
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
