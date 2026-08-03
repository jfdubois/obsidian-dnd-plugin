/**
 * Adapter that wraps Obsidian's {@link requestUrl} API to produce
 * a standard {@link Fetcher}-compatible function.
 *
 * The {@link CatalogRuntimeService} expects a fetcher with the
 * signature `(url: string, init?: RequestInit) => Promise<Response>`.
 * Obsidian's `requestUrl` returns a {@link RequestUrlResponse}
 * instead of a standard `Response`, so this adapter bridges the gap.
 *
 * Only the properties actually consumed by the runtime service
 * (`status` and `json()`) are exercised at runtime.
 */

import { requestUrl } from "obsidian";
import type { Fetcher } from "@obsidian-dnd/catalog-contract";

/**
 * Create a Fetcher that delegates to Obsidian's requestUrl API.
 *
 * @returns A Fetcher-compatible function.
 */
export function createObsidianFetcher(): Fetcher {
  return async (input: string, _init?: RequestInit): Promise<Response> => {
    const options = {
      url: input,
      method: _init?.method ?? "GET",
      throw: false,
    } as const;

    const raw = await requestUrl(options);

    const ok = raw.status >= 200 && raw.status < 300;
    const body: ReadableStream<Uint8Array> | null = null;

    // Build a Response-compatible object. CatalogRuntimeService
    // only consumes `status` and `json()` at runtime.
    const responseObj: Response = {
      // Body interface
      body,
      bodyUsed: false,
      arrayBuffer: async () => raw.arrayBuffer,
      blob: async () => new Blob(),
      bytes: async () => new Uint8Array(),
      formData: async () => new FormData(),
      json: async () => raw.json,
      text: async () => raw.text,
      // Response interface
      headers: new Headers(),
      ok,
      redirected: false,
      status: raw.status,
      statusText: "",
      type: "basic" as Response["type"],
      url: input,
      clone: () => responseObj,
    };

    return responseObj;
  };
}
