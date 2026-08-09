# fetch-client-config-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/fetch-client-config-errors`
Probe file: `packages/lane-harness/probes/fetch-client-config-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## fetch-client-app-source

### Probe

```json
{
  "file": "src/fetch-client-config-errors-app.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 8,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "AUR5002",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-config",
        "frameworkErrorCode": "AUR5002",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
      "range": {
        "end": {
          "character": 35,
          "line": 29
        },
        "start": {
          "character": 26,
          "line": 29
        }
      },
      "rangeText": "42 as any",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5001",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-return",
        "frameworkErrorCode": "AUR5001",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) callback returned a statically closed non-object value.",
      "range": {
        "end": {
          "character": 33,
          "line": 30
        },
        "start": {
          "character": 32,
          "line": 30
        }
      },
      "rangeText": "1",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5003",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-header",
        "frameworkErrorCode": "AUR5003",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.",
      "range": {
        "end": {
          "character": 50,
          "line": 31
        },
        "start": {
          "character": 37,
          "line": 31
        }
      },
      "rangeText": "new Headers()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5004",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "more-than-one-retry-interceptor",
        "frameworkErrorCode": "AUR5004",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) statically configures more than one RetryInterceptor.",
      "range": {
        "end": {
          "character": 89,
          "line": 33
        },
        "start": {
          "character": 67,
          "line": 33
        }
      },
      "rangeText": "new RetryInterceptor()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5005",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-not-last",
        "frameworkErrorCode": "AUR5005",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.",
      "range": {
        "end": {
          "character": 54,
          "line": 34
        },
        "start": {
          "character": 36,
          "line": 34
        }
      },
      "rangeText": "config.withRetry()",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5007",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-invalid-exponential-interval",
        "frameworkErrorCode": "AUR5007",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "retry-interceptor-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "RetryInterceptor exponential strategy uses an interval less than or equal to one second.",
      "range": {
        "end": {
          "character": 106,
          "line": 35
        },
        "start": {
          "character": 102,
          "line": 35
        }
      },
      "rangeText": "1000",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5008",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "retry-interceptor-invalid-strategy",
        "frameworkErrorCode": "AUR5008",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "retry-interceptor-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.",
      "range": {
        "end": {
          "character": 67,
          "line": 36
        },
        "start": {
          "character": 65,
          "line": 36
        }
      },
      "rangeText": "42",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR5002",
      "data": {
        "diagnosticAuthority": "framework-runtime-behavior",
        "diagnosticDomain": "fetch-client",
        "diagnosticKind": "configure-invalid-config",
        "frameworkErrorCode": "AUR5002",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "http-client-configuration",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "fetch-client-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.",
      "range": {
        "end": {
          "character": 61,
          "line": 37
        },
        "start": {
          "character": 52,
          "line": 37
        }
      },
      "rangeText": "42 as any",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
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
  "uri": "fixtures://pressure/fetch-client-config-errors/src/fetch-client-config-errors-app.ts"
}
```
