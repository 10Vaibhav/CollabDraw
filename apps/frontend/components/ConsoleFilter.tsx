"use client";

import { useEffect } from "react";

/**
 * ConsoleFilter suppresses known noisy, non-actionable console errors in development.
 *
 * IMPORTANT: Keep the filter list minimal and specific. Do not blanket-ignore errors.
 */
export function ConsoleFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const originalError = console.error;
    const originalWarn = console.warn;

    // List of substrings to filter from console.error
    const errorFilters: string[] = [
      // React hydration mismatch during transient states
      "Warning: Expected server HTML to contain a matching",
      // Chromium-specific noisy error
      "ResizeObserver loop limit exceeded",
      // Axios generic error noise
      "AxiosError:",
      "Request failed with status code",
    ];

    // List of substrings to filter from window 'error' and 'unhandledrejection'
    const browserFilters: string[] = [
      "ResizeObserver loop limit exceeded",
      "AxiosError:",
      "Request failed with status code",
    ];

    console.error = (...args: any[]) => {
      try {
        const allStr = args.map((a) => {
          try {
            if (typeof a === "string") return a;
            if (a && typeof a === "object") {
              // Axios errors often have isAxiosError and message/status
              const isAxios = (a as any).isAxiosError || (a?.name === "AxiosError");
              const msg = (a as any)?.message ?? "";
              const status = (a as any)?.response?.status;
              return `${isAxios ? "AxiosError:" : ""} ${msg} ${status ?? ""}`;
            }
            return String(a);
          } catch {
            return String(a);
          }
        }).join(" | ");

        if (errorFilters.some((f) => allStr.includes(f))) {
          return; // swallow this specific noisy error
        }
      } catch {}
      originalError(...args);
    };

    // Optionally down-level some warnings to keep console cleaner
    console.warn = (...args: any[]) => {
      originalWarn(...args);
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      try {
        const reasonStr = String((e as any)?.reason ?? "");
        if (browserFilters.some((f) => reasonStr.includes(f))) {
          e.preventDefault();
        }
      } catch {}
    };

    const handleWindowError = (e: ErrorEvent) => {
      try {
        const msg = String(e?.message ?? "");
        if (browserFilters.some((f) => msg.includes(f))) {
          e.preventDefault();
        }
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", handleUnhandledRejection);
      window.addEventListener("error", handleWindowError);
    }

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      if (typeof window !== "undefined") {
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        window.removeEventListener("error", handleWindowError);
      }
    };
  }, []);

  return null;
}
