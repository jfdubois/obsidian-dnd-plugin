/**
 * Vitest setup: mock the "obsidian" virtual package so that
 * plugin source files with runtime Obsidian imports can be
 * loaded in the test runner.
 *
 * Only the symbols actually imported by plugin source files
 * are mocked here. Add new mocks as the plugin grows.
 */

import { vi } from "vitest";

/* ── Minimal Obsidian mocks ────────────────────────────────────── */

class MockModal {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_app: any) {
    // no-op
  }
  open() {
    return this;
  }
  close() {
    return this;
  }
  onOpen() {}
  onClose() {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentEl: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  titleEl: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scope: any = null;
}

class MockButtonComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_el: any) {}
  setButtonText(_text: string) {
    return this;
  }
  setClass(_cls: string) {
    return this;
  }
  setTooltip(_text: string) {
    return this;
  }
  setCta() {
    return this;
  }
  setDisabled(_disabled: boolean) {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick(_fn: any) {
    return this;
  }
  buttonEl = { setAttribute: vi.fn() };
}

class MockToggle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private _setting: any) {}
  setValue(_value: boolean) { return this; }
  setTooltip(_text: string) { return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange(_fn: any) { return this; }
}

class MockDropdown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private _setting: any) {}
  addOptions(options: Record<string, string>) {
    // Add option display names to container's textContent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container: any = this._setting._container;
    if (container && container.children_arr) {
      for (const value of Object.values(options)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element for test assertions
        const textNode: any = { textContent: value, innerHTML: value };
        container.children_arr.push(textNode);
      }
    }
    return this;
  }
  setValue(_value: string) { return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange(_fn: any) { return this; }
}

class MockSetting {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _container: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlEl: any = {
    appendChild: vi.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nameEl: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(container: any) {
    this._container = container;
    this.nameEl = {
      setText: vi.fn((text: string) => {
        // Add text to container's children so it shows up in textContent
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element for test assertions
        const containerRef: any = this._container;
        if (containerRef && containerRef.children_arr) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element for test assertions
          const textNode: any = { textContent: text, innerHTML: text };
          containerRef.children_arr.push(textNode);
        }
      }),
    };
  }
  setName(_name: string) {
    return this;
  }
  setDesc(_desc: string) {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addText(_fn: any) {
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addDropdown(_fn: any) {
    _fn(new MockDropdown(this));
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addToggle(_fn: any) {
    _fn(new MockToggle(this));
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addButton(_fn: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const btn: any = new MockButtonComponent();
    // Intercept setButtonText to add text to container
    const origSetButtonText = btn.setButtonText;
    btn.setButtonText = vi.fn(function (text: string) {
      origSetButtonText.call(this, text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setting: any = this._settingRef;
      if (setting && setting._container && setting._container.children_arr) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock DOM element for test assertions
        const textNode: any = { textContent: text, innerHTML: text };
        setting._container.children_arr.push(textNode);
      }
      return this;
    });
    btn._settingRef = this;
    _fn(btn);
    return this;
  }
  clear() {
    return this;
  }
}

vi.mock("obsidian", () => ({
  Modal: MockModal,
  ButtonComponent: MockButtonComponent,
  Setting: MockSetting,
}));
