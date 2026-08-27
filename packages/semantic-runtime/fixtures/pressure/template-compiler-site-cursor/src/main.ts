import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';
import cursorAsElementEmptyTemplate from './cursor-as-element-empty.html';
import cursorCommentShieldTemplate from './cursor-comment-shield.html';
import cursorEmptyTemplate from './cursor-empty.html';
import cursorFosterTemplate from './cursor-foster.html';
import cursorMarkerTemplate from './cursor-marker.html';
import cursorOpenTemplate from './cursor-open.html';
import cursorProgressionTemplate from './cursor-progression.html';
import cursorProjectionTemplate from './cursor-projection.html';
import cursorProcessContentTemplate from './cursor-process-content.html';
import cursorShapesTemplate from './cursor-shapes.html';
import cursorSurrogateInvalidTemplate from './cursor-surrogate-invalid.html';
import cursorSurrogateValidTemplate from './cursor-surrogate-valid.html';
import cursorTemplateControllerTemplate from './cursor-template-controller.html';
import cursorContainerlessTemplate from './cursor-containerless.html';
import cursorWideTemplate from './cursor-wide.html';

@customElement({
  name: 'cursor-empty',
  template: cursorEmptyTemplate,
})
class CursorEmpty {
  message = 'ready';
}

@customElement({
  name: 'cursor-progression',
  template: cursorProgressionTemplate,
})
class CursorProgression {
  editable = true;
  message = 'progressive';
}

@customElement({
  name: 'cursor-shapes',
  template: cursorShapesTemplate,
})
class CursorShapes {
  cell = 'cell';
  title = 'title';
  inert = 'inert';
  message = 'message';
  suppressed = 'suppressed';
}

@customElement({
  name: 'cursor-surrogate-invalid',
  template: cursorSurrogateInvalidTemplate,
})
class CursorSurrogateInvalid {}

@customElement({
  name: 'cursor-foster',
  template: cursorFosterTemplate,
})
class CursorFoster {
  title = 'fostered';
}

@customElement({
  name: 'cursor-comment-shield',
  template: cursorCommentShieldTemplate,
})
class CursorCommentShield {
  before = 'before';
  inside = 'inside';
}

@customElement({ name: 'div', template: '' })
class NativeDivResource {}

@customElement({
  name: 'cursor-as-element-empty',
  template: cursorAsElementEmptyTemplate,
  dependencies: [NativeDivResource],
})
class CursorAsElementEmpty {}

@customElement({ name: 'cursor-leaf' })
class CursorLeaf {}

@customElement({
  name: 'cursor-projection',
  template: cursorProjectionTemplate,
  dependencies: [CursorLeaf],
})
class CursorProjection {}

@customElement({
  name: 'cursor-marker',
  template: cursorMarkerTemplate,
})
class CursorMarker {}

@customElement({
  name: 'cursor-wide',
  template: cursorWideTemplate,
})
class CursorWide {
  value = 'wide';
}

@customElement({
  name: 'cursor-template-controller',
  template: cursorTemplateControllerTemplate,
})
class CursorTemplateController {
  condition = true;
}

@customElement({
  name: 'cursor-process-content',
  template: cursorProcessContentTemplate,
})
class CursorProcessContent {}

@customElement({ name: 'cursor-containerless-leaf', containerless: true })
class CursorContainerlessLeaf {}

@customElement({
  name: 'cursor-containerless',
  template: cursorContainerlessTemplate,
  dependencies: [CursorContainerlessLeaf],
})
class CursorContainerless {}

@customElement({
  name: 'cursor-open',
  template: cursorOpenTemplate,
})
class CursorOpen {
  message = 'open';
}

@customElement({
  name: 'cursor-surrogate-valid',
  template: cursorSurrogateValidTemplate,
})
class CursorSurrogateValid {}

void new Aurelia()
  .register(
    StandardConfiguration,
    CursorEmpty,
    CursorProgression,
    CursorShapes,
    CursorSurrogateInvalid,
    CursorFoster,
    CursorCommentShield,
    CursorAsElementEmpty,
    CursorProjection,
    CursorMarker,
    CursorWide,
    CursorTemplateController,
    CursorProcessContent,
    CursorContainerless,
    CursorOpen,
    CursorSurrogateValid,
  )
  .app({
    component: CursorEmpty,
    host: globalThis.document.querySelector('cursor-root') ?? globalThis.document.body,
  })
  .start();
