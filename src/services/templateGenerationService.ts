import { apiClient, ApiResponse } from "./apiClient";
import type { Template, TemplateKind } from "./templateService";

// AI template generation (Google Stitch, run by the EventQRapp backend: the browser never talks to the provider and never
// sees its credential). A request becomes a job that is polled until it finishes.

export type GenerationStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "CONCEPT_ONLY" | "FAILED";

export interface GenerationVariant {
  index: number;
  /** true only when the concept was converted into a valid template; otherwise it is a picture to look at, not a template */
  ready: boolean;
  fidelity: "STYLE_ADAPTED" | "NONE";
  notes: string[];
  /** what the provider drew (media:<id>) */
  conceptImageKey?: string;
  /** the converted template with sample details, as EventQRapp will draw it (media:<id>) */
  previewImageKey?: string;
  templateId?: string;
}

export interface GenerationJob {
  id: string;
  kind: TemplateKind;
  preset: string;
  mode: "CREATE" | "EDIT" | "VARIATIONS";
  prompt: string;
  status: GenerationStatus;
  variantCount: number;
  error?: { code: string; message: string };
  variants: GenerationVariant[];
  createdAt: string;
  finishedAt?: string;
}

export interface GenerationOptions {
  available: boolean;
  presets: { id: string; kind: TemplateKind; width: number; height: number; label: string }[];
  moods: string[];
  usage?: { used: number; limit: number | null; remaining: number | null; resetsAt?: string | null };
  limits: { promptMin: number; promptMax: number; changeMax: number; maxVariants: number; dailyQuota: number };
}

export interface CreateGenerationPayload {
  kind: TemplateKind;
  preset: string;
  prompt: string;
  style?: { mood?: string; colorHint?: string };
  variantCount?: number;
  idempotencyKey?: string;
}

export type GenerationResult<T> = ApiResponse<T> & { deduplicated?: boolean; usage?: NonNullable<GenerationOptions["usage"]> };

const base = "/api/v1/template-generations";

export const templateGenerationService = {
  getOptions: () => apiClient<GenerationOptions>(`${base}/options`, { method: "GET" }, true),
  create: (payload: CreateGenerationPayload) => apiClient<GenerationJob>(base, { method: "POST", body: JSON.stringify(payload) }, true) as Promise<GenerationResult<GenerationJob>>,
  list: (limit = 8) => apiClient<GenerationJob[]>(`${base}?limit=${limit}`, { method: "GET" }, true),
  get: (id: string) => apiClient<GenerationJob>(`${base}/${id}`, { method: "GET" }, true),
  remove: (id: string) => apiClient(`${base}/${id}`, { method: "DELETE" }, true),
  edit: (id: string, index: number, prompt: string, idempotencyKey?: string) =>
    apiClient<GenerationJob>(`${base}/${id}/variants/${index}/edit`, { method: "POST", body: JSON.stringify({ prompt, idempotencyKey }) }, true) as Promise<GenerationResult<GenerationJob>>,
  variations: (id: string, index: number, prompt: string, variantCount: number, idempotencyKey?: string) =>
    apiClient<GenerationJob>(`${base}/${id}/variants/${index}/variations`, { method: "POST", body: JSON.stringify({ prompt, variantCount, idempotencyKey }) }, true) as Promise<GenerationResult<GenerationJob>>,
  /** Change a design that is already saved as a template; the result can replace that template (see save) */
  editSaved: (templateId: string, prompt: string, idempotencyKey?: string) =>
    apiClient<GenerationJob>(`${base}/from-template/${templateId}/edit`, { method: "POST", body: JSON.stringify({ prompt, idempotencyKey }) }, true) as Promise<GenerationResult<GenerationJob>>,
  save: (id: string, index: number, payload: { name: string; categoryId?: string; subcategoryId?: string; publish?: boolean; replaceTemplateId?: string }) =>
    apiClient<Template>(`${base}/${id}/variants/${index}/save`, { method: "POST", body: JSON.stringify(payload) }, true),
};
