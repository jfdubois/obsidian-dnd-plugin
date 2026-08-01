/**
 * RequestUrl transport implementation of the CatalogClient interface.
 *
 * Uses Obsidian's `requestUrl` API to make HTTP GET requests to the
 * catalog server. All responses are validated against the catalog
 * contract types before being returned to callers.
 *
 * URL pattern: {baseUrl}/{revision}/{endpoint}
 *
 * Endpoints:
 * - /manifest        → fetchManifest
 * - /sources         → fetchSources
 * - /index/{kind}    → fetchIndex
 * - /entity/{id}     → fetchEntity
 * - /                → testConnection
 */

import { requestUrl } from "obsidian";
import type {
  CatalogRevision,
  RuleEntityKind,
  EntityId,
} from "@obsidian-dnd/domain";
import {
  catalogRevisionStr,
  entityIdStr,
} from "@obsidian-dnd/domain";
import type {
  CatalogManifest,
  CatalogSource,
  CatalogEntitySummary,
} from "@obsidian-dnd/catalog-contract";
import {
  isCatalogManifest,
  isCatalogSource,
  isCatalogEntitySummary,
  CATALOG_SCHEMA_VERSION,
} from "@obsidian-dnd/catalog-contract";
import type {
  CatalogClient,
  CatalogClientConfig,
  CatalogClientError,
  EntityDetailResult,
  SchemaNegotiationResult,
} from "./client";

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

  /* ── Manifest ────────────────────────────────────────────────── */

  async fetchManifest(
    catalogRevision: CatalogRevision,
  ): Promise<CatalogManifest> {
    const url = this.buildUrl(catalogRevision, "manifest");
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
    const url = this.buildUrl(catalogRevision, "sources");
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
    const url = this.buildUrl(catalogRevision, `index/${entityKind}`);
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
    entityId: EntityId,
  ): Promise<EntityDetailResult> {
    const url = this.buildUrl(catalogRevision, `entity/${entityIdStr(entityId)}`);
    const data = await this.fetchJson(url);

    return {
      data,
      catalogRevision,
    };
  }

  /* ── Connection test ─────────────────────────────────────────── */

  async testConnection(): Promise<boolean> {
    try {
      const _ = await this.fetchJson(this.baseUrl);
      return true;
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
   * Produces: {baseUrl}/{revision}/{endpoint}
   */
  private buildUrl(
    catalogRevision: CatalogRevision,
    endpoint: string,
  ): string {
    const revision = catalogRevisionStr(catalogRevision);
    return `${this.baseUrl}/${revision}/${endpoint}`;
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
        reject(this.createError(`Request timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(this.createError("Network request failed", undefined, error));
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
  ): CatalogClientError {
    const error: CatalogClientError = { message };
    if (status !== undefined) {
      error.status = status;
    }
    if (cause !== undefined) {
      error.cause = cause;
    }
    return error;
  }
}
