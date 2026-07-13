import { customElement } from '@aurelia/runtime-html';
import template from './template-native-target-precedence-app.html';

@customElement({ name: 'template-native-target-precedence-app', template })
export class TemplateNativeTargetPrecedenceApp {
  labelTarget = 'native-control';
  maximumLength = 32;
  tableRowSpan = 2;
  isReadOnly = true;
  dataState = 'ready';
  textValue = '';
  nullableTextValue: string | null = null;
  checkboxValue = 'selected';
  isChecked = false;
  numericValue = 0;
  nullableNumericValue: number | null = null;
  dateValue: Date | null = null;
  selectedFiles: FileList | null = null;
  selectedValue = 'first';
  textAreaValue = '';
  editableText = '';
  editableHtml = '';
  scrollOffset = 0;
  isDisabled = false;
  sliderPosition = 0;
  inertPosition = 0;
  inertAttributePosition = 0;
  focusRingState = 'visible';
  inertGlobalState = 'quiet';
  gradientViewBox = '0 0 100 100';
  gradientUnits = 'objectBoundingBox';
  guardedLivePosition = 0;
  guardedColdPosition = 0;
  nativeObserverPosition = 0;
  inertObserverPosition = 0;
  customDefaultTabIndex: number | null = null;
  readonlyTitle = 'runtime-owned';
  customLanguage = 'en';
  isDraggable = true;
  openDirection = 'ltr';
  isSpellchecked = false;
  classTokens = 'native-channel';
}
