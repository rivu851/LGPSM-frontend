import { listAllPages } from "./listAll";
import { apiClient, ApiResponse, API_BASE_URL } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

// Mirrors CARD_DESIGNS in the backend's Template model — the actual server-rendered invitation
// card layout a template produces, independent of its name/category/preview image.
export const CARD_DESIGNS = [
  "CLASSIC",
  "CORPORATE_V1",
  "CORPORATE_V2",
  "WEDDING",
  "RICE_CEREMONY",
  "BIRTHDAY",
] as const;
// CUSTOM is drawn from a stored design specification (AI-generated templates). It is not one an admin picks from
// the list above: the backend only creates it through the AI generation workflow.
export type CardDesign = (typeof CARD_DESIGNS)[number] | "CUSTOM";
export type TemplateKind = "INVITATION" | "POSTER";

export const CARD_DESIGN_LABELS: Record<CardDesign, string> = {
  CUSTOM: "AI-generated design",
  CLASSIC: "Classic",
  CORPORATE_V1: "Corporate — Award",
  CORPORATE_V2: "Corporate — Summit",
  WEDDING: "Wedding",
  RICE_CEREMONY: "Rice Ceremony",
  BIRTHDAY: "Birthday",
};

export interface Template {
  _id: string;
  id?: string;
  name: string;
  categoryId?: string | any;
  subcategoryId?: string;
  previewImageKey?: string;
  templateData?: Record<string, any>;
  cardDesign?: CardDesign;
  kind?: TemplateKind;
  /** Set on AI-generated templates: the organizer (or admin) who made it */
  ownerId?: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultTemplatePlan {
  templatesToCreate: { name: string; cardDesign: string; category: string; subcategory?: string }[];
  templatesPresent: string[];
  categoriesToCreate: string[];
  subcategoriesToCreate: { category: string; subcategory: string }[];
}

export interface DefaultTemplateInstallResult extends DefaultTemplatePlan {
  created: string[];
}

export interface TemplatePreviewPayload {
  title?: string;
  startIso?: string;
  endIso?: string;
  venue?: string;
  locationSub?: string;
  isVirtual?: boolean;
  categoryName?: string;
  subcategoryName?: string;
  /** an uploaded image only ("media:<id>") */
  logoKey?: string;
  /** "Additional Info": which guest details fill the card's two guest lines (sample labels in previews) */
  cardInfo?: { primary: "INVITEE_NAME" | "COMPANY_NAME" | "PROFESSIONAL_IDENTITY" | "SECONDARY_IDENTITY" | null; secondary: "INVITEE_NAME" | "COMPANY_NAME" | "PROFESSIONAL_IDENTITY" | "SECONDARY_IDENTITY" | null; identityLabel?: string | null; secondaryIdentityLabel?: string | null };
}

export const templateService = {
  /**
   * The card this template makes for the event being entered, rendered by the server (nothing is saved).
   * POST /api/v1/templates/:id/preview (or /api/v1/templates/preview when no template is chosen)
   */
  async previewCard(templateId: string | null, payload: TemplatePreviewPayload, signal?: AbortSignal): Promise<Blob> {
    const token = tokenStorage.getAccessToken();
    // With no template chosen the card still gets the design that suits the event type, as it will when sent
    // A preview only has to look right on screen, so ask for a smaller WebP copy instead of the full-size PNG
    const res = await fetch(`${API_BASE_URL}/api/v1/templates/${templateId ? `${templateId}/` : ""}preview?width=800&format=webp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) throw new Error(`Preview failed (${res.status})`);
    return res.blob();
  },

  /** What installing the designers' default templates would add (admin only; changes nothing). */
  async previewDefaults(): Promise<ApiResponse<DefaultTemplatePlan>> {
    return apiClient<DefaultTemplatePlan>("/api/v1/templates/defaults", { method: "GET" }, true);
  },

  /** Adds the designers' default templates (and any category they need) that do not exist yet. */
  async installDefaults(): Promise<ApiResponse<DefaultTemplateInstallResult>> {
    return apiClient<DefaultTemplateInstallResult>("/api/v1/templates/defaults", { method: "POST" }, true);
  },

  async getTemplates(categoryId?: string, options: { scope?: "mine"; kind?: TemplateKind } = {}): Promise<ApiResponse<Template[]>> {
    return listAllPages((page) => {
      const params = new URLSearchParams({ page: String(page), limit: "100" });
      if (categoryId) params.set("categoryId", categoryId);
      if (options.scope) params.set("scope", options.scope);
      if (options.kind) params.set("kind", options.kind);
      return apiClient<Template[]>(`/api/v1/templates?${params.toString()}`, { method: "GET" }, true);
    });
  },

  /**
   * An AI template drawn with a real event's details at full size (PNG or JPEG), for download.
   * Posters get a registration QR code when `registrationUrl` is given; invitations carry a marked sample code here
   * because each guest's own code only exists in the invitation workflow.
   * POST /api/v1/templates/:id/render
   */
  async renderForEvent(
    templateId: string,
    payload: { eventId: string; registrationUrl?: string; format?: "png" | "jpeg" }
  ): Promise<{ ok: true; blob: Blob; qr: string; warnings: string } | { ok: false; message: string }> {
    const token = tokenStorage.getAccessToken();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/templates/${templateId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, message: body?.message || `The image could not be created (${res.status}).` };
      }
      return { ok: true, blob: await res.blob(), qr: res.headers.get("X-Invitation-Qr") || "", warnings: res.headers.get("X-Render-Warnings") || "" };
    } catch {
      return { ok: false, message: "Network error. Please check your connection and try again." };
    }
  },

  async getTemplateById(id: string): Promise<ApiResponse<Template>> {
    return apiClient<Template>(`/api/v1/templates/${id}`, { method: "GET" }, true);
  },

  async createTemplate(payload: {
    name: string;
    categoryId?: string;
    subcategoryId?: string;
    previewImageKey?: string;
    templateData?: Record<string, any>;
    cardDesign?: CardDesign;
    isSystemTemplate?: boolean;
    isPublished?: boolean;
  }): Promise<ApiResponse<Template>> {
    return apiClient<Template>("/api/v1/templates", { method: "POST", body: JSON.stringify(payload) }, true);
  },

  async updateTemplate(
    id: string,
    payload: {
      name?: string;
      categoryId?: string;
      subcategoryId?: string;
      previewImageKey?: string;
      templateData?: Record<string, any>;
      cardDesign?: CardDesign;
      isSystemTemplate?: boolean;
      isPublished?: boolean;
    }
  ): Promise<ApiResponse<Template>> {
    return apiClient<Template>(`/api/v1/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true);
  },

  async deleteTemplate(id: string): Promise<ApiResponse<Template>> {
    return apiClient<Template>(
      `/api/v1/templates/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  },
};
