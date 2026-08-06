"use strict";
/**
 * Vitest setup: mock the "obsidian" virtual package so that
 * plugin source files with runtime Obsidian imports can be
 * loaded in the test runner.
 *
 * Only the symbols actually imported by plugin source files
 * are mocked here. Add new mocks as the plugin grows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
/* ── Minimal Obsidian mocks ────────────────────────────────────── */
var MockModal = /** @class */ (function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function MockModal(_app) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.contentEl = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.titleEl = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.scope = null;
        // no-op
    }
    MockModal.prototype.open = function () {
        return this;
    };
    MockModal.prototype.close = function () {
        return this;
    };
    MockModal.prototype.onOpen = function () { };
    MockModal.prototype.onClose = function () { };
    return MockModal;
}());
var MockButtonComponent = /** @class */ (function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function MockButtonComponent(_el) {
    }
    MockButtonComponent.prototype.setButtonText = function (_text) {
        return this;
    };
    MockButtonComponent.prototype.setClass = function (_cls) {
        return this;
    };
    MockButtonComponent.prototype.setCta = function () {
        return this;
    };
    MockButtonComponent.prototype.setDisabled = function (_disabled) {
        return this;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockButtonComponent.prototype.onClick = function (_fn) {
        return this;
    };
    return MockButtonComponent;
}());
var MockSetting = /** @class */ (function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function MockSetting(_container) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.controlEl = {
            appendChild: vitest_1.vi.fn(),
        };
    }
    MockSetting.prototype.setName = function (_name) {
        return this;
    };
    MockSetting.prototype.setDesc = function (_desc) {
        return this;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockSetting.prototype.addText = function (_fn) {
        return this;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MockSetting.prototype.addDropdown = function (_fn) {
        return this;
    };
    MockSetting.prototype.clear = function () {
        return this;
    };
    return MockSetting;
}());
vitest_1.vi.mock("obsidian", function () { return ({
    Modal: MockModal,
    ButtonComponent: MockButtonComponent,
    Setting: MockSetting,
}); });
