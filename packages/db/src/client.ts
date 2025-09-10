import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import Keyv from "keyv";

import * as schema from "./schema";

// Define cache config interface
interface CacheConfig {
  ex?: number;
}

// --- In-memory cache class ---
class MemoryCache {
  private kv: Keyv;
  private writeCache: Keyv;
  private usedTablesPerKey: Record<string, string[]> = {};

  constructor(ttlSeconds = 300) {
    this.kv = new Keyv({ ttl: ttlSeconds * 1000 }); // ms
    this.writeCache = new Keyv({ ttl: ttlSeconds * 1000 }); // Cache writes for same duration
  }

  strategy(): "explicit" | "all" {
    return "all"; // cache everything by default
  }

  async get(key: string) {
    return (await this.kv.get(key)) ?? undefined;
  }

  async put(
    hashedQuery: string,
    response: any,
    tables: string[],
    isTag: boolean,
    config?: CacheConfig,
  ): Promise<void> {
    const ttlMs = (config?.ex ?? 300) * 1000;
    await this.kv.set(hashedQuery, response, ttlMs);

    // Track tables for invalidation
    for (const table of tables) {
      if (!this.usedTablesPerKey[table]) this.usedTablesPerKey[table] = [];
      this.usedTablesPerKey[table].push(hashedQuery);
    }
  }

  async onMutate(params: {
    tags: string | string[];
    tables: string | string[];
  }) {
    const tables = Array.isArray(params.tables)
      ? params.tables
      : [params.tables];
    for (const table of tables) {
      const keys = this.usedTablesPerKey[table] ?? [];
      for (const key of keys) await this.kv.delete(key);
      this.usedTablesPerKey[table] = [];
    }
  }

  // Write cache methods
  async hasWritten(table: string, data: any): Promise<boolean> {
    const key = this.generateWriteKey(table, data);
    const exists = await this.writeCache.get(key);
    return exists !== undefined;
  }

  async markWritten(table: string, data: any): Promise<void> {
    const key = this.generateWriteKey(table, data);
    await this.writeCache.set(key, true);
  }

  async clearWriteCache(table?: string): Promise<void> {
    if (table) {
      // Clear specific table's write cache
      // Note: Keyv doesn't have built-in pattern deletion, so we'll clear all
      await this.writeCache.clear();
    } else {
      await this.writeCache.clear();
    }
  }

  private generateWriteKey(table: string, data: any): string {
    // Create a deterministic key based on table and data
    const dataStr = JSON.stringify(data, Object.keys(data).sort());
    return `write:${table}:${this.hash(dataStr)}`;
  }

  private hash(str: string): string {
    // Simple hash function for consistent key generation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

const cache = new MemoryCache(300); // 5 min TTL

export const db = drizzle({
  client: sql,
  schema,
  casing: "snake_case",
  cache,
});

// Helper functions for write cache
export async function insertIfNotCached<T extends Record<string, any>>(
  table: string,
  data: T | T[],
  insertFn: () => Promise<any>,
): Promise<{ inserted: boolean; result?: any }> {
  const dataArray = Array.isArray(data) ? data : [data];

  // Check if all items have been written before
  const hasWrittenResults = await Promise.all(
    dataArray.map((item) => cache.hasWritten(table, item)),
  );

  const allAlreadyWritten = hasWrittenResults.every((written) => written);

  if (allAlreadyWritten) {
    console.log(
      `[WRITE CACHE] Skipping insert to ${table} - data already written`,
    );
    return { inserted: false };
  }

  // Mark items as written before executing insert
  await Promise.all(dataArray.map((item) => cache.markWritten(table, item)));

  // Execute the insert
  console.log(`[WRITE CACHE] Executing insert to ${table}`);
  const result = await insertFn();

  return { inserted: true, result };
}

export async function clearWriteCache(table?: string): Promise<void> {
  await cache.clearWriteCache(table);
}
