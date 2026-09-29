"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bug,
  FlaskConical,
  AlignLeft,
  ShieldCheck,
  Clipboard,
  ClipboardPaste,
  Eraser,
  PlayCircle,
  LayoutGrid,
  Database,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { usePlayground } from "../playground-context";
import { ApiSourceForm } from "./ApiSourceForm";
import { SectionNavigator } from "./SectionNavigator";
import { TestDataPanel } from "./TestDataPanel";

function ToolbarIconButton({
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-700 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarPopoverButton({
  icon: Icon,
  label,
  badge,
  children,
  contentClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-md border border-slate-100 px-2.5 text-xs font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98] dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName ?? "w-80"}>{children}</PopoverContent>
    </Popover>
  );
}

export function PlaygroundToolbar() {
  const {
    debug,
    setDebug,
    editorRef,
    mode,
    setMode,
    jsonText,
    setJsonText,
    commitNow,
    jsonParseError,
    normalized,
    apiStatus,
  } = usePlayground();

  const warnings = normalized.issues.filter((i) => i.severity === "warning");
  const errors = normalized.issues.filter((i) => i.severity === "error");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast.success("Copied JSON to clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const handleClear = () => setJsonText("[]");

  const handleValidate = () => {
    commitNow();
    if (jsonParseError) toast.error("Invalid JSON");
    else if (errors.length > 0) toast.error(`${errors.length} schema error(s) found`);
    else toast.success("Schema is valid");
  };

  const statusTone: "success" | "warning" | "destructive" =
    jsonParseError || errors.length > 0 ? "destructive" : warnings.length > 0 ? "warning" : "success";
  const StatusIcon = statusTone === "destructive" ? XCircle : statusTone === "warning" ? AlertTriangle : CheckCircle2;
  const statusLabel = jsonParseError
    ? "Invalid JSON"
    : errors.length > 0
      ? `${errors.length} error${errors.length === 1 ? "" : "s"}`
      : warnings.length > 0
        ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
        : "Valid";

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
              Dynamic Form Playground
            </h1>
            <p className="text-[11px] text-slate-400">Same renderer as production — dev tool only</p>
          </div>
          <Badge variant="warning" className="ml-1">
            Dev only
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bug className="h-3.5 w-3.5 text-violet-500" />
            <Label htmlFor="pg-debug-toggle" className="cursor-pointer text-xs font-medium text-slate-600 dark:text-zinc-300">
              Debug mode
            </Label>
            <Switch id="pg-debug-toggle" checked={debug} onCheckedChange={setDebug} />
          </div>
          <Link href="/dashboard" className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600">
            Exit
          </Link>
        </div>
      </div>

      {/* Command bar — every schema/editor/preview control lives here so both
          panels below are dedicated entirely to the JSON and the rendered form. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 sm:px-6 dark:border-zinc-800">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "api" | "json")}
          className="flex items-center gap-3 rounded-md border border-slate-100 px-2.5 py-1 dark:border-zinc-800"
        >
          <label htmlFor="pg-source-api" className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
            <RadioGroupItem value="api" id="pg-source-api" />
            API
          </label>
          <label htmlFor="pg-source-json" className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
            <RadioGroupItem value="json" id="pg-source-json" />
            JSON
          </label>
        </RadioGroup>

        <div className="h-5 w-px bg-slate-100 dark:bg-zinc-800" />

        {mode === "api" ? (
          <>
            <ApiInlineLoader />
            <ToolbarPopoverButton
              icon={Settings2}
              label="API Source"
              contentClassName="w-96"
              badge={
                apiStatus === "loading" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                ) : apiStatus === "success" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : apiStatus === "error" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                ) : null
              }
            >
              <ApiSourceForm showTemplateIdAndLoad={false} />
            </ToolbarPopoverButton>
          </>
        ) : (
          <div className="flex items-center gap-0.5">
            <ToolbarIconButton icon={AlignLeft} label="Format" onClick={() => editorRef.current?.format()} />
            <ToolbarIconButton icon={ShieldCheck} label="Validate" onClick={handleValidate} />
            <ToolbarIconButton icon={Clipboard} label="Copy" onClick={handleCopy} />
            <ToolbarIconButton icon={ClipboardPaste} label="Paste" onClick={handlePaste} />
            <ToolbarIconButton icon={Eraser} label="Clear" onClick={handleClear} />
          </div>
        )}

        <div className="h-5 w-px bg-slate-100 dark:bg-zinc-800" />

        {normalized.templates.length > 0 && (
          <ToolbarPopoverButton icon={LayoutGrid} label="Sections" contentClassName="w-80">
            <SectionNavigator />
          </ToolbarPopoverButton>
        )}

        <ToolbarPopoverButton icon={Database} label="Test Data" contentClassName="w-96">
          <TestDataPanel />
        </ToolbarPopoverButton>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={
                "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all duration-200 ease-out active:scale-[0.98] " +
                (statusTone === "destructive"
                  ? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
                  : statusTone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400")
              }
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusLabel}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <SchemaStatusDetails jsonParseError={jsonParseError} errors={errors} warnings={warnings} />
          </PopoverContent>
        </Popover>

        <div className="ml-auto">
          <Button type="button" onClick={commitNow} size="sm" className="gap-1.5">
            <PlayCircle className="h-4 w-4" /> Render Preview
          </Button>
        </div>
      </div>
    </header>
  );
}

function ApiInlineLoader() {
  const { apiConfig, setApiConfig, apiStatus, loadFromApi } = usePlayground();
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={apiConfig.templateId}
        onChange={(e) => setApiConfig({ ...apiConfig, templateId: e.target.value })}
        placeholder="Template ID"
        className="h-8 w-40 text-xs"
      />
      <Button type="button" size="sm" className="h-8" loading={apiStatus === "loading"} onClick={loadFromApi} disabled={!apiConfig.templateId}>
        Load
      </Button>
    </div>
  );
}

function SchemaStatusDetails({
  jsonParseError,
  errors,
  warnings,
}: {
  jsonParseError: string | null;
  errors: { path: string; message: string }[];
  warnings: { path: string; message: string }[];
}) {
  if (jsonParseError) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-destructive">Invalid JSON</p>
        <p className="font-mono text-xs text-destructive/80">{jsonParseError}</p>
      </div>
    );
  }

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" /> Schema is valid.
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto">
      {errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-destructive">Schema errors ({errors.length})</p>
          <ul className="space-y-1 font-mono text-[11px]">
            {errors.map((issue, i) => (
              <li key={i}>
                <span className="text-destructive/70">{issue.path}:</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Warnings ({warnings.length})</p>
          <ul className="space-y-1 font-mono text-[11px]">
            {warnings.map((issue, i) => (
              <li key={i}>
                <span className="text-amber-600">{issue.path}:</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
