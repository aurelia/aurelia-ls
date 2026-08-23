# template-ref-listener-semantics documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-ref-listener-semantics`
Probe file: `packages/lane-harness/probes/template-ref-listener-semantics.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 12,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 11,
          "line": 12
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 27,
          "line": 12
        },
        "start": {
          "character": 17,
          "line": 12
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 4,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "focus-ring"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "focus-ring"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "focus"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "focus-ring"
    }
  ]
}
```
