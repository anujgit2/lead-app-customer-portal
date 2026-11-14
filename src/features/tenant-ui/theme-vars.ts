import type { UiTheme } from "@/features/tenant-ui/types";

export function hexToHslChannels(hex: string): string | null {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function channels(hex: string | undefined): string | null {
  return hex ? hexToHslChannels(hex) : null;
}

function parts(value: string): { h: number; s: number; l: number } | null {
  const match = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/.exec(value);
  if (!match) return null;
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function paint(h: number, s: number, l: number): string {
  return `${h} ${Math.min(100, Math.max(0, s))}% ${Math.min(100, Math.max(0, l))}%`;
}

const RADIUS: Record<NonNullable<UiTheme["borderRadius"]>, [string, string, string, string]> = {
  "0px": ["0px", "0px", "0px", "0px"],
  "4px": ["2px", "4px", "6px", "8px"],
  "8px": ["6px", "8px", "12px", "16px"],
  "12px": ["8px", "12px", "16px", "20px"],
};

export function themeCssVars(theme: UiTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  const primary = channels(theme.colors.primary);
  if (primary) {
    const parsed = parts(primary);
    vars["--primary"] = primary;
    vars["--ring"] = primary;
    vars["--brand-mid"] = primary;
    if (parsed) {
      const hoverDelta = parsed.l > 70 ? 6 : -6;
      vars["--primary-hover"] = paint(parsed.h, parsed.s, parsed.l + hoverDelta);
      vars["--primary-soft"] = paint(parsed.h, Math.round(parsed.s * 0.45), 93);
      vars["--primary-soft-foreground"] = paint(parsed.h, parsed.s, 15);
      vars["--secondary"] = vars["--primary-soft"];
      vars["--secondary-foreground"] = vars["--primary-soft-foreground"];
      vars["--brand-deep"] = paint(parsed.h, parsed.s, Math.min(18, Math.max(8, parsed.l - 10)));
      vars["--brand-glow"] = paint(parsed.h, Math.round(parsed.s * 0.8), Math.min(68, parsed.l + 28));
    }
  }

  const foreground = channels(theme.colors.primaryForeground);
  if (foreground) vars["--primary-foreground"] = foreground;

  const background = channels(theme.colors.background);
  if (background) vars["--background"] = background;

  const text = channels(theme.colors.foreground);
  if (text) {
    vars["--foreground"] = text;
    vars["--card-foreground"] = text;
    vars["--popover-foreground"] = text;
    vars["--accent-foreground"] = text;
  }

  const card = channels(theme.colors.card);
  if (card) {
    vars["--card"] = card;
    vars["--popover"] = card;
  }

  const muted = channels(theme.colors.muted);
  if (muted) {
    vars["--muted"] = muted;
    vars["--accent"] = muted;
  }

  const border = channels(theme.colors.border);
  if (border) vars["--border"] = border;

  const danger = channels(theme.colors.danger);
  if (danger) {
    vars["--danger"] = danger;
    vars["--destructive"] = danger;
    const parsed = parts(danger);
    if (parsed) {
      vars["--danger-strong"] = paint(parsed.h, parsed.s, Math.max(20, parsed.l - 8));
      vars["--danger-soft"] = paint(parsed.h, 40, 96);
    }
  }

  if (theme.borderRadius) {
    const [sm, md, lg, xl] = RADIUS[theme.borderRadius];
    vars["--radius"] = theme.borderRadius;
    vars["--r-sm"] = sm;
    vars["--r-md"] = md;
    vars["--r-lg"] = lg;
    vars["--r-xl"] = xl;
  }

  return vars;
}

export function fontFaceCss(family: string, url: string): string {
  const extension = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  const format = extension === "woff" ? "woff" : extension === "ttf" ? "truetype" : extension === "otf" ? "opentype" : "woff2";
  return `@font-face{font-family:"${family}";src:url("${url}") format("${format}");font-display:swap;}`;
}
