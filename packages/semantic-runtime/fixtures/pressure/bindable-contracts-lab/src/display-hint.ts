import { bindable, customAttribute } from 'aurelia';

@customAttribute({
  name: 'display-hint',
  defaultProperty: 'message',
})
export class DisplayHint {
  @bindable message = '';
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable tone = '';
}
