# attr-mapper-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/attr-mapper-config-errors`
Probe file: `packages/lane-harness/probes/attr-mapper-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## attr-mapper-main-source

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
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "configuration-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Attribute mapper already has a mapping for maxlength on INPUT.",
      "range": {
        "end": {
          "character": 62,
          "line": 12
        },
        "start": {
          "character": 6,
          "line": 12
        }
      },
      "rangeText": "mapper.useMapping({ INPUT: { maxlength: 'maxLength' } })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "configuration-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Attribute mapper already has a mapping for tabindex on *.",
      "range": {
        "end": {
          "character": 55,
          "line": 13
        },
        "start": {
          "character": 6,
          "line": 13
        }
      },
      "rangeText": "mapper.useGlobalMapping({ tabindex: 'tabIndex' })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0719",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "configuration",
        "diagnosticKind": "attr-mapper-duplicate-mapping",
        "frameworkErrorCode": "AUR0719",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "configuration-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "project",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT.",
      "range": {
        "end": {
          "character": 66,
          "line": 15
        },
        "start": {
          "character": 6,
          "line": 15
        }
      },
      "rangeText": "mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } })",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
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
        "groupKey": "row:diagnostic:0:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:287:343:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0719",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "attr-mapper-duplicate-mapping",
              "frameworkErrorCode": "AUR0719",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0719",
                "kind": "attr-mapper-duplicate-mapping",
                "message": "Attribute mapper already has a mapping for maxlength on INPUT."
              }
            ],
            "message": "Attribute mapper already has a mapping for maxlength on INPUT.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 343,
              "start": 287
            },
            "spanText": "mapper.useMapping({ INPUT: { maxlength: 'maxLength' } })",
            "status": "primary",
            "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:287:343:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:351:400:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0719",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "attr-mapper-duplicate-mapping",
              "frameworkErrorCode": "AUR0719",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0719",
                "kind": "attr-mapper-duplicate-mapping",
                "message": "Attribute mapper already has a mapping for tabindex on *."
              }
            ],
            "message": "Attribute mapper already has a mapping for tabindex on *.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 400,
              "start": 351
            },
            "spanText": "mapper.useGlobalMapping({ tabindex: 'tabIndex' })",
            "status": "primary",
            "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:351:400:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:471:531:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "project",
            "code": "AUR0719",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "configuration",
              "diagnosticKind": "attr-mapper-duplicate-mapping",
              "frameworkErrorCode": "AUR0719",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "configuration-issues",
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
                "code": "AUR0719",
                "kind": "attr-mapper-duplicate-mapping",
                "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT."
              }
            ],
            "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:configuration",
            "span": {
              "end": 531,
              "start": 471
            },
            "spanText": "mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } })",
            "status": "primary",
            "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:configuration:attr-mapper-duplicate-mapping:framework-error-code:AUR0719:src/main.ts:471:531:no-missing-input"
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
        "code": "AUR0719",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "attr-mapper-duplicate-mapping",
          "frameworkErrorCode": "AUR0719",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0719",
            "kind": "attr-mapper-duplicate-mapping",
            "message": "Attribute mapper already has a mapping for maxlength on INPUT."
          }
        ],
        "message": "Attribute mapper already has a mapping for maxlength on INPUT.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 343,
          "start": 287
        },
        "spanText": "mapper.useMapping({ INPUT: { maxlength: 'maxLength' } })",
        "status": "canonical",
        "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0719",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "attr-mapper-duplicate-mapping",
          "frameworkErrorCode": "AUR0719",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0719",
            "kind": "attr-mapper-duplicate-mapping",
            "message": "Attribute mapper already has a mapping for tabindex on *."
          }
        ],
        "message": "Attribute mapper already has a mapping for tabindex on *.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 400,
          "start": 351
        },
        "spanText": "mapper.useGlobalMapping({ tabindex: 'tabIndex' })",
        "status": "canonical",
        "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "project",
        "code": "AUR0719",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "configuration",
          "diagnosticKind": "attr-mapper-duplicate-mapping",
          "frameworkErrorCode": "AUR0719",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "configuration-issues",
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
            "code": "AUR0719",
            "kind": "attr-mapper-duplicate-mapping",
            "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT."
          }
        ],
        "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:configuration",
        "span": {
          "end": 531,
          "start": 471
        },
        "spanText": "mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } })",
        "status": "canonical",
        "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
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
          "code": "AUR0719",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "attr-mapper-duplicate-mapping",
            "frameworkErrorCode": "AUR0719",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0719",
              "kind": "attr-mapper-duplicate-mapping",
              "message": "Attribute mapper already has a mapping for maxlength on INPUT."
            }
          ],
          "message": "Attribute mapper already has a mapping for maxlength on INPUT.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 343,
            "start": 287
          },
          "spanText": "mapper.useMapping({ INPUT: { maxlength: 'maxLength' } })",
          "status": "primary",
          "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0719",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "attr-mapper-duplicate-mapping",
            "frameworkErrorCode": "AUR0719",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0719",
              "kind": "attr-mapper-duplicate-mapping",
              "message": "Attribute mapper already has a mapping for tabindex on *."
            }
          ],
          "message": "Attribute mapper already has a mapping for tabindex on *.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 400,
            "start": 351
          },
          "spanText": "mapper.useGlobalMapping({ tabindex: 'tabIndex' })",
          "status": "primary",
          "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "project",
          "code": "AUR0719",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "configuration",
            "diagnosticKind": "attr-mapper-duplicate-mapping",
            "frameworkErrorCode": "AUR0719",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "configuration-issues",
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
              "code": "AUR0719",
              "kind": "attr-mapper-duplicate-mapping",
              "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT."
            }
          ],
          "message": "Attribute mapper already has a mapping for thing on MY-ELEMENT.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:configuration",
          "span": {
            "end": 531,
            "start": 471
          },
          "spanText": "mapper.useMapping({ 'MY-ELEMENT': { thing: 'otherThing' } })",
          "status": "primary",
          "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/attr-mapper-config-errors/src/main.ts"
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
