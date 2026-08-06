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
}

class MockSetting {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlEl: any = {
    appendChild: vi.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_container: any) {}
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
