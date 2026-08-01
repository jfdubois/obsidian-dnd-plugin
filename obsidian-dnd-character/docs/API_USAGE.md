# Obsidian API Usage Register

Every Obsidian API member used in this project must have an entry before it appears in implementation code.

| Symbol | Verified signature | `@since` | Used in | Purpose | Manual test |
|---|---|---:|---|---|---|
| `requestUrl` | `requestUrl(request: RequestUrlParam \| string): RequestUrlResponsePromise` | — | pending | catalog HTTP client | pending |
| `Plugin.registerView` | `registerView(type: string, viewCreator: ViewCreator): void` | 0.9.7 | pending | character sidebar view | pending |
| `Workspace.getRightLeaf` | `getRightLeaf(split: boolean): WorkspaceLeaf \| null` | 0.9.7 | pending | right sidebar placement | pending |
| `WorkspaceLeaf.setViewState` | `setViewState(viewState: ViewState, eState?: any): Promise<void>` | — | pending | activate view | pending |
| `Plugin.onload` | `onload(): Promise<void> \| void` | 0.9.7 | `main.ts` | plugin initialization lifecycle | console.log verification |
| `Plugin.loadData` | `loadData(): Promise<any>` | 0.9.7 | `main.ts` | load persisted plugin settings | settings normalized on load |
| `Plugin.saveData` | `saveData(data: any): Promise<void>` | 0.9.7 | `main.ts` | persist plugin settings on unload | settings saved on unload |
| `Vault.cachedRead` | `cachedRead(file: TFile): Promise<string>` | 0.9.7 | pending | read display data | pending |
| `Vault.process` | `process(file: TFile, fn: (data: string) => string, options?: DataWriteOptions): Promise<string>` | 1.1.0 | pending | atomic character update | pending |
| `Plugin.addCommand` | `addCommand(command: Command): Command` | — | pending | register plugin commands | pending |
| `Plugin.addSettingTab` | `addSettingTab(settingTab: PluginSettingTab): void` | 0.9.7 | pending | settings tab | pending |
| `Component.onunload` | `onunload(): void` | 0.9.7 | `main.ts` | cleanup on unload | console.log verification |
| `Component.register` | `register(cb: () => any): void` | 0.9.7 | pending | register cleanup callback | pending |
| `Component.registerEvent` | `registerEvent(eventRef: EventRef): void` | 0.9.7 | pending | register event listener cleanup | pending |
| `ItemView` | `abstract class ItemView extends View { contentEl: HTMLElement; constructor(leaf: WorkspaceLeaf); }` | 0.9.7 | pending | character sheet view base | pending |
| `ViewCreator` | `type ViewCreator = (leaf: WorkspaceLeaf) => View` | — | pending | view factory for registerView | pending |
| `Vault.create` | `create(path: string, data: string, options?: DataWriteOptions): Promise<TFile>` | 0.9.7 | pending | create character file in vault | pending |
| `Vault.createFolder` | `createFolder(path: string): Promise<TFolder>` | 0.9.7 | pending | create character folder | pending |

## Notes

- `requestUrl` has no `@since` annotation in the pinned file. It is the current recommended API. The older `request` function is tagged `@since 0.12.11`.
- `WorkspaceLeaf.setViewState` and `Plugin.addCommand` have no `@since` annotation in the pinned file. Both are widely used in the official sample plugin.
- `Vault.process` requires Obsidian `1.1.0+`. Minimum app version must be selected in Phase 1 to confirm compatibility.
