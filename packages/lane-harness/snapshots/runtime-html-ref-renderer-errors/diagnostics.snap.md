# runtime-html-ref-renderer-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-html-ref-renderer-errors`
Probe file: `packages/lane-harness/probes/runtime-html-ref-renderer-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## runtime-renderer-ref-template

### Probe

```json
{
  "file": "src/runtime-html-ref-renderer-errors-app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 4,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR0750",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0750",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0750",
        "missingInputs": [
          "runtime-renderer:AUR0750"
        ],
        "phase": "render",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 46,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@42..46",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 42
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime renderer AUR0750 rejects this instruction input: view.ref is not supported by runtime-html..",
      "range": {
        "end": {
          "character": 9,
          "line": 1
        },
        "start": {
          "character": 5,
          "line": 1
        }
      },
      "rangeText": "view",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0762",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0762",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0762",
        "missingInputs": [
          "runtime-renderer:AUR0762"
        ],
        "phase": "render",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 86,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@76..86",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 76
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime renderer AUR0762 rejects this instruction input: controller.ref requires a custom element or containerless host..",
      "range": {
        "end": {
          "character": 15,
          "line": 2
        },
        "start": {
          "character": 5,
          "line": 2
        }
      },
      "rangeText": "controller",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0763",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0763",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0763",
        "missingInputs": [
          "runtime-renderer:AUR0763"
        ],
        "phase": "render",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 129,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@124..129",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 124
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime renderer AUR0763 rejects this instruction input: Ref target 'ghost' could not fall back to a custom element controller because the ref host is not a custom element..",
      "range": {
        "end": {
          "character": 10,
          "line": 3
        },
        "start": {
          "character": 5,
          "line": 3
        }
      },
      "rangeText": "ghost",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0751",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-renderer-framework-error",
        "frameworkErrorCode": "AUR0751",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-renderer:AUR0751",
        "missingInputs": [
          "runtime-renderer:AUR0751"
        ],
        "phase": "render",
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "template",
        "subject": {
          "source": {
            "end": 311,
            "kind": "source-span-address",
            "label": "src/runtime-html-ref-renderer-errors-app.html@306..311",
            "path": "src/runtime-html-ref-renderer-errors-app.html",
            "role": "name",
            "start": 306
          },
          "span": null,
          "subjectKind": "template-syntax",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Aurelia runtime renderer AUR0751 rejects this instruction input: Ref target 'ghost' was not found amongst the target API..",
      "range": {
        "end": {
          "character": 24,
          "line": 6
        },
        "start": {
          "character": 19,
          "line": 6
        }
      },
      "rangeText": "ghost",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
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
  "uri": "fixtures://pressure/runtime-html-ref-renderer-errors/src/runtime-html-ref-renderer-errors-app.html"
}
```
