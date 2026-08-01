# template-ref-listener-semantics references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-ref-listener-semantics`
Probe file: `packages/lane-harness/probes/template-ref-listener-semantics.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## named-custom-attribute-ref-target

### Probe

```json
{
  "anchor": "focus-ring.ref=\"focusRingController\"",
  "at": "focus-ring",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:9:3",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 2,
    "line": 8
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 19,
          "line": 7
        },
        "start": {
          "character": 9,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/focus-ring.ts"
    },
    {
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 12,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 11,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "range": {
        "end": {
          "character": 27,
          "line": 12
        },
        "start": {
          "character": 17,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 5,
  "locations": [
    {
      "anomaly": null,
      "file": "src/focus-ring.ts",
      "range": {
        "end": {
          "character": 19,
          "line": 7
        },
        "start": {
          "character": 9,
          "line": 7
        }
      },
      "rangeText": "focus-ring",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/focus-ring.ts"
    },
    {
      "anomaly": null,
      "file": "src/template-ref-listener-semantics-app.html",
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "rangeText": "focus-ring",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-ref-listener-semantics-app.html",
      "range": {
        "end": {
          "character": 12,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "rangeText": "focus-ring",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-ref-listener-semantics-app.html",
      "range": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 11,
          "line": 12
        }
      },
      "rangeText": "focus",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    },
    {
      "anomaly": null,
      "file": "src/template-ref-listener-semantics-app.html",
      "range": {
        "end": {
          "character": 27,
          "line": 12
        },
        "start": {
          "character": 17,
          "line": 12
        }
      },
      "rangeText": "focus-ring",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/template-ref-listener-semantics-app.html"
    }
  ]
}
```
