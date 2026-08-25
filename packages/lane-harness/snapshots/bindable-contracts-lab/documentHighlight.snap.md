# bindable-contracts-lab documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/bindable-contracts-lab`
Probe file: `packages/lane-harness/probes/bindable-contracts-lab.probes.json`
Lane: `documentHighlight`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## element-alias-owner-isolation

### Probe

```json
{
  "anchor": "display-label.bind=\"aliasLabel\"",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:4:5",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 4,
    "line": 3
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
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 51,
          "line": 14
        },
        "start": {
          "character": 38,
          "line": 14
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
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "rangeText": "display-label"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 51,
          "line": 14
        },
        "start": {
          "character": 38,
          "line": 14
        }
      },
      "rangeText": "display-label"
    }
  ]
}
```

## inline-alias-owner-isolation

### Probe

```json
{
  "anchor": "display-hint=\"message.bind: statusMessage; display-label.bind: aliasLabel",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:17:55",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 54,
    "line": 16
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
          "character": 67,
          "line": 16
        },
        "start": {
          "character": 54,
          "line": 16
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 1,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 67,
          "line": 16
        },
        "start": {
          "character": 54,
          "line": 16
        }
      },
      "rangeText": "display-label"
    }
  ]
}
```
