/**
 * Transport-specific tests for RequestUrlCatalogClient.
 *
 * Validates URL construction, error wrapping, and timeout behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CatalogClientError } from "./client";
import { RequestUrlCatalogClient } from "./request-url-client";
import {
  createCatalogRevision,
  createEntityId,
} from "@obsidian-dnd/domain";
import type { CatalogRevision, EntityId } from "@obsidian-dnd/domain";
import type { CatalogManifest } from "@obsidian-dnd/catalog-contract";
import { createCatalogManifest } from "@obsidian-dnd/catalog-contract";

/* ── Mock setup ────────────────────────────────────────────────── */

const mockRequestUrl = vi.fn();

vi.mock("obsidian", () => ({
  requestUrl: (...args: unknown[]) => mockRequestUrl(...args),
}));

/* ── Test helpers ──────────────────────────────────────────────── */

function createMockManifest(catalogRevision: CatalogRevision): CatalogManifest {
  return createCatalogManifest({
    schemaVersion: 1,
    catalogRevision,
    sourceRevision: "src-001",
    builderVersion: "0.1.0",
    generatedAt: "2026-01-01T00:00:00Z",
    rulesets: ["2024"],
    entityKinds: [
      "species",
      "background",
      "class",
      "subclass",
      "class-feature",
      "subclass-feature",
      "feat",
      "spell",
      "item",
      "optional-feature",
      "skill",
      "language",
    ],
    checksums: {},
  });
}

function mockResponse(json: unknown, status = 200) {
  mockRequestUrl.mockResolvedValue({
    status,
    headers: { "content-type": "application/json" },
    arrayBuffer: new ArrayBuffer(0),
    json,
    text: JSON.stringify(json),
  });
}

function mockNetworkError() {
  mockRequestUrl.mockRejectedValue(new Error("network failure"));
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("RequestUrlCatalogClient transport", () => {
  const baseUrl = "https://catalog.example.com/catalog/v1";
  const revision: CatalogRevision = createCatalogRevision("rev-001");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── URL construction ────────────────────────────────────────── */

  describe("URL construction", () => {
    it("constructs correct manifest URL", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse(createMockManifest(revision));

      await client.fetchManifest(revision);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/rev-001/manifest`,
        }),
      );
    });

    it("constructs correct sources URL", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse([]);

      await client.fetchSources(revision);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/rev-001/sources`,
        }),
      );
    });

    it("constructs correct index URL with entity kind", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse([]);

      await client.fetchIndex(revision, "spell");

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/rev-001/index/spell`,
        }),
      );
    });

    it("constructs correct entity URL with entity id", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse({});

      const entityId: EntityId = createEntityId("class:2024:xphb:fighter");
      await client.fetchEntity(revision, entityId);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/rev-001/entity/class:2024:xphb:fighter`,
        }),
      );
    });

    it("uses base URL + /current.json for connection test", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        arrayBuffer: new ArrayBuffer(0),
        json: { currentRevision: "rev-001" },
        text: JSON.stringify({ currentRevision: "rev-001" }),
      });
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        arrayBuffer: new ArrayBuffer(0),
        json: createMockManifest(revision),
        text: JSON.stringify(createMockManifest(revision)),
      });

      await client.testConnection();

      expect(mockRequestUrl).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          url: `${baseUrl}/current.json`,
        }),
      );
    });

    it("strips trailing slashes from baseUrl", async () => {
      const client = new RequestUrlCatalogClient({
        baseUrl: `${baseUrl}///`,
      });
      mockResponse(createMockManifest(revision));

      await client.fetchManifest(revision);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/rev-001/manifest`,
        }),
      );
    });
  });

  /* ── Error wrapping ──────────────────────────────────────────── */

  describe("error wrapping", () => {
    it("includes status code for HTTP errors", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse({}, 403);

      const error = await client.fetchManifest(revision).catch((e) => e);
      expect((error as CatalogClientError).status).toBe(403);
      expect((error as CatalogClientError).message).toContain("403");
    });

    it("includes cause for network failures", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockNetworkError();

      const error = await client.fetchManifest(revision).catch((e) => e);
      expect((error as CatalogClientError).cause).toBeDefined();
      expect((error as CatalogClientError).status).toBeUndefined();
    });

    it("preserves error message", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse({}, 500);

      const error = await client.fetchManifest(revision).catch((e) => e);
      expect((error as CatalogClientError).message).toContain("500");
    });
  });

  /* ── Timeout ─────────────────────────────────────────────────── */

  describe("timeout", () => {
    it("uses default timeout when not configured", () => {
      const client = new RequestUrlCatalogClient({
        baseUrl: "https://example.com",
      });
      expect(client).toBeDefined();
    });

    it("throws on timeout for slow requests", async () => {
      const client = new RequestUrlCatalogClient({
        baseUrl: "https://example.com",
        timeoutMs: 10,
      });

      mockRequestUrl.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          status: 200,
          headers: {},
          arrayBuffer: new ArrayBuffer(0),
          json: {},
          text: "{}",
        }), 100)),
      );

      // testConnection catches errors and returns false;
      // use fetchManifest which propagates the timeout error
      await expect(client.fetchManifest(revision)).rejects.toThrow(/timed out/);
    });

    it("does not timeout for fast requests", async () => {
      const client = new RequestUrlCatalogClient({
        baseUrl: "https://example.com",
        timeoutMs: 1000,
      });

      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        arrayBuffer: new ArrayBuffer(0),
        json: { currentRevision: "rev-001" },
        text: JSON.stringify({ currentRevision: "rev-001" }),
      });
      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        headers: { "content-type": "application/json" },
        arrayBuffer: new ArrayBuffer(0),
        json: createMockManifest(revision),
        text: JSON.stringify(createMockManifest(revision)),
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
    });
  });

  /* ── Request method ──────────────────────────────────────────── */

  describe("request configuration", () => {
    it("sends GET method", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse(createMockManifest(revision));

      await client.fetchManifest(revision);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("sets throw to false", async () => {
      const client = new RequestUrlCatalogClient({ baseUrl });
      mockResponse(createMockManifest(revision));

      await client.fetchManifest(revision);

      expect(mockRequestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          throw: false,
        }),
      );
    });
  });
});
