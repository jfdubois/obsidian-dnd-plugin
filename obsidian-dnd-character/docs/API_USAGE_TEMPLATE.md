# Obsidian API Usage Register

Rename this file to `API_USAGE.md` during Phase 0.

| Symbol | Verified signature | `@since` | Used in | Purpose | Manual test |
|---|---|---:|---|---|---|
| `requestUrl` | `requestUrl(request: RequestUrlParam | string): RequestUrlResponsePromise` | see pinned file | pending | catalog HTTP client | pending |
| `Plugin.registerView` | `registerView(type: string, viewCreator: ViewCreator): void` | 0.9.7 | pending | character sidebar view | pending |
| `Workspace.getRightLeaf` | `getRightLeaf(split: boolean): WorkspaceLeaf | null` | 0.9.7 | pending | right sidebar placement | pending |
| `WorkspaceLeaf.setViewState` | `setViewState(viewState: ViewState, eState?: any): Promise<void>` | see pinned file | pending | activate view | pending |
| `Plugin.loadData` | `loadData(): Promise<any>` | 0.9.7 | pending | plugin settings | pending |
| `Plugin.saveData` | `saveData(data: any): Promise<void>` | 0.9.7 | pending | plugin settings | pending |
| `Vault.cachedRead` | `cachedRead(file: TFile): Promise<string>` | 0.9.7 | pending | read display data | pending |
| `Vault.process` | `process(file: TFile, fn: (data: string) => string, options?: DataWriteOptions): Promise<string>` | 1.1.0 | pending | atomic character update | pending |

The exact generic/rendered signature must be copied from the pinned local file, not from this template, before use.
