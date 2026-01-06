/**
 * Pre-compiled ES2022 decorator output.
 * This simulates what TypeScript produces with:
 *   "target": "ES2022",
 *   "experimentalDecorators": false (uses native decorators)
 *
 * The decorator metadata is preserved in the compiled output,
 * enabling extraction without TypeScript source.
 */

import { customAttribute, bindable } from 'aurelia';

var _dec, _dec2, _dec3, _dec4, _init_content, _init_position, _init_visible, _initClass;

let _TooltipCustomAttribute;
_dec = customAttribute('tooltip');
_dec2 = bindable({ primary: true });
_dec3 = bindable();
_dec4 = bindable();

class TooltipCustomAttribute {
    static {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _init_content = [_dec2];
        _init_position = [_dec3];
        _init_visible = [_dec4];
        __esDecorate(null, null, _init_content, {
            kind: "field",
            name: "content",
            static: false,
            private: false,
            access: {
                has: (obj) => "content" in obj,
                get: (obj) => obj.content,
                set: (obj, value) => obj.content = value
            },
            metadata: _metadata
        }, _init_content, void 0);
        __esDecorate(null, null, _init_position, {
            kind: "field",
            name: "position",
            static: false,
            private: false,
            access: {
                has: (obj) => "position" in obj,
                get: (obj) => obj.position,
                set: (obj, value) => obj.position = value
            },
            metadata: _metadata
        }, _init_position, void 0);
        __esDecorate(null, null, _init_visible, {
            kind: "field",
            name: "visible",
            static: false,
            private: false,
            access: {
                has: (obj) => "visible" in obj,
                get: (obj) => obj.visible,
                set: (obj, value) => obj.visible = value
            },
            metadata: _metadata
        }, _init_visible, void 0);
        __esDecorate(null, _classDescriptor = { value: _TooltipCustomAttribute }, [_dec], {
            kind: "class",
            name: "TooltipCustomAttribute",
            metadata: _metadata
        }, null, _classExtraInitializers);
        TooltipCustomAttribute = _TooltipCustomAttribute = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_TooltipCustomAttribute, Symbol.metadata, { configurable: true, enumerable: true, value: _metadata });
        __runInitializers(_TooltipCustomAttribute, _classExtraInitializers);
    }

    content = (__runInitializers(_init_content, this), '');
    position = (__runInitializers(_init_position, this), 'top');
    visible = (__runInitializers(_init_visible, this), false);
}

var _classDescriptor;
var _classExtraInitializers = [];

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    // Standard ES2022 decorator helper (abbreviated for fixture)
}

function __runInitializers(thisArg, initializers, value) {
    // Standard ES2022 initializer helper (abbreviated for fixture)
    return value;
}

export { TooltipCustomAttribute };
