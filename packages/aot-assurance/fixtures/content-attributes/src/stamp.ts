import { bindable, customAttribute, INode, resolve } from 'aurelia';

@customAttribute('stamp')
export class Stamp {
  @bindable value = '';
  private readonly host = resolve(INode) as HTMLElement;
  binding(): void { this.valueChanged(); }
  valueChanged(): void { this.host.setAttribute('data-stamped', this.value); }
  unbinding(): void { this.host.removeAttribute('data-stamped'); }
}
