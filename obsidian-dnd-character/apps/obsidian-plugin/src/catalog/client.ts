/**
 * Catalog client interface.
 *
 * Defines the contract between the plugin and the catalog server.
 * Implementations may use network transport or local cache; the
 * plugin only depends on this interface.
 *
 * Responsibilities of the interface:
 * - Fetch catalog manifest and metadata
 * - Fetch source metadata
 * - Fetch entity indexes
 * - Fetch individual entity details
 * - Test server connectivity
 * - Negotiate schema version compatibility
 *
 * All methods accept a {@link CatalogRevision} branded identifier
 * so that the revision is always explicit in the call site.
 */

import type {
  CatalogRevision,
  RuleEntityKind,
  EntityId,
} from "@obsidian-dnd/domain";
import type {
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";

/* ── Configuration ─────────────────────────────────────────────── */

/**
 * Configuration for a catalog client instance.
 */
export interface CatalogClientConfig {
  /** Base URL of the catalog server (e.g. "https://catalog.example.com/catalog/v1"). */
  baseUrl: string;
  /** Maximum time in milliseconds to wait for a response. */
  timeoutMs?: number;
}

/* ── Error types ───────────────────────────────────────────────── */

/**
 * Error raised when the catalog server is unreachable or returns
 * an unexpected response.
 */
export interface CatalogClientError {
  /** Human-readable message. */
  message: string;
  /** HTTP status code if available. */
  status?: number;
  /** Underlying cause. */
  cause?: unknown;
}

/* ── Entity detail result ──────────────────────────────────────── */

/**
 * Result of fetching an individual entity detail.
 * The `data` field is typed as `unknown` because the shape
 * depends on the entity kind. Callers should validate the
 * returned data against the expected entity rule type.
 */
export interface EntityDetailResult {
  /** The raw entity detail payload. */
  data: unknown;
  /** The catalog revision this detail came from. */
  catalogRevision: CatalogRevision;
}

/* ── Schema negotiation result ─────────────────────────────────── */

/**
 * Result of schema version negotiation between the plugin
 * and the catalog server.
 */
export interface SchemaNegotiationResult {
  /** Whether the server schema version is compatible. */
  compatible: boolean;
  /** The server's schema version. */
  serverSchemaVersion: number;
  /** The plugin's expected schema version. */
  pluginSchemaVersion: number;
  /** Optional details about the incompatibility. */
  reason?: string;
}

/* ── Catalog client interface ──────────────────────────────────── */

export interface CatalogClient {
  /* ── Manifest ────────────────────────────────────────────────── */

  /**
   * Fetch the catalog manifest for a specific revision.
   *
   * The manifest contains the revision identifier, schema version,
   * supported rulesets, entity kinds, and file checksums.
   *
   * @param catalogRevision - The catalog revision to fetch.
   * @returns The validated catalog manifest.
   * @throws {CatalogClientError} if the manifest cannot be fetched or is invalid.
   */
  fetchManifest(catalogRevision: CatalogRevision): Promise<CatalogManifest>;

  /* ── Source metadata ─────────────────────────────────────────── */

  /**
   * Fetch the list of source books available in the catalog.
   *
   * Each source record includes the source ID, name, abbreviation,
   * ruleset, publication date, and content category.
   *
   * @param catalogRevision - The catalog revision to fetch.
   * @returns An array of source metadata records.
   * @throws {CatalogClientError} if the sources cannot be fetched.
   */
  fetchSources(catalogRevision: CatalogRevision): Promise<CatalogSource[]>;

  /* ── Indexes ─────────────────────────────────────────────────── */

  /**
   * Fetch the entity index for a specific entity kind.
   *
   * The index is a compact list of {@link CatalogEntitySummary}
   * records used for search and selection before lazy-loading
   * full entity details.
   *
   * @param catalogRevision - The catalog revision to fetch.
   * @param entityKind - The kind of entities to index.
   * @returns An array of entity summary records.
   * @throws {CatalogClientError} if the index cannot be fetched.
   */
  fetchIndex(
    catalogRevision: CatalogRevision,
    entityKind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]>;

  /* ── Entity details ──────────────────────────────────────────── */

  /**
   * Fetch the full detail for a single entity.
   *
   * The returned data shape depends on the entity kind. Callers
   * should validate the result against the expected rule type
   * (e.g. {@link SpeciesRule}, {@link SpellRule}).
   *
   * @param catalogRevision - The catalog revision to fetch.
   * @param entityId - The canonical entity identifier.
   * @returns The entity detail result with raw data and revision.
   * @throws {CatalogClientError} if the entity cannot be fetched.
   */
  fetchEntity(
    catalogRevision: CatalogRevision,
    entityId: EntityId,
  ): Promise<EntityDetailResult>;

  /* ── Connection test ─────────────────────────────────────────── */

  /**
   * Test whether the catalog server is reachable and responsive.
   *
   * This is a lightweight check used during plugin startup and
   * settings validation. It does not fetch any catalog data.
   *
   * @returns `true` if the server responds, `false` otherwise.
   */
  testConnection(): Promise<boolean>;

  /* ── Schema negotiation ──────────────────────────────────────── */

  /**
   * Check whether a server schema version is compatible with
   * the plugin's expected schema version.
   *
   * Used during revision activation to ensure the plugin can
   * correctly interpret the catalog data.
   *
   * @param serverSchemaVersion - The schema version reported by the server.
   * @returns A negotiation result indicating compatibility.
   */
  negotiateSchema(serverSchemaVersion: number): SchemaNegotiationResult;
}
