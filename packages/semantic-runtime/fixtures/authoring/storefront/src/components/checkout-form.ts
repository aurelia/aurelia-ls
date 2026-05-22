import { customElement, resolve } from 'aurelia';
import { StorefrontState } from '../state/storefront-state';
import { FieldShell } from './field-shell';
import template from './checkout-form.html';

@customElement({
  name: 'checkout-form',
  template,
  dependencies: [FieldShell],
})
export class CheckoutForm {
  readonly state = resolve(StorefrontState);

  readonly shipFulfillmentMethod = 'ship';
  readonly pickupFulfillmentMethod = 'pickup';
  readonly emailContactPreference = 'email';
  readonly phoneContactPreference = 'phone';
  readonly installationAddOn = 'installation';
  readonly supportAddOn = 'support';
  checkoutFormElement: HTMLFormElement | null = null;

  get checkoutPanelClasses(): Record<string, boolean> {
    return {
      'checkout-panel': true,
      'checkout-panel-ready': this.state.checkout.canSubmit,
      'checkout-panel-needs-details': !this.state.checkout.canSubmit,
      'checkout-panel-submitted': this.state.checkout.submitCount > 0,
    };
  }

  get checkoutPanelStyles(): Record<string, string> {
    return {
      borderColor: this.statusAccentColor,
      '--checkout-accent': this.statusAccentColor,
      'accent-color': this.statusAccentColor,
    };
  }

  get statusToneClass(): string {
    return this.state.checkout.canSubmit ? 'quote-ready' : 'quote-needs-details';
  }

  get checkoutStateName(): string {
    return this.state.checkout.canSubmit ? 'ready' : 'needs-details';
  }

  get checkoutStateDataId(): string {
    return `checkout-${this.checkoutStateName}`;
  }

  get ariaInvalid(): string {
    return String(!this.state.checkout.canSubmit);
  }

  get statusAccentColor(): string {
    return this.state.checkout.canSubmit ? '#2f7d32' : '#9a5b13';
  }

  get statusBackgroundColor(): string {
    return this.state.checkout.canSubmit
      ? 'color-mix(in srgb, #2f7d32 12%, transparent)'
      : 'color-mix(in srgb, #9a5b13 14%, transparent)';
  }

  get statusTextColor(): string {
    return this.state.checkout.canSubmit ? '#1f5d23' : '#6f3f08';
  }

  get statusDecoration(): string {
    return this.state.checkout.canSubmit ? 'none' : 'underline';
  }

  get fulfillmentClassTokens(): readonly string[] {
    return [
      'fulfillment-summary',
      this.state.checkout.requiresPostalCode ? 'fulfillment-shipping' : 'fulfillment-pickup',
    ];
  }

  get fulfillmentStyles(): Record<string, string> {
    return {
      'border-inline-start-color': this.statusAccentColor,
      '--fulfillment-gap': this.state.checkout.requiresPostalCode ? '0.75rem' : '0.5rem',
    };
  }

  get submitButtonPadding(): string {
    return this.state.checkout.canSubmit ? '0.65rem 1rem' : '0.65rem 0.85rem';
  }

  get submitButtonOutline(): string {
    return this.state.checkout.canSubmit ? '2px solid transparent' : `2px dashed ${this.statusAccentColor}`;
  }

  get progressWidth(): string {
    return this.state.checkout.canSubmit ? '100' : '42';
  }

  get progressStrokeWidth(): string {
    return this.state.checkout.canSubmit ? '4' : '3';
  }

  get progressLabel(): string {
    return this.state.checkout.canSubmit ? 'Checkout details are complete' : 'Checkout details need attention';
  }

  get submitCountText(): string {
    return String(this.state.checkout.submitCount);
  }

  requestQuote(): void {
    this.state.checkout.submit();
  }
}
