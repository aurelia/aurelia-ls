import { bindable, customAttribute } from 'aurelia';

@customAttribute({
  name: 'display-hint',
})
export class DisplayHint {
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable tone = '';
}
