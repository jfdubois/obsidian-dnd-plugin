# Smoke Test Checklist — D&D Character Manager Plugin

> **Plugin ID:** `obsidian-dnd-character`
> **Version:** `0.1.0`
> **Minimum Obsidian version:** `1.7.0`
> **isDesktopOnly:** `false`

This checklist verifies the plugin loads and operates correctly in Obsidian Desktop before any feature work begins.

---

## Prerequisites

- [ ] Obsidian Desktop version >= 1.7.0 is installed
- [ ] A test vault exists (do not use a production vault)
- [ ] Build artifacts are ready:
  - [ ] `apps/obsidian-plugin/main.js` exists (esbuild bundle, production mode)
  - [ ] `apps/obsidian-plugin/manifest.json` exists

### Building the plugin

```bash
# From the obsidian-dnd-character root:
npm run build                          # TypeScript compilation (tsc -b)
npm run bundle --workspace=apps/obsidian-plugin  # esbuild production bundle
```

---

## 1. Plugin Installation

- [ ] Copy the following files into Obsidian's plugin folder:
  - `main.js` from `apps/obsidian-plugin/main.js`
  - `manifest.json` from `apps/obsidian-plugin/manifest.json`

  The target folder structure should be:

  ```
  <Vault>/.obsidian/plugins/obsidian-dnd-character/
  ├── main.js
  └── manifest.json
  ```

- [ ] Restart Obsidian or trigger community plugin reload (Settings → Community plugins → "Check for updates" or restart)

---

## 2. Plugin Enablement

- [ ] Open Obsidian Settings → Community plugins
- [ ] Find "D&D Character Manager" in the plugin list
- [ ] Click **Enable**
- [ ] Verify the plugin status shows as **Enabled**

### Console verification (load)

Open the Developer Console (Ctrl+Shift+I / Cmd+Option+I, Console tab) and verify these messages appear on load:

- [ ] `Loading D&D Character Manager plugin`
- [ ] `D&D Character Manager plugin loaded!`

---

## 3. Settings Tab Verification

- [ ] Open Obsidian Settings (Ctrl+, / Cmd+,)
- [ ] Scroll to the bottom of the left sidebar — a **"D&D Character Manager"** tab should be present
- [ ] Click the **"D&D Character Manager"** settings tab

Verify the following sections and fields are visible:

### Catalog section

- [ ] Section heading "Catalog" is displayed
- [ ] **Catalog server URL** — text input with placeholder `https://example.com/catalog`
- [ ] **Catalog revision** — text input with placeholder `e.g. rev-2024-01`

### Characters section

- [ ] Section heading "Characters" is displayed
- [ ] **Characters vault path** — text input with placeholder `dnd-characters`, default value `dnd-characters`

### About section

- [ ] Section heading "About" is displayed
- [ ] **Settings schema version** — read-only text showing `Current settings schema version: 1.`

### Editability test

- [ ] Change the **Catalog server URL** to a test value (e.g., `https://test.example.com`)
- [ ] Close and reopen the settings tab
- [ ] Verify the value persists
- [ ] Restore the original value (empty string)

---

## 4. Character Sheet View (Right Sidebar)

- [ ] Open the Command Palette (Ctrl+P / Cmd+P)
- [ ] Type "Open character sheet" and select the command
- [ ] Verify the **right sidebar** opens (or switches) to the "Character Sheet" view
- [ ] Verify the sidebar header shows **"Character Sheet"** (from `getDisplayText()`)
- [ ] Verify the view body contains:
  - [ ] `<h2>` heading: "Character Sheet"
  - [ ] `<p>` paragraph: "Character sheet coming soon"

### View type verification

- [ ] The view type registered is `dnd-character-sheet` (internal constant `DND_CHARACTER_SHEET_VIEW_TYPE`)
- [ ] The view appears in the right leaf (not center or left)

---

## 5. Vault Event Logging

The plugin registers listeners for vault file events. Verify they produce console output:

- [ ] Open Developer Console
- [ ] Create a new file in the vault — verify console shows:
  - `[D&D Character] Vault file created: <path>`
- [ ] Modify the file and save — verify console shows:
  - `[D&D Character] Vault file modified: <path>`
- [ ] Rename the file — verify console shows:
  - `[D&D Character] Vault file renamed: <old-path> -> <new-path>`
- [ ] Delete the file — verify console shows:
  - `[D&D Character] Vault file deleted: <path>`

---

## 6. Plugin Disable / Enable Cycle

- [ ] Disable the plugin (Settings → Community plugins → D&D Character Manager → **Disable**)
- [ ] Open Developer Console and verify this message appears:
  - `Unloading D&D Character Manager plugin`
- [ ] Verify **no console errors** appear during unload
- [ ] Verify the right sidebar view is removed (or no longer functional)
- [ ] Re-enable the plugin
- [ ] Verify the load console messages appear again (see Section 2)
- [ ] Verify the settings tab is accessible again
- [ ] Verify the command "Open character sheet" works again

---

## 7. Error Checking

- [ ] Open Developer Console (Ctrl+Shift+I / Cmd+Option+I)
- [ ] Clear the console
- [ ] Reload the plugin (disable → enable or restart Obsidian)
- [ ] Verify **zero errors** in the console
- [ ] Navigate to the settings tab — verify no errors
- [ ] Open the character sheet view — verify no errors
- [ ] Close the character sheet view — verify no errors

---

## 8. Mobile Compatibility Check (Pre-flight)

The manifest declares `"isDesktopOnly": false`. This checklist does not require a live mobile test, but verify:

- [ ] `manifest.json` contains `"isDesktopOnly": false` (confirmed in source)
- [ ] No Node.js/Electron-only APIs are used in the plugin source (no `require('fs')`, no `electron`, etc.)
- [ ] No window-specific DOM APIs that would fail on mobile webview

---

## Summary

| Section | Status |
|---------|--------|
| 1. Installation | ☐ |
| 2. Enablement + console load | ☐ |
| 3. Settings tab | ☐ |
| 4. Character sheet view | ☐ |
| 5. Vault event logging | ☐ |
| 6. Disable/enable cycle | ☐ |
| 7. Error checking | ☐ |
| 8. Mobile compatibility pre-flight | ☐ |

**Overall:** ☐ PASS / ☐ FAIL

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Plugin not listed in Community plugins | Wrong folder name or missing manifest.json | Ensure folder is `obsidian-dnd-character` with valid manifest.json |
| "Failed to load plugin" error | main.js syntax error or missing Obsidian APIs | Re-run `npm run bundle --workspace=apps/obsidian-plugin` |
| Settings tab missing | `addSettingTab` not called in onload | Check main.ts onload() method |
| Command not found | `addCommand` not called in onload | Check main.ts onload() method |
| View opens in center instead of right | `getRightLeaf()` returning null | Ensure workspace has room for right sidebar |
| Console errors on load | Missing Obsidian API or version mismatch | Verify Obsidian version >= 1.7.0 |
