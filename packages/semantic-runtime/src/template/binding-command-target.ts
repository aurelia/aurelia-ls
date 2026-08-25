/** Common authored target names used with framework-owned binding commands; arbitrary user targets remain strings. */
export enum BuiltInBindingCommandTargetName {
  /** Native value property used by value observers and select observers. */
  Value = 'value',
  /** Authored alias for the native `valueAsNumber` property. */
  ValueAsNumber = 'value-as-number',
  /** Authored alias for the native `valueAsDate` property. */
  ValueAsDate = 'value-as-date',
  /** Native checked property used by checkbox and radio observers. */
  Checked = 'checked',
  /** Special ref target whose authored form can collapse to bare `ref`. */
  Element = 'element',
  /** Full class attribute target for `class.bind`. */
  Class = 'class',
  /** Full style attribute target for `style.bind`. */
  Style = 'style',
  /** Option/input model target used for object-valued choice controls. */
  Model = 'model',
  /** Select mode target whose value determines scalar versus collection selection behavior. */
  Multiple = 'multiple',
  /** Equality matcher target used by checked/select object comparison. */
  Matcher = 'matcher',
  /** Repeat template-controller target for `repeat.for` iterator bindings. */
  Repeat = 'repeat',
  /** UI virtualization template-controller target for `virtual-repeat.for`. */
  VirtualRepeat = 'virtual-repeat',
}
