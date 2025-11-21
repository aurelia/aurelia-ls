type __AU_TTC_T0_F0 = (AppVm) & {} & {} & { $parent: unknown } & { $vm: (AppVm) } & {};
__au$access<(AppVm) & {} & {} & { $parent: unknown } & { $vm: (AppVm) } & {}>(o => o.cardTitle);
type __AU_TTC_T0_F1 = (Omit<(AppVm), 'item' | '$index' | '$first' | '$last' | '$even' | '$odd' | '$length' | '$middle'>) & {} & { item: (CollectionElement<NonNullable<(AppVm)>['items']>); $index: number; $first: boolean; $last: boolean; $even: boolean; $odd: boolean; $length: number; $middle: boolean } & { $parent: (AppVm) & {} & {} & { $parent: unknown } & { $vm: (AppVm) } & {} } & { $vm: (AppVm) } & {};
__au$access<__AU_TTC_T0_F1>(o => o.item.label);
__au$access<__AU_TTC_T0_F1>(o => o.item.details);
type __AU_TTC_T0_F2 = (Omit<(Omit<(AppVm), keyof (NonNullable<((CollectionElement<NonNullable<(AppVm)>['items']>))>['details'])>), 'item' | '$index' | '$first' | '$last' | '$even' | '$odd' | '$length' | '$middle'>) & (Omit<(NonNullable<((CollectionElement<NonNullable<(AppVm)>['items']>))>['details']), 'item' | '$index' | '$first' | '$last' | '$even' | '$odd' | '$length' | '$middle'>) & { item: (CollectionElement<NonNullable<(AppVm)>['items']>); $index: number; $first: boolean; $last: boolean; $even: boolean; $odd: boolean; $length: number; $middle: boolean } & { $parent: (Omit<(AppVm), 'item' | '$index' | '$first' | '$last' | '$even' | '$odd' | '$length' | '$middle'>) & {} & { item: (CollectionElement<NonNullable<(AppVm)>['items']>); $index: number; $first: boolean; $last: boolean; $even: boolean; $odd: boolean; $length: number; $middle: boolean } & { $parent: (AppVm) & {} & {} & { $parent: unknown } & { $vm: (AppVm) } & {} } & { $vm: (AppVm) } & {} } & { $vm: (AppVm) } & { $this: (NonNullable<((CollectionElement<NonNullable<(AppVm)>['items']>))>['details']) };
__au$access<__AU_TTC_T0_F2>(o => o.color);
__au$access<__AU_TTC_T0_F2>(o => o.summary);

export {}
