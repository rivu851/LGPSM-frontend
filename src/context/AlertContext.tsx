"use client";

import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import CustomAlertModal, { AlertType } from "@/components/common/CustomAlertModal";
import ConfirmModal from "@/components/common/ConfirmModal";

interface AlertState {
  isOpen: boolean;
  message: string;
  title?: string;
  type?: AlertType;
  buttonText?: string;
}

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  cancelButton?: boolean;
  tone?: "danger" | "default";
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, title?: string, buttonText?: string) => void;
  hideAlert: () => void;
  // In-app replacement for window.confirm(): resolves true when the user confirms, false otherwise
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: "",
    type: "info",
  });

  const showAlert = (message: string, type: AlertType = "info", title?: string, buttonText?: string) => {
    setAlertState({
      isOpen: true,
      message,
      type,
      title,
      buttonText,
    });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const confirmResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    // A new request while one is open counts as "no" for the earlier one
    confirmResolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const resolveConfirm = (confirmed: boolean) => {
    confirmResolver.current?.(confirmed);
    confirmResolver.current = null;
    setConfirmState(null);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, confirm }}>
      {children}
      <CustomAlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttonText={alertState.buttonText}
      />
      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message ?? ""}
        confirmText={confirmState?.confirmText}
        cancelText={confirmState?.cancelText}
        cancelButton={confirmState?.cancelButton}
        tone={confirmState?.tone}
        onResolve={resolveConfirm}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
