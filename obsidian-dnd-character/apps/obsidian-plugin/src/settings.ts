/** Plugin settings schema and normalization helpers. */

export interface DndCharacterPluginSettings {
	/** URL of the catalog server (empty string means not configured). */
	catalogServerUrl: string;
	/** Active catalog revision ID (empty string means not set). */
	catalogRevision: string;
	/** Optional 5eTools web UI base URL; empty means external links are disabled. */
	fiveEToolsWebBaseUrl?: string;
	/** Vault-relative path to characters folder. */
	charactersVaultPath: string;
	/** Settings schema version for migrations. */
	schemaVersion: number;
}

export const DEFAULT_SETTINGS: DndCharacterPluginSettings = {
	catalogServerUrl: '',
	catalogRevision: '',
	charactersVaultPath: 'dnd-characters',
	fiveEToolsWebBaseUrl: '',
	schemaVersion: 2,
};

/**
 * Validate raw persisted data and return a properly-typed settings object
 * with defaults applied for any missing or invalid fields.
 *
 * Accepts `unknown` per project rules for persisted values.
 */
export function normalizeSettings(raw: unknown): DndCharacterPluginSettings {
	if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ...DEFAULT_SETTINGS };
	}

	const fiveEToolsWebBaseUrl = typeof (raw as Record<string, unknown>).fiveEToolsWebBaseUrl === 'string'
		? (raw as Record<string, unknown>).fiveEToolsWebBaseUrl as string
		: DEFAULT_SETTINGS.fiveEToolsWebBaseUrl;
	return {
		catalogServerUrl:
			typeof (raw as Record<string, unknown>).catalogServerUrl === 'string'
				? (raw as Record<string, unknown>).catalogServerUrl as string
				: DEFAULT_SETTINGS.catalogServerUrl,
		catalogRevision:
			typeof (raw as Record<string, unknown>).catalogRevision === 'string'
				? (raw as Record<string, unknown>).catalogRevision as string
				: DEFAULT_SETTINGS.catalogRevision,
		charactersVaultPath:
			typeof (raw as Record<string, unknown>).charactersVaultPath === 'string'
				? (raw as Record<string, unknown>).charactersVaultPath as string
				: DEFAULT_SETTINGS.charactersVaultPath,
		fiveEToolsWebBaseUrl,
		schemaVersion:
			typeof (raw as Record<string, unknown>).schemaVersion === 'number'
				? (raw as Record<string, unknown>).schemaVersion as number
				: DEFAULT_SETTINGS.schemaVersion,
	};
}
