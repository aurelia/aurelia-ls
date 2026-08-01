# template-typechecking-corpus references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-typechecking-corpus`
Probe file: `packages/lane-harness/probes/template-typechecking-corpus.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## unknown-member-concrete-candidate-honesty

### Probe

```json
{
  "anchor": "class=\"unknown-invalid\">${unknownValue.label}",
  "at": "label",
  "atOccurrence": 1,
  "displayPosition": "src/read-expressions.html:6:45",
  "file": "src/read-expressions.html",
  "lspPosition": {
    "character": 44,
    "line": 5
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
          "character": 49,
          "line": 5
        },
        "start": {
          "character": 44,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 1,
  "notifications": [
    {
      "jsonrpc": "2.0",
      "method": "window/showMessage",
      "params": {
        "message": "Aurelia found 1 verified reference; 1 same-name usage could not be verified.",
        "type": 3
      }
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/read-expressions.html",
      "range": {
        "end": {
          "character": 49,
          "line": 5
        },
        "start": {
          "character": 44,
          "line": 5
        }
      },
      "rangeText": "label",
      "uri": "fixtures://pressure/template-typechecking-corpus/src/read-expressions.html"
    }
  ]
}
```
