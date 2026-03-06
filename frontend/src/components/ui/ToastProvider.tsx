import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const typeStyles: Record<ToastType, string> = {
  info: "text-[#E2E8F0]",
  success: "text-[#BBF7D0]",
  error: "text-[#FECACA]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", durationMs = 3000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, durationMs);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  const closeToast = (id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const iconByType: Record<ToastType, ReactNode> = {
    info: <Info className="h-3.5 w-3.5" />,
    success: <CheckCircle2 className="h-3.5 w-3.5" />,
    error: <CircleAlert className="h-3.5 w-3.5" />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(320px,calc(100vw-1rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex h-11 items-center justify-between rounded-[10px] border border-[#1E293B] bg-[#0F172A] px-3 shadow-[0_8px_20px_rgba(2,6,23,0.2)]"
          >
            <div className={`flex min-w-0 items-center gap-2 text-[13px] font-medium ${typeStyles[toast.type]}`}>
              {iconByType[toast.type]}
              <span className="truncate text-[#F8FAFC]">{toast.message}</span>
            </div>
            <button
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[#94A3B8] transition hover:bg-[#1E293B] hover:text-[#E2E8F0]"
              onClick={() => closeToast(toast.id)}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
