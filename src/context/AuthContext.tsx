"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserData, tokenStorage } from "@/services/tokenStorage";
import { authService, LoginPayload, RegisterPayload } from "@/services/authService";
import { userService, UpdateProfilePayload } from "@/services/userService";
import { ApiResponse } from "@/services/apiClient";
import { rememberPortal } from "@/components/auth/authPortal";

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<ApiResponse>;
  register: (payload: RegisterPayload) => Promise<ApiResponse>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<ApiResponse>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedUser = tokenStorage.getUser();
    if (storedUser) setUser(storedUser);

    const token = tokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
        tokenStorage.setUser(res.data);
        rememberPortal(res.data.role);
      }
    } catch {
      // keep stored user if network error occurs temporarily
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // A page restored from the back/forward cache (e.g. Back after logout) or a logout in another tab
  // must not keep showing an authenticated UI once the stored session is gone.
  useEffect(() => {
    const dropIfSignedOut = () => {
      if (!tokenStorage.getAccessToken()) setUser(null);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) dropIfSignedOut();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", dropIfSignedOut);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", dropIfSignedOut);
    };
  }, []);

  const login = async (credentials: LoginPayload): Promise<ApiResponse> => {
    const res = await authService.login(credentials);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      rememberPortal(res.data.user.role);
    }
    return res;
  };

  const register = async (payload: RegisterPayload): Promise<ApiResponse> => {
    const res = await authService.register(payload);
    if (!res.success) return res;

    // Registration returns only the created user; sign in to obtain a real session
    const loginRes = await login({ email: payload.email, password: payload.password, role: payload.role });
    if (!loginRes.success) {
      return { success: false, message: `Account created, but automatic sign-in failed: ${loginRes.message || "please sign in manually."}` };
    }
    return loginRes;
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload): Promise<ApiResponse> => {
    const res = await userService.updateProfile(payload);
    if (res.success && res.data) {
      setUser(res.data);
      tokenStorage.setUser(res.data);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
