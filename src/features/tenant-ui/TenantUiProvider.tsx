"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_TENANT_UI } from "@/features/tenant-ui/default-ui-config";
import { parseTenantUi } from "@/features/tenant-ui/parse-ui-config";
import { fontFaceCss, themeCssVars } from "@/features/tenant-ui/theme-vars";
import type { TenantUiConfig } from "@/features/tenant-ui/types";
import { uiConfigService } from "@/services/ui-config.service";

const TenantUiContext = createContext<{ config: TenantUiConfig }>({
  config: DEFAULT_TENANT_UI,
});

let pendingConfig: Promise<TenantUiConfig> | null = null;

function loadTenantUi(): Promise<TenantUiConfig> {
  if (!pendingConfig) {
    pendingConfig = uiConfigService
      .getUiConfig()
      .then((payload) => parseTenantUi(payload))
      .catch(() => {
        pendingConfig = null;
        return DEFAULT_TENANT_UI;
      });
  }
  return pendingConfig;
}

export function useTenantUi() {
  return useContext(TenantUiContext);
}

function applyTheme(config: TenantUiConfig) {
  const root = document.documentElement;
  const body = document.body;
  const previous = new Map<string, string>();
  for (const [name, value] of Object.entries(themeCssVars(config.theme))) {
    previous.set(name, root.style.getPropertyValue(name));
    root.style.setProperty(name, value);
  }

  const previousFont = body.style.getPropertyValue("--font-sans");
  const family = config.theme.fontFamily;
  const fontUrl = config.theme.fontUrl;
  const styleId = "tenant-ui-font";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;

  if (family === "system-ui") {
    body.style.setProperty("--font-sans", "system-ui, sans-serif");
  } else if (family && fontUrl) {
    body.style.setProperty("--font-sans", `"${family}", sans-serif`);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = fontFaceCss(family, fontUrl);
  }

  return () => {
    for (const [name, value] of previous) {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }
    if (family && family !== "Inter") {
      if (previousFont) body.style.setProperty("--font-sans", previousFont);
      else body.style.removeProperty("--font-sans");
    }
    if (style && (!family || family === "Inter" || family === "system-ui")) style.textContent = "";
  };
}

function HomeLoadBar() {
  const [value, setValue] = useState(12);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setValue((current) => (current >= 90 ? current : current + Math.max(1, (90 - current) * 0.12)));
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  const width = Math.round(value);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-muted"
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className="relative h-full overflow-hidden bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      >
        <span
          aria-hidden
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.7),transparent)] bg-[length:200%_100%]"
        />
      </div>
    </div>
  );
}

export function TenantUiProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantUiConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTenantUi().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!config) return;
    return applyTheme(config);
  }, [config]);

  const pathname = usePathname();
  const isHome = pathname === "/";

  if (!config) {
    return (
      <div className="min-h-screen bg-background" aria-busy="true">
        {isHome ? <HomeLoadBar /> : null}
      </div>
    );
  }

  return <TenantUiContext.Provider value={{ config }}>{children}</TenantUiContext.Provider>;
}
