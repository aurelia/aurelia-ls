# observation-binding-lifecycle documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `documentHighlight`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inert-attribute-source-member

### Probe

```json
{
  "anchor": "data-lifecycle.attr=\"attributeFromView & fromView\"",
  "at": "attributeFromView",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:8:61",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 60,
    "line": 7
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
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 60,
          "line": 7
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 97,
          "line": 8
        },
        "start": {
          "character": 80,
          "line": 8
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 2,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 77,
          "line": 7
        },
        "start": {
          "character": 60,
          "line": 7
        }
      },
      "rangeText": "attributeFromView"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 97,
          "line": 8
        },
        "start": {
          "character": 80,
          "line": 8
        }
      },
      "rangeText": "attributeFromView"
    }
  ]
}
```
