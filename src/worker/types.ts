// Fallback declarations for Cloudflare Worker runtime bindings
export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[] }>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface KVNamespace {
  get(key: string, type?: "text" | "json" | "arrayBuffer" | "stream"): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<any>;
}

export interface ScheduledEvent {
  cron: string;
  type: string;
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS_BUCKET?: R2Bucket;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  CRON_SECRET?: string;
  ENVIRONMENT?: string;
  AI_PROVIDER?: "gemini" | "openai";
}

export interface ApiResponseMeta {
  generatedAt: string;
  source: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiResponseMeta;
}
