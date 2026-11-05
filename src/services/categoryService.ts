import { apiClient, ApiResponse } from "./apiClient";

export interface Subcategory {
  _id?: string;
  name: string;
  isActive?: boolean;
  /** the signed-in organizer's own subcategory (nobody else sees it) */
  isCustom?: boolean;
}

export interface Category {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
  isActive: boolean;
  /** the signed-in organizer's own category (nobody else sees it) */
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const categoryService = {
  async getCategories(activeOnly: boolean = true): Promise<ApiResponse<Category[]>> {
    return apiClient<Category[]>(`/api/v1/categories?activeOnly=${activeOnly}`, { method: "GET" }, true);
  },

  async getCategoryById(id: string): Promise<ApiResponse<Category>> {
    return apiClient<Category>(`/api/v1/categories/${id}`, { method: "GET" }, false);
  },

  async createCategory(payload: {
    name: string;
    description?: string;
    subcategories?: { name: string; isActive?: boolean }[];
  }): Promise<ApiResponse<Category>> {
    return apiClient<Category>(
      "/api/v1/categories",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async updateCategory(
    id: string,
    payload: {
      name?: string;
      description?: string;
      // Send existing subcategories with their _id so their identity is preserved
      subcategories?: { _id?: string; name: string; isActive?: boolean }[];
      isActive?: boolean;
    }
  ): Promise<ApiResponse<Category>> {
    return apiClient<Category>(
      `/api/v1/categories/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  // An organizer's own category / subcategory: only they see and can use it
  async createCustomCategory(name: string): Promise<ApiResponse<Category>> {
    return apiClient<Category>("/api/v1/categories/custom", { method: "POST", body: JSON.stringify({ name }) }, true);
  },

  async addCustomSubcategory(categoryId: string, name: string): Promise<ApiResponse<Category>> {
    return apiClient<Category>(`/api/v1/categories/${categoryId}/custom-subcategories`, { method: "POST", body: JSON.stringify({ name }) }, true);
  },

  // Appends a subcategory without touching existing ones (their ids stay stable)
  async addSubcategory(categoryId: string, name: string): Promise<ApiResponse<Category>> {
    return apiClient<Category>(
      `/api/v1/categories/${categoryId}/subcategories`,
      { method: "POST", body: JSON.stringify({ name }) },
      true
    );
  },

  async deleteCategory(id: string): Promise<ApiResponse<Category>> {
    return apiClient<Category>(
      `/api/v1/categories/${id}`,
      {
        method: "DELETE",
      },
      true
    );
  },
};
