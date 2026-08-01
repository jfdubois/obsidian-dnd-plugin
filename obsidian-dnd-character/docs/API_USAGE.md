# Obsidian API Usage Register

Every Obsidian API member used in this project must have an entry before it appears in implementation code.

| Symbol | Verified signature | `@since` | Used in | Purpose | Manual test |
|---|---|---:|---|---|---|
| `requestUrl` | `requestUrl(request: RequestUrlParam \| string): RequestUrlResponsePromise` | — | `request-url-client.ts` | catalog HTTP client | mocked in transport tests |
| `Plugin.registerView` | `registerView(type: string, viewCreator: ViewCreator): void` | 0.9.7 | `main.ts` | character sheet view registration | view registered in onload |
| `Workspace.getRightLeaf` | `getRightLeaf(split: boolean): WorkspaceLeaf \| null` | 0.9.7 | `main.ts` | get or create right sidebar leaf for character sheet | right leaf returned or null |
| `WorkspaceLeaf.setViewState` | `setViewState(viewState: ViewState, eState?: any): Promise<void>` | — | `main.ts` | activate character sheet view in leaf | view type set on leaf |
| `Workspace.revealLeaf` | `revealLeaf(leaf: WorkspaceLeaf): Promise<void>` | 1.7.2 | `main.ts` | uncollapse sidebar and bring leaf to foreground | sidebar opens with character sheet |
| `Plugin.onload` | `onload(): Promise<void> \| void` | 0.9.7 | `main.ts` | plugin initialization lifecycle | console.log verification |
| `Plugin.loadData` | `loadData(): Promise<any>` | 0.9.7 | `main.ts` | load persisted plugin settings | settings normalized on load |
| `Plugin.saveData` | `saveData(data: any): Promise<void>` | 0.9.7 | `main.ts` | persist plugin settings on unload | settings saved on unload |
| `Vault.cachedRead` | `cachedRead(file: TFile): Promise<string>` | 0.9.7 | pending | read display data | pending |
| `Vault.process` | `process(file: TFile, fn: (data: string) => string, options?: DataWriteOptions): Promise<string>` | 1.1.0 | pending | atomic character update | pending |
| `Plugin.addCommand` | `addCommand(command: Command): Command` | 0.9.7 | `main.ts` | register command to open character sheet in right sidebar | command appears in command palette |
| `Plugin.addSettingTab` | `addSettingTab(settingTab: PluginSettingTab): void` | 0.9.7 | `main.ts` | register settings tab | settings tab appears in Obsidian settings |
| `PluginSettingTab` | `abstract class PluginSettingTab extends SettingTab { constructor(app: App, plugin: Plugin); display(): void; }` | 0.9.7 | `settings-tab.ts` | custom settings tab base class | tab renders with all settings |
| `PluginSettingTab.display` | `display(): void` | 0.9.7 (deprecated since 1.13.0, legacy imperative fallback) | `settings-tab.ts` | render settings UI imperatively | settings fields appear on tab open |
| `Setting` | `class Setting { constructor(containerEl: HTMLElement); }` | 0.9.7 | `settings-tab.ts` | setting row container | rows render in tab |
| `Setting.setName` | `setName(name: string): this` | 0.9.7 | `settings-tab.ts` | label for setting row | label text visible |
| `Setting.setDesc` | `setDesc(desc: string \| DocumentFragment): this` | 0.9.7 | `settings-tab.ts` | description for setting row | description text visible |
| `Setting.addText` | `addText(cb: (component: TextComponent) => any): this` | 0.9.7 | `settings-tab.ts` | editable text input for setting | input renders and persists on change |
| `TextComponent` | `class TextComponent extends AbstractTextComponent<HTMLInputElement>` | 0.9.7 | `settings-tab.ts` | text input component | input value editable |
| `Setting.setHeading` | `setHeading(): this` | 0.9.16 | `settings-tab.ts` | section heading | heading renders as section divider |
| `Component.onunload` | `onunload(): void` | 0.9.7 | `main.ts` | cleanup on unload | console.log verification |
| `Component.register` | `register(cb: () => any): void` | 0.9.7 | pending | register cleanup callback | pending |
| `Component.registerEvent` | `registerEvent(eventRef: EventRef): void` | 0.9.7 | `main.ts` | register cleanup-safe vault event listeners | events auto-cleaned on plugin unload |
| `Vault.on` (create) | `on(name: 'create', callback: (file: TAbstractFile) => any, ctx?: any): EventRef` | 0.9.7 | `main.ts` | listen for vault file creation | console.log on file create |
| `Vault.on` (modify) | `on(name: 'modify', callback: (file: TAbstractFile) => any, ctx?: any): EventRef` | 0.9.7 | `main.ts` | listen for vault file modification | console.log on file modify |
| `Vault.on` (delete) | `on(name: 'delete', callback: (file: TAbstractFile) => any, ctx?: any): EventRef` | 0.9.7 | `main.ts` | listen for vault file deletion | console.log on file delete |
| `Vault.on` (rename) | `on(name: 'rename', callback: (file: TAbstractFile, oldPath: string) => any, ctx?: any): EventRef` | 0.9.7 | `main.ts` | listen for vault file rename | console.log on file rename |
| `ItemView` | `abstract class ItemView extends View { contentEl: HTMLElement; constructor(leaf: WorkspaceLeaf); }` | 0.9.7 | `views/character-sheet-view.ts` | character sheet view base | view renders placeholder |
| `ViewCreator` | `type ViewCreator = (leaf: WorkspaceLeaf) => View` | — | `main.ts` | view factory for registerView | view created on leaf |
| `Vault.create` | `create(path: string, data: string, options?: DataWriteOptions): Promise<TFile>` | 0.9.7 | pending | create character file in vault | pending |
| `Vault.createFolder` | `createFolder(path: string): Promise<TFolder>` | 0.9.7 | pending | create character folder | pending |
| `Plugin` | `abstract class Plugin extends Component { app: App; manifest: PluginManifest; constructor(app: App, manifest: PluginManifest); }` | 0.9.7 | `main.ts` | plugin base class for DndCharacterPlugin | plugin extends Plugin |
| `TAbstractFile` | `abstract class TAbstractFile { vault: Vault; path: string; name: string; }` | 0.9.7 | `main.ts` | type for vault event callback file parameter | typed in event handlers |
| `App` | `class App { workspace: Workspace; vault: Vault; metadataCache: MetadataCache; }` | 0.9.7 | `settings-tab.ts` | app instance type for setting tab constructor | app passed to setting tab |
| `App.workspace` | `workspace: Workspace` | 0.9.7 | `main.ts` | access workspace for leaf operations | workspace accessed in command |
| `App.vault` | `vault: Vault` | 0.9.7 | `main.ts` | access vault for event registration | vault events registered |
| `WorkspaceLeaf` | `class WorkspaceLeaf extends WorkspaceItem { view: View; openFile(file: TFile): Promise<void>; setViewState(viewState: ViewState): Promise<void>; }` | — | `views/character-sheet-view.ts` | leaf type for view constructor | leaf passed to view |
| `TextComponent.setPlaceholder` | `setPlaceholder(placeholder: string): this` | 0.9.7 | `settings-tab.ts` | set placeholder text for text input | placeholder visible |
| `TextComponent.setValue` | `setValue(value: string): this` | 0.9.7 | `settings-tab.ts` | set initial value for text input | value pre-filled |
| `TextComponent.onChange` | `onChange(callback: (value: string) => any): this` | 0.9.7 | `settings-tab.ts` | react to text input changes | value persists on change |
| `Setting.setDisabled` | `setDisabled(disabled: boolean): this` | 1.2.3 | `settings-tab.ts` | disable setting row (read-only display) | row appears disabled |
| `SettingTab.containerEl` | `containerEl: HTMLElement` | — | `settings-tab.ts` | container element for setting tab content | container cleared and populated |
| `ItemView.contentEl` | `contentEl: HTMLElement` | — | `views/character-sheet-view.ts` | DOM container for character sheet content | content rendered in element |
| `ItemView.getViewType` | `abstract getViewType(): string` | 0.9.7 | `views/character-sheet-view.ts` | return view type identifier | returns dnd-character-sheet |
| `ItemView.getDisplayText` | `abstract getDisplayText(): string` | 0.9.7 | `views/character-sheet-view.ts` | return display name for view tab | shows Character Sheet |
| `ItemView.onOpen` | `protected onOpen(): Promise<void>` | 0.9.7 | `views/character-sheet-view.ts` | initialize view DOM on open | placeholder content rendered |
| `ItemView.onClose` | `protected onClose(): Promise<void>` | 0.9.7 | `views/character-sheet-view.ts` | clean up view DOM on close | content cleared |

## Notes

- `requestUrl` has no `@since` annotation in the pinned file. It is the current recommended API. The older `request` function is tagged `@since 0.12.11`.
- `WorkspaceLeaf.setViewState` and `Plugin.addCommand` have no `@since` annotation in the pinned file. Both are widely used in the official sample plugin.
- `Vault.process` requires Obsidian `1.1.0+`. Minimum app version must be selected in Phase 1 to confirm compatibility.
