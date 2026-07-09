import { BindingMode, bindable, customElement } from 'aurelia';
import template from './profile-card.html';

@customElement({
  name: 'profile-card',
  template,
})
export class ProfileCard {
  private summaryValue = '';

  @bindable title = '';
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable({ mode: BindingMode.twoWay }) selectedId = '';
  @bindable count = 0;
  @bindable({ attribute: 'action' }) onAction: ((value: string) => void) | null = null;
  @bindable({ type: Number }) quantity = 0;
  @bindable({ type: Number, nullable: false }) strictQuantity: number | null = null;
  @bindable({ set: (value: unknown) => String(value).trim() }) normalizedLabel = '';
  @bindable({ set: String }) stringifiedLabel = '';

  @bindable
  get summary(): string {
    return this.summaryValue;
  }

  set summary(value: string) {
    this.summaryValue = value;
  }

  countChanged(newValue: number, oldValue: number): void {
    if (newValue !== oldValue) {
      this.onAction?.(`count:${newValue}`);
    }
  }
}
