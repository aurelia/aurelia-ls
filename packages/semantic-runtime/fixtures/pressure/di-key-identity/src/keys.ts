import { DI } from '@aurelia/kernel';

export class SharedClassKey {}
export class SharedProvider {}

export const FirstInterfaceKey = DI.createInterface<unknown>('SameFriendlyName');
export const SecondInterfaceKey = DI.createInterface<unknown>('SameFriendlyName');

export const SharedObjectKey = {};
export const SecondObjectKey = {};

export const SharedLocalSymbolKey = Symbol('SameSymbolDescription');
export const SecondLocalSymbolKey = Symbol('SameSymbolDescription');
