/**
 * RequestUrl transport implementation of the CatalogClient interface.
 *
 * Uses Obsidian's `requestUrl` API to make HTTP GET requests to the
 * catalog server. All responses are validated against the catalog
 * contract types before being returned to callers.
 *
 * URL pattern: {baseUrl}/revisions/{revision}/{artifact}
 *
 * Artifacts (static file layout):
 * - /current.json       → fetchCurrentRevision
 * - /manifest.json      → fetchManifest
 * - /sources.json       → fetchSources
 * - /indexes/{kind}.json → fetchIndex
 * - /{detailPath}       → fetchEntity
 */

import { requestUrl } from "obsidian";
import type {
  CatalogRevision,
  RuleEntityKind,
} from "@obsidian-dnd/domain";
import { createCatalogRevision } from "@obsidian-dnd/domain";
import type {
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import {
  isCatalogManifest,
  isCatalogSource,
  isCatalogEntitySummary,
  isCurrentRevision,
  isEntityDetailResponse,
  CATALOG_SCHEMA_VERSION,
  KIND_INDEX_FILENAME,
  validateArtifactPath,
  buildCatalogArtifactUrl,
} from "@obsidian-dnd/catalog-contract";
import type {
  CatalogClient,
  CatalogClientConfig,
  CatalogClientError,
  EntityDetailResult,
  SchemaNegotiationResult,
} from "./client";
import { validateConnection } from "./connection-test";

/* ── Constants ─────────────────────────────────────────────────── */

const DEFAULT_TIMEOUT_MS = 30_000;

/* ── Implementation ────────────────────────────────────────────── */

export class RequestUrlCatalogClient implements CatalogClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: CatalogClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /* ── Current revision pointer ────────────────────────────────── */

  async fetchCurrentRevision(): Promise<string> {
    const url = `${this.baseUrl}/current.json`;
    const data = await this.fetchJson(url);

    if (!isCurrentRevision(data)) {
      throw this.createError(
        "Invalid current.json: response does not match CurrentRevision schema",
      );
    }

    return data.currentRevision;
  }

  /* ── Manifest ────────────────────────────────────────────────── */

  async fetchManifest(
    catalogRevision: CatalogRevision,
  ): Promise<CatalogManifest> {
    const url = this.buildUrl(catalogRevision, "manifest.json");
    const data = await this.fetchJson(url);

    if (!isCatalogManifest(data)) {
      throw this.createError(
        "Invalid manifest: response does not match CatalogManifest schema",
      );
    }

    return data;
  }

  /* ── Source metadata ─────────────────────────────────────────── */

  async fetchSources(
    catalogRevision: CatalogRevision,
  ): Promise<CatalogSource[]> {
    const url = this.buildUrl(catalogRevision, "sources.json");
    const data = await this.fetchJson(url);

    if (!Array.isArray(data)) {
      throw this.createError(
        "Invalid sources: response is not an array",
      );
    }

    for (let i = 0; i < data.length; i++) {
      if (!isCatalogSource(data[i])) {
        throw this.createError(
          `Invalid sources: entry at index ${i} does not match CatalogSource schema`,
        );
      }
    }

    return data as CatalogSource[];
  }

  /* ── Indexes ─────────────────────────────────────────────────── */

  async fetchIndex(
    catalogRevision: CatalogRevision,
    entityKind: RuleEntityKind,
  ): Promise<CatalogEntitySummary[]> {
    const indexFilename = KIND_INDEX_FILENAME[entityKind];
    const url = this.buildUrl(catalogRevision, `indexes/${indexFilename}`);
    const data = await this.fetchJson(url);

    if (!Array.isArray(data)) {
      throw this.createError(
        `Invalid index for ${entityKind}: response is not an array`,
      );
    }

    for (let i = 0; i < data.length; i++) {
      if (!isCatalogEntitySummary(data[i])) {
        throw this.createError(
          `Invalid index for ${entityKind}: entry at index ${i} does not match CatalogEntitySummary schema`,
        );
      }
    }

    return data as CatalogEntitySummary[];
  }

  /* ── Entity details ──────────────────────────────────────────── */

  async fetchEntity(
    catalogRevision: CatalogRevision,
    detailPath: string,
  ): Promise<EntityDetailResult> {
    validateArtifactPath(detailPath);
    const url = this.buildUrl(catalogRevision, detailPath);
    const raw = await this.fetchJson(url);

    if (!isEntityDetailResponse(raw)) {
      throw this.createError(
        `Invalid entity detail for ${detailPath}: response does not match any known entity rule schema`,
      );
    }

    return {
      data: raw,
      catalogRevision,
    };
  }

  /* ── Connection test ─────────────────────────────────────────── */

  async testConnection(): Promise<boolean> {
    try {
      const revisionId = await this.fetchCurrentRevision();
      const manifest = await this.fetchManifest(
        createCatalogRevision(revisionId),
      );
      const result = validateConnection(manifest);
      return result.valid;
    } catch {
      return false;
    }
  }

  /* ── Schema negotiation ──────────────────────────────────────── */

  negotiateSchema(serverSchemaVersion: number): SchemaNegotiationResult {
    const pluginSchemaVersion = CATALOG_SCHEMA_VERSION;

    if (serverSchemaVersion === pluginSchemaVersion) {
      return {
        compatible: true,
        serverSchemaVersion,
        pluginSchemaVersion,
      };
    }

    return {
      compatible: false,
      serverSchemaVersion,
      pluginSchemaVersion,
      reason: `Server schema version ${serverSchemaVersion} does not match plugin schema version ${pluginSchemaVersion}`,
    };
  }

  /* ── Private helpers ─────────────────────────────────────────── */

  /**
    * Construct a catalog endpoint URL from the base URL, revision,
    * and endpoint path.
    *
    * Produces: {baseUrl}/revisions/{revision}/{endpoint}
    */
  private buildUrl(
    catalogRevision: CatalogRevision,
    endpoint: string,
  ): string {
    return buildCatalogArtifactUrl(this.baseUrl, catalogRevision, endpoint);
  }

  /**
   * Perform a GET request with timeout and parse the JSON response.
   *
   * Uses `requestUrl` from the Obsidian API with `throw: false` so
   * that non-200 status codes are captured and wrapped in a
   * CatalogClientError with the HTTP status code.
   */
  private async fetchJson(url: string): Promise<unknown> {
    const response = await this.withTimeout(
      requestUrl({
        url,
        method: "GET",
        throw: false,
      }),
    );

    if (response.status < 200 || response.status >= 300) {
      throw this.createError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }

    return response.json;
  }

  /**
   * Wrap a promise with a configurable timeout.
   *
   * If the promise does not resolve within `this.timeoutMs`, a
   * CatalogClientError is thrown.
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(this.createError(`Request timed out after ${this.timeoutMs}ms`, undefined, undefined, true));
      }, this.timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(this.createError("Network request failed", undefined, error, true));
        });
    });
  }

  /**
   * Create a CatalogClientError with the given message, optional
   * HTTP status code, and optional underlying cause.
   */
  private createError(
    message: string,
    status?: number,
    cause?: unknown,
    transport?: true,
  ): CatalogClientError {
    const error: CatalogClientError = { message };
    if (status !== undefined) {
      error.status = status;
    }
    if (cause !== undefined) {
      error.cause = cause;
    }
    if (transport !== undefined) {
      error.transport = transport;
    }
    return error;
  }
}
