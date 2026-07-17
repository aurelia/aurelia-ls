# template-spread-capture-semantics documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 29,
          "line": 1
        },
        "start": {
          "character": 18,
          "line": 1
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 3
        },
        "start": {
          "character": 30,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 45,
          "line": 4
        },
        "start": {
          "character": 34,
          "line": 4
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 5
        },
        "start": {
          "character": 30,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 50,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 76,
          "line": 6
        },
        "start": {
          "character": 65,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 101,
          "line": 6
        },
        "start": {
          "character": 90,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 43,
          "line": 13
        },
        "start": {
          "character": 32,
          "line": 13
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 8,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 29,
          "line": 1
        },
        "start": {
          "character": 18,
          "line": 1
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 41,
          "line": 3
        },
        "start": {
          "character": 30,
          "line": 3
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 45,
          "line": 4
        },
        "start": {
          "character": 34,
          "line": 4
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 41,
          "line": 5
        },
        "start": {
          "character": 30,
          "line": 5
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 50,
          "line": 6
        },
        "start": {
          "character": 39,
          "line": 6
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 76,
          "line": 6
        },
        "start": {
          "character": 65,
          "line": 6
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 101,
          "line": 6
        },
        "start": {
          "character": 90,
          "line": 6
        }
      },
      "rangeText": "spreadState"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 43,
          "line": 13
        },
        "start": {
          "character": 32,
          "line": 13
        }
      },
      "rangeText": "spreadState"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 31,
          "line": 7
        },
        "start": {
          "character": 27,
          "line": 7
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 55,
          "line": 7
        },
        "start": {
          "character": 51,
          "line": 7
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
          "character": 31,
          "line": 7
        },
        "start": {
          "character": 27,
          "line": 7
        }
      },
      "rangeText": "card"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 55,
          "line": 7
        },
        "start": {
          "character": 51,
          "line": 7
        }
      },
      "rangeText": "card"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 58,
          "line": 5
        },
        "start": {
          "character": 44,
          "line": 5
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
          "character": 58,
          "line": 5
        },
        "start": {
          "character": 44,
          "line": 5
        }
      },
      "rangeText": "spreadIdentity"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 29,
          "line": 18
        },
        "start": {
          "character": 16,
          "line": 18
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 45,
          "line": 39
        },
        "start": {
          "character": 32,
          "line": 39
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 49,
          "line": 41
        },
        "start": {
          "character": 36,
          "line": 41
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 3,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 29,
          "line": 18
        },
        "start": {
          "character": 16,
          "line": 18
        }
      },
      "rangeText": "capturedValue"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 45,
          "line": 39
        },
        "start": {
          "character": 32,
          "line": 39
        }
      },
      "rangeText": "capturedValue"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 49,
          "line": 41
        },
        "start": {
          "character": 36,
          "line": 41
        }
      },
      "rangeText": "capturedValue"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 14,
          "line": 23
        },
        "start": {
          "character": 4,
          "line": 23
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
          "character": 14,
          "line": 23
        },
        "start": {
          "character": 4,
          "line": 23
        }
      },
      "rangeText": "input-mark"
    }
  ]
}
```
