# template-spread-capture-semantics definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...spreadState>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:19",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 18,
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
          "line": 27
        },
        "start": {
          "character": 2,
          "line": 27
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 13,
          "line": 27
        },
        "start": {
          "character": 2,
          "line": 27
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 13,
          "line": 27
        },
        "start": {
          "character": 2,
          "line": 27
        }
      },
      "rangeText": "spreadState",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## spread-inferred-member

### Probe

```json
{
  "anchor": "...spreadContainer.details",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:35",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 34,
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
          "character": 11,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 11,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 11,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "rangeText": "details",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## spread-repeat-local

### Probe

```json
{
  "anchor": "repeat.for=\"card of spreadCards\" ...card",
  "at": "card",
  "atOccurrence": 2,
  "displayPosition": "src/template-spread-capture-semantics-app.html:8:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
    "line": 7
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
          "character": 31,
          "line": 7
        },
        "start": {
          "character": 27,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 31,
          "line": 7
        },
        "start": {
          "character": 27,
          "line": 7
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
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
      "file": "src/template-spread-capture-semantics-app.html",
      "range": {
        "end": {
          "character": 31,
          "line": 7
        },
        "start": {
          "character": 27,
          "line": 7
        }
      },
      "rangeText": "card",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.html"
    }
  ]
}
```

## spread-value-converter-resource

### Probe

```json
{
  "anchor": "spreadState | spreadIdentity",
  "at": "spreadIdentity",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:6:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
    "line": 5
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
          "character": 41,
          "line": 25
        },
        "start": {
          "character": 13,
          "line": 25
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 41,
          "line": 25
        },
        "start": {
          "character": 13,
          "line": 25
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/spread-card.ts"
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
      "file": "src/spread-card.ts",
      "range": {
        "end": {
          "character": 41,
          "line": 25
        },
        "start": {
          "character": 13,
          "line": 25
        }
      },
      "rangeText": "SpreadIdentityValueConverter",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/spread-card.ts"
    }
  ]
}
```

## captured-expression-member

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:19:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 18
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
          "line": 62
        },
        "start": {
          "character": 2,
          "line": 62
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 15,
          "line": 62
        },
        "start": {
          "character": 2,
          "line": 62
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
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
      "file": "src/template-spread-capture-semantics-app.ts",
      "range": {
        "end": {
          "character": 15,
          "line": 62
        },
        "start": {
          "character": 2,
          "line": 62
        }
      },
      "rangeText": "capturedValue",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/template-spread-capture-semantics-app.ts"
    }
  ]
}
```

## receiver-local-custom-attribute

### Probe

```json
{
  "anchor": "input-mark=\"receiver-local-mark\"",
  "at": "input-mark",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:24:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 23
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
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "targetUri": "fixtures://pressure/template-spread-capture-semantics/src/capture-resources.ts"
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
      "file": "src/capture-resources.ts",
      "range": {
        "end": {
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "rangeText": "InputMark",
      "uri": "fixtures://pressure/template-spread-capture-semantics/src/capture-resources.ts"
    }
  ]
}
```
