import { apiClient, ApiResponse } from "./apiClient";

export interface Template {
  _id: string;
  id?: string;
  name: string;
  categoryId?: string | any;
  subcategoryId?: string;
  previewImageKey?: string;
  templateData?: Record<string, any>;
  isSystemTemplate: boolean;
  isActive: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const templateService = {
  async getTemplates(categoryId?: string): Promise<ApiResponse<Template[]>> {
    const url = categoryId ? `/api/v1/templates?categoryId=${categoryId}` : "/api/v1/templates";
    return apiClient<Template[]>(url, { method: "GET" }, true);
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
