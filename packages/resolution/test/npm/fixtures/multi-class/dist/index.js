/**
 * ES2022 decorator output with multiple classes.
 * Each class has its own static block with __esDecorate calls.
 */

import { customElement, bindable, customAttribute } from 'aurelia';

// Helper declarations (abbreviated)
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {}
function __runInitializers(thisArg, initializers, value) { return value; }

// =============================================================================
// UserCard class
// =============================================================================

var _dec_UserCard, _dec_name, _dec_avatar, _init_name, _init_avatar;
let _UserCard;

_dec_UserCard = customElement('user-card');
_dec_name = bindable();
_dec_avatar = bindable();

class UserCard {
    static {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _init_name = [_dec_name];
        _init_avatar = [_dec_avatar];
        __esDecorate(null, null, _init_name, {
            kind: "field",
            name: "name",
            static: false,
            private: false,
            access: { has: (obj) => "name" in obj, get: (obj) => obj.name, set: (obj, value) => obj.name = value },
            metadata: _metadata
        }, _init_name, void 0);
        __esDecorate(null, null, _init_avatar, {
            kind: "field",
            name: "avatar",
            static: false,
            private: false,
            access: { has: (obj) => "avatar" in obj, get: (obj) => obj.avatar, set: (obj, value) => obj.avatar = value },
            metadata: _metadata
        }, _init_avatar, void 0);
        __esDecorate(null, _classDescriptor_UserCard = { value: _UserCard }, [_dec_UserCard], {
            kind: "class",
            name: "UserCard",
            metadata: _metadata
        }, null, _classExtraInitializers_UserCard);
        UserCard = _UserCard = _classDescriptor_UserCard.value;
        if (_metadata) Object.defineProperty(_UserCard, Symbol.metadata, { configurable: true, enumerable: true, value: _metadata });
        __runInitializers(_UserCard, _classExtraInitializers_UserCard);
    }

    name = (__runInitializers(_init_name, this), '');
    avatar = (__runInitializers(_init_avatar, this), '');
}

var _classDescriptor_UserCard;
var _classExtraInitializers_UserCard = [];

// =============================================================================
// HighlightAttribute class
// =============================================================================

var _dec_Highlight, _dec_color, _init_color;
let _HighlightAttribute;

_dec_Highlight = customAttribute('highlight');
_dec_color = bindable({ primary: true });

class HighlightAttribute {
    static {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _init_color = [_dec_color];
        __esDecorate(null, null, _init_color, {
            kind: "field",
            name: "color",
            static: false,
            private: false,
            access: { has: (obj) => "color" in obj, get: (obj) => obj.color, set: (obj, value) => obj.color = value },
            metadata: _metadata
        }, _init_color, void 0);
        __esDecorate(null, _classDescriptor_Highlight = { value: _HighlightAttribute }, [_dec_Highlight], {
            kind: "class",
            name: "HighlightAttribute",
            metadata: _metadata
        }, null, _classExtraInitializers_Highlight);
        HighlightAttribute = _HighlightAttribute = _classDescriptor_Highlight.value;
        if (_metadata) Object.defineProperty(_HighlightAttribute, Symbol.metadata, { configurable: true, enumerable: true, value: _metadata });
        __runInitializers(_HighlightAttribute, _classExtraInitializers_Highlight);
    }

    color = (__runInitializers(_init_color, this), 'yellow');
}

var _classDescriptor_Highlight;
var _classExtraInitializers_Highlight = [];

export { UserCard, HighlightAttribute };
