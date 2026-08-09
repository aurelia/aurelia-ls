# template-expression-resource-combinators diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## expression-parser-and-authoring-errors

### Probe

```json
{
  "file": "src/invalid-expression-gallery.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 25,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0167",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0167",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0167",
        "missingInputs": [
          "expression-parse:AUR0167"
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
      "message": "Expected ':' in conditional expression.",
      "range": {
        "end": {
          "character": 68,
          "line": 1
        },
        "start": {
          "character": 68,
          "line": 1
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0151",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0151",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0151",
        "missingInputs": [
          "expression-parse:AUR0151"
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
      "message": "Expected iterator declaration.",
      "range": {
        "end": {
          "character": 47,
          "line": 2
        },
        "start": {
          "character": 47,
          "line": 2
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0155",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0155",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0155",
        "missingInputs": [
          "expression-parse:AUR0155"
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
      "message": "Unexpected token EOF in primary expression.",
      "range": {
        "end": {
          "character": 65,
          "line": 3
        },
        "start": {
          "character": 65,
          "line": 3
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0159",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0159",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0159",
        "missingInputs": [
          "expression-parse:AUR0159"
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
      "message": "Expected identifier after '|'.",
      "range": {
        "end": {
          "character": 45,
          "line": 4
        },
        "start": {
          "character": 45,
          "line": 4
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0159",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0159",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0159",
        "missingInputs": [
          "expression-parse:AUR0159"
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
      "message": "Expected identifier after '|'.",
      "range": {
        "end": {
          "character": 47,
          "line": 5
        },
        "start": {
          "character": 46,
          "line": 5
        }
      },
      "rangeText": "1",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0160",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0160",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0160",
        "missingInputs": [
          "expression-parse:AUR0160"
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
      "message": "Expected identifier after '&'.",
      "range": {
        "end": {
          "character": 44,
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0160",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0160",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0160",
        "missingInputs": [
          "expression-parse:AUR0160"
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
      "message": "Expected identifier after '&'.",
      "range": {
        "end": {
          "character": 46,
          "line": 7
        },
        "start": {
          "character": 45,
          "line": 7
        }
      },
      "rangeText": "1",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "expression-parse-error",
      "data": {
        "diagnosticAuthority": "semantic-authoring-policy",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:unmapped",
        "missingInputs": [
          "expression-parse:unmapped"
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
      "message": "Expected '}' to close interpolation hole.",
      "range": {
        "end": {
          "character": 61,
          "line": 8
        },
        "start": {
          "character": 61,
          "line": 8
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0170",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0170",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0170",
        "missingInputs": [
          "expression-parse:AUR0170"
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
      "message": "Expected ',' or ']' in array binding pattern.",
      "range": {
        "end": {
          "character": 62,
          "line": 9
        },
        "start": {
          "character": 61,
          "line": 9
        }
      },
      "rangeText": "=",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0170",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0170",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0170",
        "missingInputs": [
          "expression-parse:AUR0170"
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
      "message": "Array repeat declarations support identifiers and holes only.",
      "range": {
        "end": {
          "character": 55,
          "line": 10
        },
        "start": {
          "character": 52,
          "line": 10
        }
      },
      "rangeText": "...",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0170",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0170",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0170",
        "missingInputs": [
          "expression-parse:AUR0170"
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
      "message": "Array repeat declarations support identifiers and holes only.",
      "range": {
        "end": {
          "character": 55,
          "line": 11
        },
        "start": {
          "character": 54,
          "line": 11
        }
      },
      "rangeText": "[",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0152",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0152",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0152",
        "missingInputs": [
          "expression-parse:AUR0152"
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
      "message": "Spread syntax is not supported in binding expressions.",
      "range": {
        "end": {
          "character": 54,
          "line": 12
        },
        "start": {
          "character": 51,
          "line": 12
        }
      },
      "rangeText": "...",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0158",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0158",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0158",
        "missingInputs": [
          "expression-parse:AUR0158"
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
      "message": "Left-hand side is not assignable.",
      "range": {
        "end": {
          "character": 62,
          "line": 13
        },
        "start": {
          "character": 61,
          "line": 13
        }
      },
      "rangeText": "=",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0158",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0158",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0158",
        "missingInputs": [
          "expression-parse:AUR0158"
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
      "message": "Left-hand side is not assignable.",
      "range": {
        "end": {
          "character": 78,
          "line": 14
        },
        "start": {
          "character": 77,
          "line": 14
        }
      },
      "rangeText": "=",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0161",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0161",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0161",
        "missingInputs": [
          "expression-parse:AUR0161"
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
      "message": "Unexpected token after end of expression.",
      "range": {
        "end": {
          "character": 50,
          "line": 15
        },
        "start": {
          "character": 48,
          "line": 15
        }
      },
      "rangeText": "of",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0162",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0162",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0162",
        "missingInputs": [
          "expression-parse:AUR0162"
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
      "message": "Bare 'import' is not allowed in binding expressions.",
      "range": {
        "end": {
          "character": 54,
          "line": 16
        },
        "start": {
          "character": 48,
          "line": 16
        }
      },
      "rangeText": "import",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0172",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0172",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0172",
        "missingInputs": [
          "expression-parse:AUR0172"
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
      "message": "Invalid tagged template on optional chain.",
      "range": {
        "end": {
          "character": 70,
          "line": 17
        },
        "start": {
          "character": 69,
          "line": 17
        }
      },
      "rangeText": "`",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0165",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0165",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0165",
        "missingInputs": [
          "expression-parse:AUR0165"
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
      "message": "Unterminated string literal.",
      "range": {
        "end": {
          "character": 51,
          "line": 18
        },
        "start": {
          "character": 45,
          "line": 18
        }
      },
      "rangeText": "'label",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0166",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0166",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0166",
        "missingInputs": [
          "expression-parse:AUR0166"
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
      "message": "Unterminated template literal.",
      "range": {
        "end": {
          "character": 53,
          "line": 19
        },
        "start": {
          "character": 53,
          "line": 19
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0167",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0167",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0167",
        "missingInputs": [
          "expression-parse:AUR0167"
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
      "message": "Expected ',' or ')' in argument list.",
      "range": {
        "end": {
          "character": 56,
          "line": 20
        },
        "start": {
          "character": 56,
          "line": 20
        }
      },
      "rangeText": "",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0168",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0168",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0168",
        "missingInputs": [
          "expression-parse:AUR0168"
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
      "message": "Unexpected character in binding expression.",
      "range": {
        "end": {
          "character": 47,
          "line": 21
        },
        "start": {
          "character": 46,
          "line": 21
        }
      },
      "rangeText": "#",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0174",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0174",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0174",
        "missingInputs": [
          "expression-parse:AUR0174"
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
      "message": "Arrow function default parameters are not supported.",
      "range": {
        "end": {
          "character": 75,
          "line": 22
        },
        "start": {
          "character": 73,
          "line": 22
        }
      },
      "rangeText": "=>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0175",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0175",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0175",
        "missingInputs": [
          "expression-parse:AUR0175"
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
      "message": "Arrow function destructuring parameters are not supported.",
      "range": {
        "end": {
          "character": 74,
          "line": 23
        },
        "start": {
          "character": 72,
          "line": 23
        }
      },
      "rangeText": "=>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0176",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0176",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0176",
        "missingInputs": [
          "expression-parse:AUR0176"
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
      "message": "Rest parameter must be last in arrow parameter list.",
      "range": {
        "end": {
          "character": 65,
          "line": 24
        },
        "start": {
          "character": 64,
          "line": 24
        }
      },
      "rangeText": ",",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0178",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0178",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0178",
        "missingInputs": [
          "expression-parse:AUR0178"
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
      "message": "Arrow function bodies are not supported.",
      "range": {
        "end": {
          "character": 60,
          "line": 25
        },
        "start": {
          "character": 59,
          "line": 25
        }
      },
      "rangeText": "{",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
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
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
}
```

## resource-lifecycle-and-argument-errors

### Probe

```json
{
  "file": "src/resource-combinator-gallery.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 16,
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
            "end": 136,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@131..136",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 131
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
          "character": 44,
          "line": 2
        },
        "start": {
          "character": 39,
          "line": 2
        }
      },
      "rangeText": "count",
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
            "end": 221,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@216..221",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 216
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
          "character": 66,
          "line": 3
        },
        "start": {
          "character": 61,
          "line": 3
        }
      },
      "rangeText": "limit",
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
        "diagnosticKind": "expression-runtime-evaluation-error",
        "frameworkErrorCode": "AUR0103",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-ast:AUR0103",
        "missingInputs": [
          "runtime-ast:AUR0103"
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
          "actionKind": "register-resource",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "resource-registration",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 593,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@588..593",
            "path": "src/resource-combinator-gallery.html",
            "role": "binding-source-assignment",
            "start": 588
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Value converter 'missingConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 72,
          "line": 7
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
      "message": "Value converter 'missingConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 132,
          "line": 7
        },
        "start": {
          "character": 116,
          "line": 7
        }
      },
      "rangeText": "missingConverter",
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
            "end": 937,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@932..937",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 932
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
          "character": 76,
          "line": 11
        },
        "start": {
          "character": 71,
          "line": 11
        }
      },
      "rangeText": "limit",
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
            "end": 945,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@938..945",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 938
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": 2345
      },
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
      "range": {
        "end": {
          "character": 84,
          "line": 11
        },
        "start": {
          "character": 77,
          "line": 11
        }
      },
      "rangeText": "'wrong'",
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
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
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
            "end": 1035,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@1023..1035",
            "path": "src/resource-combinator-gallery.html",
            "role": "name",
            "start": 1023
          },
          "span": null,
          "subjectKind": "template-expression",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Template expression root \"missingLabel\" is not available on the current binding scope.",
      "range": {
        "end": {
          "character": 84,
          "line": 12
        },
        "start": {
          "character": 72,
          "line": 12
        }
      },
      "rangeText": "missingLabel",
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
      "message": "Binding behavior 'innerAudit' is already applied to this binding.",
      "range": {
        "end": {
          "character": 57,
          "line": 14
        },
        "start": {
          "character": 47,
          "line": 14
        }
      },
      "rangeText": "innerAudit",
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
      "message": "Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 100,
          "line": 15
        },
        "start": {
          "character": 85,
          "line": 15
        }
      },
      "rangeText": "missingBehavior",
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
      "message": "Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 92,
          "line": 16
        },
        "start": {
          "character": 77,
          "line": 16
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0156",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "expression-parse-error",
        "frameworkErrorCode": "AUR0156",
        "frameworkRawErrorAuthority": null,
        "missingInput": "expression-parse:AUR0156",
        "missingInputs": [
          "expression-parse:AUR0156"
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
      "message": "Unexpected token after end of expression.",
      "range": {
        "end": {
          "character": 81,
          "line": 17
        },
        "start": {
          "character": 80,
          "line": 17
        }
      },
      "rangeText": "|",
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
      "message": "Value converter 'missingConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 57,
          "line": 18
        },
        "start": {
          "character": 41,
          "line": 18
        }
      },
      "rangeText": "missingConverter",
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
      "message": "Value converter 'missingConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 96,
          "line": 19
        },
        "start": {
          "character": 80,
          "line": 19
        }
      },
      "rangeText": "missingConverter",
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
      "message": "Value converter 'missingConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 86,
          "line": 20
        },
        "start": {
          "character": 70,
          "line": 20
        }
      },
      "rangeText": "missingConverter",
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
      "message": "Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 60,
          "line": 21
        },
        "start": {
          "character": 45,
          "line": 21
        }
      },
      "rangeText": "missingBehavior",
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
      "message": "Value converter 'missingInterpolationConverter' was not resolved through the current compiler resource scope.",
      "range": {
        "end": {
          "character": 92,
          "line": 23
        },
        "start": {
          "character": 63,
          "line": 23
        }
      },
      "rangeText": "missingInterpolationConverter",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
}
```
