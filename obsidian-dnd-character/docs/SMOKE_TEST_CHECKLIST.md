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

## 8. Mobile Compatibility Check

The manifest declares `"isDesktopOnly": false`. Perform a live smoke test on Obsidian mobile (Android or iOS) to verify the plugin loads and operates correctly.

### 8.1 Source Code Pre-flight Audit (Desktop)

Before testing on a mobile device, verify the source code is mobile-compatible:

- [ ] `manifest.json` contains `"isDesktopOnly": false`
- [ ] No Node.js/Electron-only APIs in plugin source (no `require('fs')`, no `electron`, no `process`, no Node builtins)
- [ ] No desktop-only Obsidian APIs (e.g., status bar items that only work on desktop)
- [ ] No window-specific DOM APIs that would fail on mobile webview (no `window.open()`, no `window.resizeTo()`, etc.)
- [ ] All DOM operations use standard APIs that work in mobile webview (`createElement`, `empty`, `createEl`, etc.)

**Audit results for current plugin (v0.1.0):**

| Check | Result |
|---|---|
| `isDesktopOnly` | `false` |
| Node.js/Electron APIs | None found |
| Desktop-only Obsidian APIs | `getRightLeaf(false)` returns `null` on mobile; guarded by `if (leaf)` in `main.ts` |
| Window-specific DOM APIs | None found |
| Platform-specific code | None found |

### 8.2 Installing the Plugin on Obsidian Mobile

Obsidian mobile does not support direct folder copying. Use one of these methods:

#### Method A: Sync via Obsidian Sync (Recommended)

1. Install the plugin in a vault that uses Obsidian Sync
2. Enable the plugin on desktop first (Sections 1-2)
3. Open the same vault on Obsidian mobile
4. Wait for sync to complete
5. The plugin should appear in Settings → Community plugins on mobile

#### Method B: Manual Installation via File Manager

1. On the mobile device, navigate to the vault's `.obsidian/plugins/` folder using a file manager app
2. Create the folder `obsidian-dnd-character/` inside `.obsidian/plugins/`
3. Copy `main.js` and `manifest.json` into that folder
4. Restart Obsidian mobile
5. The plugin should appear in Settings → Community plugins

#### Method C: Install from Local Beta (Developer Mode)

1. On desktop, build the plugin: `npm run bundle --workspace=apps/obsidian-plugin`
2. Enable "Allow manual installation of local beta version of plugins" in Obsidian desktop Settings → Community plugins
3. On mobile, go to Settings → Community plugins → "Turn on beta features"
4. Use the "Install local beta" option to point to the built plugin files

### 8.3 Enabling the Plugin on Mobile

- [ ] Open Obsidian mobile
- [ ] Tap the gear icon (Settings)
- [ ] Scroll to **Community plugins**
- [ ] If third-party plugins are disabled, tap **Turn on** and confirm
- [ ] Find **"D&D Character Manager"** in the plugin list
- [ ] Tap **Enable**
- [ ] Verify the plugin status shows as **Enabled**

### 8.4 Verifying Settings Tab on Mobile

On mobile, the settings modal appears as a full-screen overlay.

- [ ] Open Settings (gear icon)
- [ ] Scroll to the bottom of the settings list — a **"D&D Character Manager"** entry should be present
- [ ] Tap the **"D&D Character Manager"** settings entry
- [ ] Verify the settings page loads without errors

Verify the following sections and fields are visible and touch-friendly:

#### Catalog section

- [ ] Section heading "Catalog" is displayed
- [ ] **Catalog server URL** — text input is tappable and brings up the keyboard
- [ ] **Catalog revision** — text input is tappable and brings up the keyboard

#### Characters section

- [ ] Section heading "Characters" is displayed
- [ ] **Characters vault path** — text input is tappable, default value `dnd-characters` visible

#### About section

- [ ] Section heading "About" is displayed
- [ ] **Settings schema version** — read-only text showing `Current settings schema version: 1.`

#### Touch-friendly editability test

- [ ] Tap the **Catalog server URL** field and enter a test value (e.g., `https://test.example.com`)
- [ ] Navigate away from settings (tap back or close)
- [ ] Reopen the settings tab
- [ ] Verify the value persists
- [ ] Restore the original value (empty string)

### 8.5 Verifying Character Sheet View on Mobile

> **Note:** On mobile, the right sidebar behavior differs from desktop. Obsidian mobile does not have a persistent right sidebar. Views opened via `getRightLeaf()` will appear as a full-screen view or may not open at all if no right leaf exists.

- [ ] Open the Command Palette (three-dot menu → Command Palette, or swipe gesture if configured)
- [ ] Type "Open character sheet" and select the command
- [ ] **Expected behavior on mobile:**
  - The command executes without errors (the `if (leaf)` guard in `main.ts` handles the case where `getRightLeaf(false)` returns `null`)
  - If a right leaf is available on the device, the character sheet view opens as a full-screen view
  - If no right leaf is available, the command silently does nothing (no crash, no error)
- [ ] Verify the view body contains (if the view opens):
  - [ ] Heading: "Character Sheet"
  - [ ] Paragraph: "Character sheet coming soon"
- [ ] Verify no console errors appear when the command is executed on mobile

### 8.6 Verifying No Console Errors on Mobile

Obsidian mobile does not have a built-in developer console. Use one of these methods:

#### Method A: Chrome DevTools (Android only)

1. Enable USB debugging on the Android device
2. Connect the device to a computer via USB
3. Open Chrome on the computer and navigate to `chrome://inspect`
4. Find the Obsidian instance and tap "inspect"
5. Check the Console tab for errors

#### Method B: Safari Web Inspector (iOS only)

1. Enable Web Inspector on the iOS device (Settings → Safari → Advanced → Web Inspector)
2. Connect the device to a Mac via USB
3. Open Safari on the Mac and go to Develop → [Device Name]
4. Find the Obsidian webview and inspect
5. Check the Console tab for errors

#### Method C: In-app Error Notifications

- [ ] After enabling the plugin, watch for any red error banners or toast notifications from Obsidian
- [ ] Navigate through the settings tab — watch for error banners
- [ ] Execute the "Open character sheet" command — watch for error banners
- [ ] Disable and re-enable the plugin — watch for error banners

### 8.7 Mobile-Specific Considerations

- [ ] **Touch targets:** All interactive elements (text inputs, settings) are large enough to tap comfortably (minimum 44x44pt recommended)
- [ ] **Responsive layout:** The settings tab content does not overflow horizontally on narrow screens
- [ ] **Keyboard behavior:** Tapping text inputs brings up the appropriate keyboard (URL keyboard for URL fields)
- [ ] **No horizontal scroll:** The character sheet view and settings tab fit within the mobile viewport width
- [ ] **Back navigation:** Using the mobile back button from the settings tab returns to the settings list without errors
- [ ] **Plugin disable on mobile:** Disabling the plugin on mobile does not produce errors or crashes

---

## Summary

| Section | Status |
|---------|--------|
| 1. Installation (Desktop) | ☐ |
| 2. Enablement + console load (Desktop) | ☐ |
| 3. Settings tab (Desktop) | ☐ |
| 4. Character sheet view (Desktop) | ☐ |
| 5. Vault event logging (Desktop) | ☐ |
| 6. Disable/enable cycle (Desktop) | ☐ |
| 7. Error checking (Desktop) | ☐ |
| 8. Mobile compatibility | ☐ |
| 8.1 Source code pre-flight audit | ☐ |
| 8.2 Mobile installation | ☐ |
| 8.3 Mobile enablement | ☐ |
| 8.4 Mobile settings tab | ☐ |
| 8.5 Mobile character sheet view | ☐ |
| 8.6 Mobile console errors | ☐ |
| 8.7 Mobile-specific considerations | ☐ |

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
| Plugin not found on mobile after sync | Sync hasn't completed | Wait for sync indicator to clear, or manually copy files |
| "Open character sheet" does nothing on mobile | `getRightLeaf(false)` returns `null` on mobile | Expected behavior — mobile has no persistent right sidebar; the `if (leaf)` guard prevents errors |
| Settings text inputs not tappable on mobile | Obsidian mobile webview issue | Tap and hold, or try a different Obsidian mobile version |
| Error banner on mobile plugin load | `isDesktopOnly: true` in manifest | Verify manifest.json has `"isDesktopOnly": false` |
| Horizontal overflow in settings on mobile | Content too wide for narrow screens | The Obsidian `Setting` API handles responsive layout; this is unlikely with current settings |
