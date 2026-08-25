# template-spread-capture-semantics documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 1
        },
        "start": {
          "character": 30,
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
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 30,
          "line": 4
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 45,
          "line": 5
        },
        "start": {
          "character": 34,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 41,
          "line": 6
        },
        "start": {
          "character": 30,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 50,
          "line": 7
        },
        "start": {
          "character": 39,
          "line": 7
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 76,
          "line": 7
        },
        "start": {
          "character": 65,
          "line": 7
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 101,
          "line": 7
        },
        "start": {
          "character": 90,
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
  "highlightCount": 8,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 41,
          "line": 1
        },
        "start": {
          "character": 30,
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
          "character": 41,
          "line": 4
        },
        "start": {
          "character": 30,
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
          "character": 45,
          "line": 5
        },
        "start": {
          "character": 34,
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
          "character": 41,
          "line": 6
        },
        "start": {
          "character": 30,
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
          "character": 50,
          "line": 7
        },
        "start": {
          "character": 39,
          "line": 7
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
          "line": 7
        },
        "start": {
          "character": 65,
          "line": 7
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
          "line": 7
        },
        "start": {
          "character": 90,
          "line": 7
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:9:52",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 51,
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
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 55,
          "line": 8
        },
        "start": {
          "character": 51,
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
          "character": 31,
          "line": 8
        },
        "start": {
          "character": 27,
          "line": 8
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
          "line": 8
        },
        "start": {
          "character": 51,
          "line": 8
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:7:45",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 44,
    "line": 6
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
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
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
          "line": 6
        },
        "start": {
          "character": 44,
          "line": 6
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:31:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 30
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
          "line": 30
        },
        "start": {
          "character": 16,
          "line": 30
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 45,
          "line": 51
        },
        "start": {
          "character": 32,
          "line": 51
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 49,
          "line": 53
        },
        "start": {
          "character": 36,
          "line": 53
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
          "line": 30
        },
        "start": {
          "character": 16,
          "line": 30
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
          "line": 51
        },
        "start": {
          "character": 32,
          "line": 51
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
          "line": 53
        },
        "start": {
          "character": 36,
          "line": 53
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
  "displayPosition": "src/template-spread-capture-semantics-app.html:36:5",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
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
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
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
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
        }
      },
      "rangeText": "input-mark"
    }
  ]
}
```
