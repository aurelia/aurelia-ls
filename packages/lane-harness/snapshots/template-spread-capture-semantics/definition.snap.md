# template-spread-capture-semantics definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-member

### Probe

```json
{
  "anchor": "<spread-card ...$bindables='spreadState'>",
  "at": "spreadState",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:2:31",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 30,
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
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 13,
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
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
          "line": 35
        },
        "start": {
          "character": 2,
          "line": 35
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
  "anchor": "...$bindables='spreadContainer.details'",
  "at": "details",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:3:47",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 46,
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
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 11,
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
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
          "line": 42
        },
        "start": {
          "character": 4,
          "line": 42
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:9:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
    "line": 8
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
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
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
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:7:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
    "line": 6
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
          "line": 33
        },
        "start": {
          "character": 13,
          "line": 33
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 41,
          "line": 33
        },
        "start": {
          "character": 13,
          "line": 33
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
          "line": 33
        },
        "start": {
          "character": 13,
          "line": 33
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:31:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 30
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
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 15,
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
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
          "line": 84
        },
        "start": {
          "character": 2,
          "line": 84
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:36:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
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
