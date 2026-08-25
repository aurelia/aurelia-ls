import type { PressureWidget } from './pressure-widget';

export declare const awaitedPressureWidget: Promise<typeof PressureWidget>;
export declare const broadPressureWidget: Promise<new () => PressureWidget>;
