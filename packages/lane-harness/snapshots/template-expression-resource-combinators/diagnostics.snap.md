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

### publishDiagnostics

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
      "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression.",
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
      "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration.",
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
      "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression.",
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
      "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
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
      "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
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
      "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
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
      "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
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
      "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole.",
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
      "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern.",
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
      "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
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
      "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
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
      "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions.",
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
      "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
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
      "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
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
      "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression.",
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
      "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions.",
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
      "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain.",
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
      "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal.",
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
      "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal.",
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
      "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list.",
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
      "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression.",
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
      "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported.",
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
      "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported.",
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
      "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list.",
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
      "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported.",
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
  "outcome": "published",
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
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
        "groupKey": "row:diagnostic:21:template:expression-parse-error:framework-error-code:AUR0167:src/invalid-expression-gallery.html:79:79:expression-parse:AUR0167",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0167",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression."
              }
            ],
            "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 79,
              "start": 79
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:21:template:expression-parse-error:framework-error-code:AUR0167:src/invalid-expression-gallery.html:79:79:expression-parse:AUR0167"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:expression-parse-error:framework-error-code:AUR0151:src/invalid-expression-gallery.html:133:133:expression-parse:AUR0151",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0151",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration."
              }
            ],
            "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 133,
              "start": 133
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:expression-parse-error:framework-error-code:AUR0151:src/invalid-expression-gallery.html:133:133:expression-parse:AUR0151"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:12:template:expression-parse-error:framework-error-code:AUR0155:src/invalid-expression-gallery.html:212:212:expression-parse:AUR0155",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0155",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression."
              }
            ],
            "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 212,
              "start": 212
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:12:template:expression-parse-error:framework-error-code:AUR0155:src/invalid-expression-gallery.html:212:212:expression-parse:AUR0155"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:13:template:expression-parse-error:framework-error-code:AUR0159:src/invalid-expression-gallery.html:271:271:expression-parse:AUR0159",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0159",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
              }
            ],
            "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 271,
              "start": 271
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:13:template:expression-parse-error:framework-error-code:AUR0159:src/invalid-expression-gallery.html:271:271:expression-parse:AUR0159"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:14:template:expression-parse-error:framework-error-code:AUR0159:src/invalid-expression-gallery.html:323:324:expression-parse:AUR0159",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0159",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
              }
            ],
            "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 324,
              "start": 323
            },
            "spanText": "1",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:14:template:expression-parse-error:framework-error-code:AUR0159:src/invalid-expression-gallery.html:323:324:expression-parse:AUR0159"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:15:template:expression-parse-error:framework-error-code:AUR0160:src/invalid-expression-gallery.html:374:374:expression-parse:AUR0160",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0160",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
              }
            ],
            "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 374,
              "start": 374
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:15:template:expression-parse-error:framework-error-code:AUR0160:src/invalid-expression-gallery.html:374:374:expression-parse:AUR0160"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:16:template:expression-parse-error:framework-error-code:AUR0160:src/invalid-expression-gallery.html:425:426:expression-parse:AUR0160",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0160",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
              }
            ],
            "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 426,
              "start": 425
            },
            "spanText": "1",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:16:template:expression-parse-error:framework-error-code:AUR0160:src/invalid-expression-gallery.html:425:426:expression-parse:AUR0160"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:17:template:expression-parse-error:semantic-authoring-policy:no-framework-code:src/invalid-expression-gallery.html:493:493:expression-parse:unmapped",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "expression-parse-error",
                "kind": "expression-parse-error",
                "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole."
              }
            ],
            "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 493,
              "start": 493
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:17:template:expression-parse-error:semantic-authoring-policy:no-framework-code:src/invalid-expression-gallery.html:493:493:expression-parse:unmapped"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:18:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:561:562:expression-parse:AUR0170",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0170",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern."
              }
            ],
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 562,
              "start": 561
            },
            "spanText": "=",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:18:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:561:562:expression-parse:AUR0170"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:19:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:644:647:expression-parse:AUR0170",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0170",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
              }
            ],
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 647,
              "start": 644
            },
            "spanText": "...",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:19:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:644:647:expression-parse:AUR0170"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:20:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:729:730:expression-parse:AUR0170",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0170",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
              }
            ],
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 730,
              "start": 729
            },
            "spanText": "[",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:20:template:expression-parse-error:framework-error-code:AUR0170:src/invalid-expression-gallery.html:729:730:expression-parse:AUR0170"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:22:template:expression-parse-error:framework-error-code:AUR0152:src/invalid-expression-gallery.html:811:814:expression-parse:AUR0152",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0152",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions."
              }
            ],
            "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 814,
              "start": 811
            },
            "spanText": "...",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:22:template:expression-parse-error:framework-error-code:AUR0152:src/invalid-expression-gallery.html:811:814:expression-parse:AUR0152"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:23:template:expression-parse-error:framework-error-code:AUR0158:src/invalid-expression-gallery.html:892:893:expression-parse:AUR0158",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0158",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
              }
            ],
            "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 893,
              "start": 892
            },
            "spanText": "=",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:23:template:expression-parse-error:framework-error-code:AUR0158:src/invalid-expression-gallery.html:892:893:expression-parse:AUR0158"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:24:template:expression-parse-error:framework-error-code:AUR0158:src/invalid-expression-gallery.html:988:989:expression-parse:AUR0158",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0158",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
              }
            ],
            "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 989,
              "start": 988
            },
            "spanText": "=",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:24:template:expression-parse-error:framework-error-code:AUR0158:src/invalid-expression-gallery.html:988:989:expression-parse:AUR0158"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:expression-parse-error:framework-error-code:AUR0161:src/invalid-expression-gallery.html:1055:1057:expression-parse:AUR0161",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0161",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression."
              }
            ],
            "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1057,
              "start": 1055
            },
            "spanText": "of",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:expression-parse-error:framework-error-code:AUR0161:src/invalid-expression-gallery.html:1055:1057:expression-parse:AUR0161"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:expression-parse-error:framework-error-code:AUR0162:src/invalid-expression-gallery.html:1123:1129:expression-parse:AUR0162",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0162",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions."
              }
            ],
            "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1129,
              "start": 1123
            },
            "spanText": "import",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:expression-parse-error:framework-error-code:AUR0162:src/invalid-expression-gallery.html:1123:1129:expression-parse:AUR0162"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:expression-parse-error:framework-error-code:AUR0172:src/invalid-expression-gallery.html:1220:1221:expression-parse:AUR0172",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0172",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain."
              }
            ],
            "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1221,
              "start": 1220
            },
            "spanText": "`",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:expression-parse-error:framework-error-code:AUR0172:src/invalid-expression-gallery.html:1220:1221:expression-parse:AUR0172"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:template:expression-parse-error:framework-error-code:AUR0165:src/invalid-expression-gallery.html:1284:1290:expression-parse:AUR0165",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0165",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal."
              }
            ],
            "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1290,
              "start": 1284
            },
            "spanText": "'label",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:expression-parse-error:framework-error-code:AUR0165:src/invalid-expression-gallery.html:1284:1290:expression-parse:AUR0165"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:template:expression-parse-error:framework-error-code:AUR0166:src/invalid-expression-gallery.html:1350:1350:expression-parse:AUR0166",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0166",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal."
              }
            ],
            "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1350,
              "start": 1350
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:expression-parse-error:framework-error-code:AUR0166:src/invalid-expression-gallery.html:1350:1350:expression-parse:AUR0166"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:expression-parse-error:framework-error-code:AUR0167:src/invalid-expression-gallery.html:1413:1413:expression-parse:AUR0167",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0167",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list."
              }
            ],
            "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1413,
              "start": 1413
            },
            "spanText": "",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:expression-parse-error:framework-error-code:AUR0167:src/invalid-expression-gallery.html:1413:1413:expression-parse:AUR0167"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:template:expression-parse-error:framework-error-code:AUR0168:src/invalid-expression-gallery.html:1466:1467:expression-parse:AUR0168",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0168",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression."
              }
            ],
            "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1467,
              "start": 1466
            },
            "spanText": "#",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:expression-parse-error:framework-error-code:AUR0168:src/invalid-expression-gallery.html:1466:1467:expression-parse:AUR0168"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:8:template:expression-parse-error:framework-error-code:AUR0174:src/invalid-expression-gallery.html:1547:1549:expression-parse:AUR0174",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0174",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported."
              }
            ],
            "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1549,
              "start": 1547
            },
            "spanText": "=>",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:expression-parse-error:framework-error-code:AUR0174:src/invalid-expression-gallery.html:1547:1549:expression-parse:AUR0174"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:9:template:expression-parse-error:framework-error-code:AUR0175:src/invalid-expression-gallery.html:1639:1641:expression-parse:AUR0175",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0175",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported."
              }
            ],
            "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1641,
              "start": 1639
            },
            "spanText": "=>",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:expression-parse-error:framework-error-code:AUR0175:src/invalid-expression-gallery.html:1639:1641:expression-parse:AUR0175"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:10:template:expression-parse-error:framework-error-code:AUR0176:src/invalid-expression-gallery.html:1723:1724:expression-parse:AUR0176",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0176",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list."
              }
            ],
            "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1724,
              "start": 1723
            },
            "spanText": ",",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:10:template:expression-parse-error:framework-error-code:AUR0176:src/invalid-expression-gallery.html:1723:1724:expression-parse:AUR0176"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:11:template:expression-parse-error:framework-error-code:AUR0178:src/invalid-expression-gallery.html:1811:1812:expression-parse:AUR0178",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/invalid-expression-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0178",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported."
              }
            ],
            "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1812,
              "start": 1811
            },
            "spanText": "{",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:11:template:expression-parse-error:framework-error-code:AUR0178:src/invalid-expression-gallery.html:1811:1812:expression-parse:AUR0178"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 25,
    "rawRowCount": 25
  },
  "raw": {
    "diagnosticCount": 25,
    "diagnostics": [
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0161",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression."
          }
        ],
        "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1057,
          "start": 1055
        },
        "spanText": "of",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0162",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions."
          }
        ],
        "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1129,
          "start": 1123
        },
        "spanText": "import",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0172",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain."
          }
        ],
        "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1221,
          "start": 1220
        },
        "spanText": "`",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0165",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal."
          }
        ],
        "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1290,
          "start": 1284
        },
        "spanText": "'label",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0151",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration."
          }
        ],
        "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 133,
          "start": 133
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0166",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal."
          }
        ],
        "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1350,
          "start": 1350
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0167",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list."
          }
        ],
        "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1413,
          "start": 1413
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0168",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression."
          }
        ],
        "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1467,
          "start": 1466
        },
        "spanText": "#",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0174",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported."
          }
        ],
        "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1549,
          "start": 1547
        },
        "spanText": "=>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0175",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported."
          }
        ],
        "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1641,
          "start": 1639
        },
        "spanText": "=>",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0176",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list."
          }
        ],
        "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1724,
          "start": 1723
        },
        "spanText": ",",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0178",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported."
          }
        ],
        "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1812,
          "start": 1811
        },
        "spanText": "{",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0155",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression."
          }
        ],
        "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 212,
          "start": 212
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0159",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
          }
        ],
        "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 271,
          "start": 271
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0159",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
          }
        ],
        "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 324,
          "start": 323
        },
        "spanText": "1",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0160",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
          }
        ],
        "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 374,
          "start": 374
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0160",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
          }
        ],
        "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 426,
          "start": 425
        },
        "spanText": "1",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "expression-parse-error",
            "kind": "expression-parse-error",
            "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole."
          }
        ],
        "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 493,
          "start": 493
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0170",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern."
          }
        ],
        "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 562,
          "start": 561
        },
        "spanText": "=",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0170",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
          }
        ],
        "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 647,
          "start": 644
        },
        "spanText": "...",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0170",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
          }
        ],
        "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 730,
          "start": 729
        },
        "spanText": "[",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0167",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression."
          }
        ],
        "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 79,
          "start": 79
        },
        "spanText": "",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0152",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions."
          }
        ],
        "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 814,
          "start": 811
        },
        "spanText": "...",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0158",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
          }
        ],
        "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 893,
          "start": 892
        },
        "spanText": "=",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/invalid-expression-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0158",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
          }
        ],
        "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 989,
          "start": 988
        },
        "spanText": "=",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 25,
      "diagnostics": [
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0167",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression."
            }
          ],
          "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ':' in conditional expression.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 79,
            "start": 79
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0151",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration."
            }
          ],
          "message": "Aurelia expression parser AUR0151 rejects this template expression: Expected iterator declaration.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 133,
            "start": 133
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0155",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression."
            }
          ],
          "message": "Aurelia expression parser AUR0155 rejects this template expression: Unexpected token EOF in primary expression.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 212,
            "start": 212
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0159",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
            }
          ],
          "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 271,
            "start": 271
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0159",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'."
            }
          ],
          "message": "Aurelia expression parser AUR0159 rejects this template expression: Expected identifier after '|'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 324,
            "start": 323
          },
          "spanText": "1",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0160",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
            }
          ],
          "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 374,
            "start": 374
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0160",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'."
            }
          ],
          "message": "Aurelia expression parser AUR0160 rejects this template expression: Expected identifier after '&'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 426,
            "start": 425
          },
          "spanText": "1",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "expression-parse-error",
              "kind": "expression-parse-error",
              "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole."
            }
          ],
          "message": "The expression parser rejected this template expression: Expected '}' to close interpolation hole.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 493,
            "start": 493
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0170",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern."
            }
          ],
          "message": "Aurelia expression parser AUR0170 rejects this template expression: Expected ',' or ']' in array binding pattern.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 562,
            "start": 561
          },
          "spanText": "=",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0170",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
            }
          ],
          "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 647,
            "start": 644
          },
          "spanText": "...",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0170",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only."
            }
          ],
          "message": "Aurelia expression parser AUR0170 rejects this template expression: Array repeat declarations support identifiers and holes only.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 730,
            "start": 729
          },
          "spanText": "[",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0152",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions."
            }
          ],
          "message": "Aurelia expression parser AUR0152 rejects this template expression: Spread syntax is not supported in binding expressions.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 814,
            "start": 811
          },
          "spanText": "...",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0158",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
            }
          ],
          "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 893,
            "start": 892
          },
          "spanText": "=",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0158",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable."
            }
          ],
          "message": "Aurelia expression parser AUR0158 rejects this template expression: Left-hand side is not assignable.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 989,
            "start": 988
          },
          "spanText": "=",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0161",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression."
            }
          ],
          "message": "Aurelia expression parser AUR0161 rejects this template expression: Unexpected token after end of expression.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1057,
            "start": 1055
          },
          "spanText": "of",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0162",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions."
            }
          ],
          "message": "Aurelia expression parser AUR0162 rejects this template expression: Bare 'import' is not allowed in binding expressions.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1129,
            "start": 1123
          },
          "spanText": "import",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0172",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain."
            }
          ],
          "message": "Aurelia expression parser AUR0172 rejects this template expression: Invalid tagged template on optional chain.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1221,
            "start": 1220
          },
          "spanText": "`",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0165",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal."
            }
          ],
          "message": "Aurelia expression parser AUR0165 rejects this template expression: Unterminated string literal.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1290,
            "start": 1284
          },
          "spanText": "'label",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0166",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal."
            }
          ],
          "message": "Aurelia expression parser AUR0166 rejects this template expression: Unterminated template literal.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1350,
            "start": 1350
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0167",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list."
            }
          ],
          "message": "Aurelia expression parser AUR0167 rejects this template expression: Expected ',' or ')' in argument list.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1413,
            "start": 1413
          },
          "spanText": "",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0168",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression."
            }
          ],
          "message": "Aurelia expression parser AUR0168 rejects this template expression: Unexpected character in binding expression.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1467,
            "start": 1466
          },
          "spanText": "#",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0174",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported."
            }
          ],
          "message": "Aurelia expression parser AUR0174 rejects this template expression: Arrow function default parameters are not supported.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1549,
            "start": 1547
          },
          "spanText": "=>",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0175",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported."
            }
          ],
          "message": "Aurelia expression parser AUR0175 rejects this template expression: Arrow function destructuring parameters are not supported.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1641,
            "start": 1639
          },
          "spanText": "=>",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0176",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list."
            }
          ],
          "message": "Aurelia expression parser AUR0176 rejects this template expression: Rest parameter must be last in arrow parameter list.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1724,
            "start": 1723
          },
          "spanText": ",",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/invalid-expression-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0178",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported."
            }
          ],
          "message": "Aurelia expression parser AUR0178 rejects this template expression: Arrow function bodies are not supported.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1812,
            "start": 1811
          },
          "spanText": "{",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/invalid-expression-gallery.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 25,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 25,
  "suppressedCount": 0
}
```

## resource-lifecycle-and-argument-errors

### Probe

```json
{
  "file": "src/resource-combinator-gallery.html"
}
```

### publishDiagnostics

```json
{
  "diagnosticCount": 12,
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
            "end": 675,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@670..675",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 670
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
          "character": 76,
          "line": 9
        },
        "start": {
          "character": 71,
          "line": 9
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
            "end": 683,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@676..683",
            "path": "src/resource-combinator-gallery.html",
            "role": "typescript-overlay:semantic",
            "start": 676
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
      "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
      "range": {
        "end": {
          "character": 84,
          "line": 9
        },
        "start": {
          "character": 77,
          "line": 9
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
            "end": 773,
            "kind": "source-span-address",
            "label": "src/resource-combinator-gallery.html@761..773",
            "path": "src/resource-combinator-gallery.html",
            "role": "name",
            "start": 761
          },
          "span": null,
          "subjectKind": "template-expression",
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
      "message": "Template expression root \"missingLabel\" is not available on the current binding scope.",
      "range": {
        "end": {
          "character": 84,
          "line": 10
        },
        "start": {
          "character": 72,
          "line": 10
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
      "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding..",
      "range": {
        "end": {
          "character": 57,
          "line": 12
        },
        "start": {
          "character": 47,
          "line": 12
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 100,
          "line": 13
        },
        "start": {
          "character": 85,
          "line": 13
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 92,
          "line": 14
        },
        "start": {
          "character": 77,
          "line": 14
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
      "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression.",
      "range": {
        "end": {
          "character": 81,
          "line": 15
        },
        "start": {
          "character": 80,
          "line": 15
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
      "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 57,
          "line": 16
        },
        "start": {
          "character": 41,
          "line": 16
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
      "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 96,
          "line": 17
        },
        "start": {
          "character": 80,
          "line": 17
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
      "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
      "range": {
        "end": {
          "character": 60,
          "line": 18
        },
        "start": {
          "character": 45,
          "line": 18
        }
      },
      "rangeText": "missingBehavior",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "groupKey": "row:diagnostic:3:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:131:136:typescript:TS2345",
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
              "sourceRole": null,
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-combinator-gallery.html",
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
              "end": 136,
              "start": 131
            },
            "spanText": "count",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:131:136:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 136,
            "start": 131
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      },
      {
        "groupKey": "row:diagnostic:7:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:216:221:typescript:TS2345",
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
              "sourceRole": null,
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
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-combinator-gallery.html",
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
              "end": 221,
              "start": 216
            },
            "spanText": "limit",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:216:221:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 221,
            "start": 216
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      },
      {
        "groupKey": "row:diagnostic:8:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:670:675:typescript:TS2345",
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
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 675,
                  "kind": "source-span-address",
                  "label": "src/resource-combinator-gallery.html@670..675",
                  "path": "src/resource-combinator-gallery.html",
                  "role": "typescript-overlay:semantic",
                  "start": 670
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
            "file": "src/resource-combinator-gallery.html",
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
              "end": 675,
              "start": 670
            },
            "spanText": "limit",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:670:675:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 675,
            "start": 670
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      },
      {
        "groupKey": "row:diagnostic:9:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:676:683:typescript:TS2345",
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
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 683,
                  "kind": "source-span-address",
                  "label": "src/resource-combinator-gallery.html@676..683",
                  "path": "src/resource-combinator-gallery.html",
                  "role": "typescript-overlay:semantic",
                  "start": 676
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2345",
                "kind": "template-expression-typescript-diagnostic",
                "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
              }
            ],
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 683,
              "start": 676
            },
            "spanText": "'wrong'",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:template:template-expression-typescript-diagnostic:typescript:no-framework-code:src/resource-combinator-gallery.html:676:683:typescript:TS2345"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 683,
            "start": 676
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      },
      {
        "groupKey": "row:diagnostic:10:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/resource-combinator-gallery.html:761:773:expression-member:selected-member-missing",
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
              "sourceRole": null,
              "subject": {
                "source": {
                  "end": 773,
                  "kind": "source-span-address",
                  "label": "src/resource-combinator-gallery.html@761..773",
                  "path": "src/resource-combinator-gallery.html",
                  "role": "name",
                  "start": 761
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "missing-expression-member",
                "kind": "missing-expression-member",
                "message": "Template expression root \"missingLabel\" is not available on the current binding scope."
              }
            ],
            "message": "Template expression root \"missingLabel\" is not available on the current binding scope.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 773,
              "start": 761
            },
            "spanText": "missingLabel",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:10:template:missing-expression-member:semantic-authoring-policy:no-framework-code:src/resource-combinator-gallery.html:761:773:expression-member:selected-member-missing"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": {
          "source": null,
          "span": {
            "end": 773,
            "start": 761
          },
          "subjectKind": "template-expression",
          "uri": "file:///c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      },
      {
        "groupKey": "row:diagnostic:11:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0102:src/resource-combinator-gallery.html:926:936:runtime-binding-behavior:AUR0102",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0102",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 936,
              "start": 926
            },
            "spanText": "innerAudit",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:11:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0102:src/resource-combinator-gallery.html:926:936:runtime-binding-behavior:AUR0102"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1057:1072:runtime-binding-behavior:AUR0101",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1072,
              "start": 1057
            },
            "spanText": "missingBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1057:1072:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:1:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1155:1170:runtime-binding-behavior:AUR0101",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1170,
              "start": 1155
            },
            "spanText": "missingBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1155:1170:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:template:expression-parse-error:framework-error-code:AUR0156:src/resource-combinator-gallery.html:1256:1257:expression-parse:AUR0156",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0156",
                "kind": "expression-parse-error",
                "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression."
              }
            ],
            "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1257,
              "start": 1256
            },
            "spanText": "|",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:template:expression-parse-error:framework-error-code:AUR0156:src/resource-combinator-gallery.html:1256:1257:expression-parse:AUR0156"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-combinator-gallery.html:1322:1338:runtime-value-converter:AUR0103",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0103",
                "kind": "runtime-value-converter-framework-error",
                "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1338,
              "start": 1322
            },
            "spanText": "missingConverter",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-combinator-gallery.html:1322:1338:runtime-value-converter:AUR0103"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-combinator-gallery.html:1424:1440:runtime-value-converter:AUR0103",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0103",
                "kind": "runtime-value-converter-framework-error",
                "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1440,
              "start": 1424
            },
            "spanText": "missingConverter",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:template:runtime-value-converter-framework-error:framework-error-code:AUR0103:src/resource-combinator-gallery.html:1424:1440:runtime-value-converter:AUR0103"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1491:1506:runtime-binding-behavior:AUR0101",
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
            "file": "src/resource-combinator-gallery.html",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0101",
                "kind": "runtime-binding-behavior-framework-error",
                "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
              }
            ],
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1506,
              "start": 1491
            },
            "spanText": "missingBehavior",
            "status": "primary",
            "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:template:runtime-binding-behavior-framework-error:framework-error-code:AUR0101:src/resource-combinator-gallery.html:1491:1506:runtime-binding-behavior:AUR0101"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 12,
    "rawRowCount": 12
  },
  "raw": {
    "diagnosticCount": 12,
    "diagnostics": [
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1072,
          "start": 1057
        },
        "spanText": "missingBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1170,
          "start": 1155
        },
        "spanText": "missingBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0156",
            "kind": "expression-parse-error",
            "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression."
          }
        ],
        "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1257,
          "start": 1256
        },
        "spanText": "|",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "sourceRole": null,
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-combinator-gallery.html",
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
          "end": 136,
          "start": 131
        },
        "spanText": "count",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0103",
            "kind": "runtime-value-converter-framework-error",
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1338,
          "start": 1322
        },
        "spanText": "missingConverter",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0103",
            "kind": "runtime-value-converter-framework-error",
            "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1440,
          "start": 1424
        },
        "spanText": "missingConverter",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0101",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1506,
          "start": 1491
        },
        "spanText": "missingBehavior",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "sourceRole": null,
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
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-combinator-gallery.html",
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
          "end": 221,
          "start": 216
        },
        "spanText": "limit",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 675,
              "kind": "source-span-address",
              "label": "src/resource-combinator-gallery.html@670..675",
              "path": "src/resource-combinator-gallery.html",
              "role": "typescript-overlay:semantic",
              "start": 670
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
        "file": "src/resource-combinator-gallery.html",
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
          "end": 675,
          "start": 670
        },
        "spanText": "limit",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 683,
              "kind": "source-span-address",
              "label": "src/resource-combinator-gallery.html@676..683",
              "path": "src/resource-combinator-gallery.html",
              "role": "typescript-overlay:semantic",
              "start": 676
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2345",
            "kind": "template-expression-typescript-diagnostic",
            "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
          }
        ],
        "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 683,
          "start": 676
        },
        "spanText": "'wrong'",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "sourceRole": null,
          "subject": {
            "source": {
              "end": 773,
              "kind": "source-span-address",
              "label": "src/resource-combinator-gallery.html@761..773",
              "path": "src/resource-combinator-gallery.html",
              "role": "name",
              "start": 761
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "missing-expression-member",
            "kind": "missing-expression-member",
            "message": "Template expression root \"missingLabel\" is not available on the current binding scope."
          }
        ],
        "message": "Template expression root \"missingLabel\" is not available on the current binding scope.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 773,
          "start": 761
        },
        "spanText": "missingLabel",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
        "file": "src/resource-combinator-gallery.html",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0102",
            "kind": "runtime-binding-behavior-framework-error",
            "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding.."
          }
        ],
        "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 936,
          "start": 926
        },
        "spanText": "innerAudit",
        "status": "canonical",
        "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 12,
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
            "sourceRole": null,
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-combinator-gallery.html",
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
            "end": 136,
            "start": 131
          },
          "spanText": "count",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
            "sourceRole": null,
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
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-combinator-gallery.html",
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
            "end": 221,
            "start": 216
          },
          "spanText": "limit",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 675,
                "kind": "source-span-address",
                "label": "src/resource-combinator-gallery.html@670..675",
                "path": "src/resource-combinator-gallery.html",
                "role": "typescript-overlay:semantic",
                "start": 670
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
          "file": "src/resource-combinator-gallery.html",
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
            "end": 675,
            "start": 670
          },
          "spanText": "limit",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 683,
                "kind": "source-span-address",
                "label": "src/resource-combinator-gallery.html@676..683",
                "path": "src/resource-combinator-gallery.html",
                "role": "typescript-overlay:semantic",
                "start": 676
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2345",
              "kind": "template-expression-typescript-diagnostic",
              "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'."
            }
          ],
          "message": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 683,
            "start": 676
          },
          "spanText": "'wrong'",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
            "sourceRole": null,
            "subject": {
              "source": {
                "end": 773,
                "kind": "source-span-address",
                "label": "src/resource-combinator-gallery.html@761..773",
                "path": "src/resource-combinator-gallery.html",
                "role": "name",
                "start": 761
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "missing-expression-member",
              "kind": "missing-expression-member",
              "message": "Template expression root \"missingLabel\" is not available on the current binding scope."
            }
          ],
          "message": "Template expression root \"missingLabel\" is not available on the current binding scope.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 773,
            "start": 761
          },
          "spanText": "missingLabel",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0102",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0102 rejects this binding: Binding behavior 'innerAudit' is already applied to this binding..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 936,
            "start": 926
          },
          "spanText": "innerAudit",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1072,
            "start": 1057
          },
          "spanText": "missingBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1170,
            "start": 1155
          },
          "spanText": "missingBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0156",
              "kind": "expression-parse-error",
              "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression."
            }
          ],
          "message": "Aurelia expression parser AUR0156 rejects this template expression: Unexpected token after end of expression.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1257,
            "start": 1256
          },
          "spanText": "|",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0103",
              "kind": "runtime-value-converter-framework-error",
              "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1338,
            "start": 1322
          },
          "spanText": "missingConverter",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0103",
              "kind": "runtime-value-converter-framework-error",
              "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime value converter AUR0103 rejects this binding: Value converter 'missingConverter' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1440,
            "start": 1424
          },
          "spanText": "missingConverter",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
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
          "file": "src/resource-combinator-gallery.html",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0101",
              "kind": "runtime-binding-behavior-framework-error",
              "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope.."
            }
          ],
          "message": "Aurelia runtime binding behavior AUR0101 rejects this binding: Binding behavior 'missingBehavior' was not resolved through the current compiler resource scope..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1506,
            "start": 1491
          },
          "spanText": "missingBehavior",
          "status": "primary",
          "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 12,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 12,
  "suppressedCount": 0
}
```
