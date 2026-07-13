# template-local-template-semantics definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-resource-use-before-declaration

### Probe

```json
{
  "anchor": "<mode-panel\n    one-time-value.bind",
  "at": "mode-panel",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:2:4",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 3,
    "line": 1
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 13,
          "line": 51
        },
        "start": {
          "character": 2,
          "line": 22
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
        }
      },
      "targetUri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
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
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 22
        },
        "start": {
          "character": 31,
          "line": 22
        }
      },
      "rangeText": "mode-panel",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## local-bindable-property-use

### Probe

```json
{
  "anchor": "<h2>${oneTimeValue}</h2>",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:34:13",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 12,
    "line": 33
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "targetUri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
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
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 32,
          "line": 23
        },
        "start": {
          "character": 20,
          "line": 23
        }
      },
      "rangeText": "oneTimeValue",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## local-bindable-alias-use

### Probe

```json
{
  "anchor": "one-time-value.bind=\"oneTimeValue\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:3:5",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 2
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 87,
          "line": 23
        },
        "start": {
          "character": 4,
          "line": 23
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
          "line": 23
        }
      },
      "targetUri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
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
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 59,
          "line": 23
        },
        "start": {
          "character": 45,
          "line": 23
        }
      },
      "rangeText": "one-time-value",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```

## nested-local-resource

### Probe

```json
{
  "anchor": "<nested-note note.bind",
  "at": "nested-note",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:41:8",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 7,
    "line": 40
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 15,
          "line": 50
        },
        "start": {
          "character": 4,
          "line": 47
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 44,
          "line": 47
        },
        "start": {
          "character": 33,
          "line": 47
        }
      },
      "targetUri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
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
      "file": "src/template-local-template-semantics-app.html",
      "range": {
        "end": {
          "character": 44,
          "line": 47
        },
        "start": {
          "character": 33,
          "line": 47
        }
      },
      "rangeText": "nested-note",
      "uri": "fixtures://pressure/template-local-template-semantics/src/template-local-template-semantics-app.html"
    }
  ]
}
```
