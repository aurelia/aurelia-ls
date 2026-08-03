# template-spread-capture-semantics completions lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-spread-capture-semantics`
Probe file: `packages/lane-harness/probes/template-spread-capture-semantics.probes.json`
Lane: `completions`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## spread-root-scope

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

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "method": 2,
    "property": 21
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 23,
  "totalItems": 23
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | string | public"
      ],
      "edits": [
        "1:18..1:29 \"spreadState\" -> \"capturedValue\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "capturedValue"
    },
    {
      "details": [
        "binding-context-slot | (event: MouseEvent) => void | public"
      ],
      "edits": [
        "1:18..1:29 \"spreadState\" -> \"handleCaptured\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "method"
      ],
      "label": "handleCaptured"
    },
    {
      "details": [
        "binding-context-slot | SpreadCardState[] | public"
      ],
      "edits": [
        "1:18..1:29 \"spreadState\" -> \"spreadCards\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "spreadCards"
    },
    {
      "details": [
        "binding-context-slot | { details: { title: string; count: number; tone: string; internal: string; }; } | public"
      ],
      "edits": [
        "1:18..1:29 \"spreadState\" -> \"spreadContainer\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "spreadContainer"
    },
    {
      "details": [
        "binding-context-slot | SpreadCardState | public"
      ],
      "edits": [
        "1:18..1:29 \"spreadState\" -> \"spreadState\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "spreadState"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "card"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "count"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "title"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "tone"
    }
  ]
}
```

## spread-repeat-scope

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

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "keyword": 1,
    "method": 2,
    "property": 22,
    "variable": 8
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 33,
  "totalItems": 33
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | SpreadCardState"
      ],
      "edits": [
        "8:51..8:55 \"card\" -> \"card\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "card"
    },
    {
      "details": [
        "binding-context-slot | SpreadCardState | public"
      ],
      "edits": [
        "8:51..8:55 \"card\" -> \"spreadState\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "spreadState"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "count"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "title"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "tone"
    }
  ]
}
```

## captured-expression-scope

### Probe

```json
{
  "anchor": "value.bind=\"capturedValue\"",
  "at": "capturedValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-spread-capture-semantics-app.html:30:17",
  "file": "src/template-spread-capture-semantics-app.html",
  "lspPosition": {
    "character": 16,
    "line": 29
  },
  "occurrence": 1
}
```

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "method": 2,
    "property": 21
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 23,
  "totalItems": 23
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | string | public"
      ],
      "edits": [
        "29:16..29:29 \"capturedValue\" -> \"capturedValue\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "capturedValue"
    },
    {
      "details": [
        "binding-context-slot | (event: MouseEvent) => void | public"
      ],
      "edits": [
        "29:16..29:29 \"capturedValue\" -> \"handleCaptured\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "method"
      ],
      "label": "handleCaptured"
    },
    {
      "details": [
        "binding-context-slot | boolean | public"
      ],
      "edits": [
        "29:16..29:29 \"capturedValue\" -> \"isActive\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "isActive"
    },
    {
      "details": [
        "binding-context-slot | SpreadCardState | public"
      ],
      "edits": [
        "29:16..29:29 \"capturedValue\" -> \"spreadState\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "spreadState"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "label"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "value"
    }
  ]
}
```
