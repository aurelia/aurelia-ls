function __au_vc<T>(value: T, _name?: string, ..._args: unknown[]): T { return value; }
function __au_bb<T>(value: T, _name?: string, ..._args: unknown[]): T { return value; }
type __AU_DollarChangedValue<T> = T extends (newValue: infer V, ..._args: unknown[]) => unknown ? V : unknown;
type __AU_DollarChangedProps<T> = { [K in keyof T as K extends `$${infer Name}Changed` ? `$${Name}` : never]?: __AU_DollarChangedValue<T[K]> };
type __AU_TTC_VM = AppVm;
type __AU_TTC_T0_F0 = (__AU_TTC_VM) & {} & {} & { $parent: unknown } & { $vm: (__AU_TTC_VM) } & {};
__au$access<((__AU_TTC_VM) & {} & {} & { $parent: unknown } & { $vm: (__AU_TTC_VM) } & {}) & (__AU_DollarChangedProps<__AU_TTC_VM>)>(o => o.vm);
__au$access<((__AU_TTC_VM) & {} & {} & { $parent: unknown } & { $vm: (__AU_TTC_VM) } & {}) & (__AU_DollarChangedProps<__AU_TTC_VM>)>(o => o.isFocused);
__au$access<((__AU_TTC_VM) & {} & {} & { $parent: unknown } & { $vm: (__AU_TTC_VM) } & {}) & (__AU_DollarChangedProps<__AU_TTC_VM>)>(o => o.greeting);
__au$access<((__AU_TTC_VM) & {} & {} & { $parent: unknown } & { $vm: (__AU_TTC_VM) } & {}) & (__AU_DollarChangedProps<__AU_TTC_VM>)>(o => o.user.name);

export {}
