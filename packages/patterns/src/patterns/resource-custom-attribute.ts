import type { AureliaPatternExample } from '../pattern-contract.js';

export const resourceCustomAttributePattern: AureliaPatternExample = {
  patternId: 'resource.custom-attribute',
  title: 'Host custom attribute behavior',
  guidance: {
    summary: 'Use a custom attribute when one reusable DOM element behavior should be attached declaratively to ordinary markup.',
    whenToUse: [
      'Several elements need the same host-level behavior or class policy.',
      'The behavior belongs to the element it is attached to, not to a wrapper component.',
      'The attribute can be configured with a small bindable value.'
    ],
    whenNotToUse: [
      'The UI needs its own template, projected content, or a reusable visual frame.',
      'The behavior is one-off local component logic that does not need a reusable resource.',
      'The attribute would control rendering, container scope, or third-party lifecycle policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'status-tone-custom-attribute.ts',
        language: 'ts',
        contents: `import { bindable, customAttribute, INode, resolve } from 'aurelia';

export type StatusTone = 'neutral' | 'success' | 'warning';

const statusTones = ['neutral', 'success', 'warning'] as const satisfies readonly StatusTone[];

@customAttribute({ name: 'status-tone', defaultProperty: 'tone' })
export class StatusToneCustomAttribute {
  @bindable tone: StatusTone = 'neutral';

  private readonly host = resolve(INode) as HTMLElement;

  binding(): void {
    this.applyTone();
  }

  toneChanged(): void {
    this.applyTone();
  }

  private applyTone(): void {
    for (const tone of statusTones) {
      this.host.classList.toggle(\`is-\${tone}\`, tone === this.tone);
    }
    this.host.dataset.statusTone = this.tone;
  }
}
`
      },
      {
        path: 'release-status.ts',
        language: 'ts',
        contents: `import type { StatusTone } from './status-tone-custom-attribute';

interface ReleaseCheck {
  id: string;
  label: string;
  tone: StatusTone;
}

export class ReleaseStatus {
  readonly checks: readonly ReleaseCheck[] = [
    { id: 'tests', label: 'Tests passing', tone: 'success' },
    { id: 'docs', label: 'Docs need review', tone: 'warning' },
    { id: 'deploy', label: 'Deploy window scheduled', tone: 'neutral' }
  ];
}
`
      },
      {
        path: 'release-status.html',
        language: 'html',
        contents: `<import from="./status-tone-custom-attribute"></import>

<section>
  <h1>Release status</h1>

  <ul>
    <li repeat.for="check of checks; key.bind: check.id">
      <span status-tone.bind="check.tone">\${check.label}</span>
    </li>
  </ul>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The custom attribute owns only host-element decoration, not layout, rendering, or cross-component state.'
      },
      {
        summary: 'The status tone is a small controlled value supplied by the consuming component.'
      },
      {
        summary: 'The attribute is imported where it is used, keeping resource availability explicit.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use custom elements when behavior needs markup.',
        action: 'Move to a custom element when the reusable piece needs its own template, child content, or visual frame.'
      },
      {
        summary: 'Keep host access behind Aurelia DI.',
        action: 'Use `resolve(INode)` for the attached element instead of global DOM constructors or document queries.'
      },
      {
        summary: 'Separate advanced attribute roles.',
        action: 'Treat template controllers, third-party plugin setup, global listeners, and rendering control as separate advanced patterns.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Custom Attributes',
        url: 'https://docs.aurelia.io/templates/custom-attributes'
      },
      {
        title: 'Component Lifecycles',
        url: 'https://docs.aurelia.io/components/component-lifecycles'
      }
    ]
  }
};
