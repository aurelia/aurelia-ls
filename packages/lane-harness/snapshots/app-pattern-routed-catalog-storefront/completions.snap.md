# app-pattern-routed-catalog-storefront completions lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `completions`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## member-completion-searchText

### Probe

```json
{
  "anchor": "state.items.searchText",
  "at": "searchText",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:8:54",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 53,
    "line": 7
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
    "property": 9
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 11,
  "totalItems": 11
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "type-member | ItemBadge | \"all\" | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"badgeFilter\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "badgeFilter"
    },
    {
      "details": [
        "type-member | readonly (ItemBadge | \"all\")[] | public | readonly"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"badgeFilters\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "badgeFilters"
    },
    {
      "details": [
        "type-member | boolean | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"hasItems\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "hasItems"
    },
    {
      "details": [
        "type-member | boolean | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"hasVisibleItems\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "hasVisibleItems"
    },
    {
      "details": [
        "type-member | boolean | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"isLoading\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "isLoading"
    },
    {
      "details": [
        "type-member | boolean | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"onlyInStock\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "onlyInStock"
    },
    {
      "details": [
        "type-member | (entityId: string) => Item | null | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"readItem\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "method"
      ],
      "label": "readItem"
    },
    {
      "details": [
        "type-member | (collection: readonly Item[]) => void | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"replace\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "method"
      ],
      "label": "replace"
    },
    {
      "details": [
        "type-member | string | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"searchText\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "searchText"
    },
    {
      "details": [
        "type-member | readonly Item[] | public"
      ],
      "edits": [
        "7:53..7:63 \"searchText\" -> \"visibleItems\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "visibleItems"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "badge"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "item"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "items"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "selectedItemIds"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "selection"
    }
  ]
}
```

## root-scope-in-repeat

### Probe

```json
{
  "anchor": "${badge}",
  "at": "badge",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:17:87",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 86,
    "line": 16
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
    "property": 2,
    "variable": 8
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 11,
  "totalItems": 11
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | ItemBadge | \"all\""
      ],
      "edits": [
        "16:86..16:91 \"badge\" -> \"badge\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "badge"
    },
    {
      "details": [
        "binding-context-slot | CatalogState | public | readonly"
      ],
      "edits": [
        "16:86..16:91 \"badge\" -> \"state\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "state"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "item"
    }
  ]
}
```

## root-scope-outside-repeat

### Probe

```json
{
  "anchor": "state.items.isLoading",
  "at": "state",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:3:15",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 14,
    "line": 2
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
    "property": 1
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 1,
  "totalItems": 1
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | CatalogState | public | readonly"
      ],
      "edits": [
        "2:14..2:19 \"state\" -> \"state\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "state"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "badge"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "item"
    }
  ]
}
```

## element-tag-item-card

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item-card",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:12",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 11,
    "line": 25
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
    "class": 7
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 7,
  "totalItems": 7
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "custom-element"
      ],
      "edits": [
        "25:11..25:20 \"item-card\" -> \"item-card\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "class"
      ],
      "label": "item-card"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "loose-picklist"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "ticket-editor"
    }
  ]
}
```

## attr-on-item-card

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item.bind",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:22",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 21,
    "line": 25
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
    "field": 1,
    "property": 4,
    "struct": 12
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 17,
  "totalItems": 17
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "custom-attribute"
      ],
      "edits": [
        "25:21..25:25 \"item\" -> \"focus\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "focus"
    },
    {
      "details": [
        "template-controller"
      ],
      "edits": [
        "25:21..25:25 \"item\" -> \"if\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "struct"
      ],
      "label": "if"
    },
    {
      "details": [
        "bindable-attribute"
      ],
      "edits": [
        "25:21..25:25 \"item\" -> \"item\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "item"
    },
    {
      "details": [
        "template-controller"
      ],
      "edits": [
        "25:21..25:25 \"item\" -> \"repeat\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "struct"
      ],
      "label": "repeat"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "DotSeparatedAttributePattern"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "EventAttributePattern"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "bind"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "draft"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "onCommit"
    }
  ]
}
```

## binding-behavior-debounce

### Probe

```json
{
  "anchor": "& debounce:150",
  "at": "debounce",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:8:67",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 66,
    "line": 7
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
    "function": 10
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 10,
  "totalItems": 10
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-behavior"
      ],
      "edits": [
        "7:66..7:74 \"debounce\" -> \"debounce\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "function"
      ],
      "label": "debounce"
    },
    {
      "details": [
        "binding-behavior"
      ],
      "edits": [
        "7:66..7:74 \"debounce\" -> \"throttle\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "function"
      ],
      "label": "throttle"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "searchText"
    }
  ]
}
```
