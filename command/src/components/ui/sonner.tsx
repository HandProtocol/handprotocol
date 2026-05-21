"use client";

import { Toaster as SonnerToaster } from "sonner";

/*
  Sonner toaster wired with HUD-dark surface. Mount once in the dashboard
  layout. We don't expose the theme prop because v1 has only one theme.
*/
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--bg-2)",
          border: "1px solid rgba(245,239,225,0.1)",
          color: "var(--ink)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
      }}
    />
  );
}
