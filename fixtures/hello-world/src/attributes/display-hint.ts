import { bindable, customAttribute, INode, resolve } from 'aurelia';

@customAttribute({
  name: 'display-hint',
})
export class DisplayHint {
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable tone: 'fresh' | 'warning' | 'empty' = 'fresh';

  private readonly host = resolve(INode) as HTMLElement;

  binding(): void {
    this.applyHint();
  }

  unbinding(): void {
    this.host.removeAttribute('title');
    this.host.removeAttribute('data-display-tone');
    this.host.classList.remove('hint-fresh', 'hint-warning', 'hint-empty');
  }

  labelTextChanged(): void {
    this.applyHint();
  }

  toneChanged(): void {
    this.applyHint();
  }

  private applyHint(): void {
    const labelText = this.labelText.trim();
    this.host.title = labelText.length > 0
      ? `${labelText} (${this.tone})`
      : `Tone: ${this.tone}`;
    this.host.dataset.displayTone = this.tone;
    this.host.classList.toggle('hint-fresh', this.tone === 'fresh');
    this.host.classList.toggle('hint-warning', this.tone === 'warning');
    this.host.classList.toggle('hint-empty', this.tone === 'empty');
  }
}
