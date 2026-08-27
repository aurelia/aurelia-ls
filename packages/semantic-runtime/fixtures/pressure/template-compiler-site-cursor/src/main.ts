import {
  Aurelia,
  bindable,
  customAttribute,
  customElement,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import cursorAsElementEmptyTemplate from './cursor-as-element-empty.html';
import cursorCommentShieldTemplate from './cursor-comment-shield.html';
import cursorEmptyTemplate from './cursor-empty.html';
import cursorFosterTemplate from './cursor-foster.html';
import cursorLiveDuplicateTemplate from './cursor-live-duplicate.html';
import cursorLiveEmptyTemplate from './cursor-live-empty.html';
import cursorLiveNonsingularTemplate from './cursor-live-nonsingular.html';
import cursorLiveMultiBindingTemplate from './cursor-live-multi-binding.html';
import cursorLiveStagingTemplate from './cursor-live-staging.html';
import cursorMarkerTemplate from './cursor-marker.html';
import cursorOpenTemplate from './cursor-open.html';
import cursorProgressionTemplate from './cursor-progression.html';
import cursorProjectionTemplate from './cursor-projection.html';
import cursorProcessContentTemplate from './cursor-process-content.html';
import cursorProcessContentEmptyTemplate from './cursor-process-content-empty.html';
import cursorProcessContentNamedTemplate from './cursor-process-content-named.html';
import cursorProcessContentArbitraryTemplate from './cursor-process-content-arbitrary.html';
import cursorProcessContentDuplicateNameTemplate from './cursor-process-content-duplicate-name.html';
import cursorRowInterleaveTemplate from './cursor-row-interleave.html';
import cursorRowMergedTemplate from './cursor-row-merged.html';
import cursorShapesTemplate from './cursor-shapes.html';
import cursorShadowContainerlessTemplate from './cursor-shadow-containerless.html';
import cursorSlotInertTemplate from './cursor-slot-inert.html';
import cursorSlotInvalidTemplate from './cursor-slot-invalid.html';
import cursorSlotValidTemplate from './cursor-slot-valid.html';
import cursorSlotsContainerlessTemplate from './cursor-slots-containerless.html';
import cursorSurrogateInvalidTemplate from './cursor-surrogate-invalid.html';
import cursorSurrogateValidTemplate from './cursor-surrogate-valid.html';
import cursorTemplateControllerTemplate from './cursor-template-controller.html';
import cursorContainerlessTemplate from './cursor-containerless.html';
import cursorUsageContainerlessTemplate from './cursor-usage-containerless.html';
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
  name: 'cursor-live-duplicate',
  template: cursorLiveDuplicateTemplate,
})
class CursorLiveDuplicate {
  first = 'first';
  second = 'second';
  dropped = 'dropped';
  value = 'value';
}

@customElement({
  name: 'cursor-live-empty',
  template: cursorLiveEmptyTemplate,
})
class CursorLiveEmpty {}

@customElement({
  name: 'cursor-live-nonsingular',
  template: cursorLiveNonsingularTemplate,
})
class CursorLiveNonsingular {
  title = 'reconstructed';
}

@customAttribute('cursor-live-multi')
class CursorLiveMultiAttribute {
  @bindable first = '';
  @bindable second = '';
}

@customElement({
  name: 'cursor-live-multi-binding',
  template: cursorLiveMultiBindingTemplate,
  dependencies: [CursorLiveMultiAttribute],
})
class CursorLiveMultiBinding {
  message = 'commanded';
  later = 'unreached';
}

@customAttribute('cursor-staging-ca')
class CursorStagingCustomAttribute {
  @bindable value = '';
}

@customElement({ name: 'cursor-staging-capture', capture: true })
class CursorStagingCapture {
  @bindable title = '';
}

@customElement('cursor-staging-child')
class CursorStagingChild {
  @bindable title = '';
}

@customElement({
  name: 'cursor-live-staging',
  template: cursorLiveStagingTemplate,
  dependencies: [CursorStagingCustomAttribute, CursorStagingCapture, CursorStagingChild],
})
class CursorLiveStaging {
  message = 'message';
  spread = { title: 'spread' };
  value = 'selected';
  multiple = true;
}

@customElement({ name: 'cursor-merged-leaf' })
class CursorMergedLeaf {
  @bindable title = '';
}

@customAttribute('cursor-merged-ca')
class CursorMergedCustomAttribute {
  @bindable value = '';
}

@customElement({
  name: 'cursor-row-merged',
  template: cursorRowMergedTemplate,
  dependencies: [CursorMergedLeaf, CursorMergedCustomAttribute],
})
class CursorRowMerged {
  title = 'title';
  ca = 'ca';
  extra = 'extra';
}

@customElement({
  name: 'cursor-row-interleave',
  template: cursorRowInterleaveTemplate,
})
class CursorRowInterleave {
  a = 'a';
  b = 'b';
  c = 'c';
  d = 'd';
  e = 'e';
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

@customElement({
  name: 'cursor-process-content-empty',
  template: cursorProcessContentEmptyTemplate,
})
class CursorProcessContentEmpty {}

@customElement({
  name: 'cursor-process-content-named',
  template: cursorProcessContentNamedTemplate,
})
class CursorProcessContentNamed {
  removed = 'removed';
  kept = 'kept';
}

@customElement({
  name: 'cursor-process-content-duplicate-name',
  template: cursorProcessContentDuplicateNameTemplate,
})
class CursorProcessContentDuplicateName {}

@customElement({
  name: 'cursor-arbitrary-content',
  processContent: () => true,
})
class CursorArbitraryContent {}

@customElement({
  name: 'cursor-process-content-arbitrary',
  template: cursorProcessContentArbitraryTemplate,
  dependencies: [CursorArbitraryContent],
})
class CursorProcessContentArbitrary {
  message = 'open';
}

@customElement({ name: 'cursor-containerless-leaf', containerless: true })
class CursorContainerlessLeaf {}

@customElement({
  name: 'cursor-containerless',
  template: cursorContainerlessTemplate,
  dependencies: [CursorContainerlessLeaf],
})
class CursorContainerless {}

@customElement({ name: 'cursor-usage-containerless-leaf' })
class CursorUsageContainerlessLeaf {}

@customElement({
  name: 'cursor-usage-containerless',
  template: cursorUsageContainerlessTemplate,
  dependencies: [CursorUsageContainerlessLeaf],
})
class CursorUsageContainerless {}

@customElement({ name: 'cursor-shadow-leaf', shadowOptions: { mode: 'open' } })
class CursorShadowLeaf {}

@customElement({
  name: 'cursor-shadow-containerless',
  template: cursorShadowContainerlessTemplate,
  dependencies: [CursorShadowLeaf],
})
class CursorShadowContainerless {}

@customElement({ name: 'cursor-slots-containerless-leaf', hasSlots: true })
class CursorSlotsContainerlessLeaf {}

@customElement({
  name: 'cursor-slots-containerless',
  template: cursorSlotsContainerlessTemplate,
  dependencies: [CursorSlotsContainerlessLeaf],
})
class CursorSlotsContainerless {}

@customElement({
  name: 'cursor-slot-valid',
  template: cursorSlotValidTemplate,
  shadowOptions: { mode: 'open' },
})
class CursorSlotValid {
  slotName = 'content';
}

@customElement({
  name: 'cursor-slot-invalid',
  template: cursorSlotInvalidTemplate,
})
class CursorSlotInvalid {
  message = 'host';
  child = 'child';
  later = 'later';
}

@customElement({
  name: 'cursor-slot-inert',
  template: cursorSlotInertTemplate,
})
class CursorSlotInert {}

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
    CursorLiveDuplicate,
    CursorLiveEmpty,
    CursorLiveNonsingular,
    CursorLiveMultiBinding,
    CursorLiveStaging,
    CursorRowMerged,
    CursorRowInterleave,
    CursorCommentShield,
    CursorAsElementEmpty,
    CursorProjection,
    CursorMarker,
    CursorWide,
    CursorTemplateController,
    CursorProcessContent,
    CursorProcessContentEmpty,
    CursorProcessContentNamed,
    CursorProcessContentDuplicateName,
    CursorProcessContentArbitrary,
    CursorContainerless,
    CursorUsageContainerless,
    CursorShadowContainerless,
    CursorSlotsContainerless,
    CursorSlotValid,
    CursorSlotInvalid,
    CursorSlotInert,
    CursorOpen,
    CursorSurrogateValid,
  )
  .app({
    component: CursorEmpty,
    host: globalThis.document.querySelector('cursor-root') ?? globalThis.document.body,
  })
  .start();
