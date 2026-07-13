# template-local-template-semantics completions lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `completions`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-body-scope

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

### completion

```json
{
  "gapMarker": false,
  "isIncomplete": false,
  "kindCounts": {
    "property": 8
  },
  "outcome": "result",
  "totalItems": 8
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | string | number"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "mixedValue"
    },
    {
      "details": [
        "binding-context-slot | string"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "oneTimeValue"
    },
    {
      "details": [
        "binding-context-slot"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "unusedValue"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "entries"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "ownerSummary"
    }
  ]
}
```

## local-parent-bindable-attributes

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

### completion

```json
{
  "gapMarker": false,
  "isIncomplete": false,
  "kindCounts": {
    "field": 8,
    "property": 2,
    "struct": 12
  },
  "outcome": "result",
  "totalItems": 22
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "bindable-attribute"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "camel-case-value"
    },
    {
      "details": [
        "bindable-attribute"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "mixed-value"
    },
    {
      "details": [
        "bindable-attribute"
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "one-time-value"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "oneTimeValue"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "unusedValue"
    }
  ]
}
```

## local-bindable-mode-values

### Probe

```json
{
  "anchor": "mode=\"oneTime\"",
  "at": "oneTime",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:68",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 67,
    "line": 23
  },
  "occurrence": 1
}
```

### completion

```json
{
  "gapMarker": false,
  "isIncomplete": false,
  "kindCounts": {},
  "outcome": "empty",
  "totalItems": 0
}
```

### Membership

```json
{
  "mismatches": 5,
  "watched": [
    {
      "details": [],
      "expectation": "present",
      "found": false,
      "kinds": [],
      "label": "default"
    },
    {
      "details": [],
      "expectation": "present",
      "found": false,
      "kinds": [],
      "label": "fromView"
    },
    {
      "details": [],
      "expectation": "present",
      "found": false,
      "kinds": [],
      "label": "oneTime"
    },
    {
      "details": [],
      "expectation": "present",
      "found": false,
      "kinds": [],
      "label": "toView"
    },
    {
      "details": [],
      "expectation": "present",
      "found": false,
      "kinds": [],
      "label": "twoWay"
    }
  ]
}
```
