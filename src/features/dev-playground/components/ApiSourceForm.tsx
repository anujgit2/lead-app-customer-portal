"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { usePlayground } from "../playground-context";

const PARAM_SUGGESTIONS = ["formCode", "version", "productCode", "loanType", "applicationType"];

interface ApiSourceFormProps {
  /** Hide the Template ID + Load row — used when an inline loader is already shown elsewhere (e.g. the toolbar). */
  showTemplateIdAndLoad?: boolean;
}

export function ApiSourceForm({ showTemplateIdAndLoad = true }: ApiSourceFormProps) {
  const { apiConfig, setApiConfig, apiStatus, apiMeta, apiErrorMessage, loadFromApi } = usePlayground();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const paramEntries = Object.entries(apiConfig.params);

  const updateParam = (index: number, key: string, val: string) => {
    const entries = [...paramEntries];
    entries[index] = [key, val];
    setApiConfig({ ...apiConfig, params: Object.fromEntries(entries) });
  };
  const addParam = () => {
    setApiConfig({ ...apiConfig, params: { ...apiConfig.params, "": "" } });
  };
  const removeParam = (index: number) => {
    const entries = paramEntries.filter((_, i) => i !== index);
    setApiConfig({ ...apiConfig, params: Object.fromEntries(entries) });
  };

  return (
    <div className="space-y-3">
      {showTemplateIdAndLoad && (
        <div className="space-y-1.5">
          <Label htmlFor="pg-template-id" className="text-xs text-slate-500">
            Template ID
          </Label>
          <div className="flex gap-2">
            <Input
              id="pg-template-id"
              value={apiConfig.templateId}
              onChange={(e) => setApiConfig({ ...apiConfig, templateId: e.target.value })}
              placeholder="business_profile"
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              loading={apiStatus === "loading"}
              onClick={loadFromApi}
              disabled={!apiConfig.templateId}
            >
              Load
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Advanced configuration
      </button>

      {advancedOpen && (
        <div className="space-y-3 rounded-md border border-slate-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-700">Use programService</p>
              <p className="text-[11px] text-muted-foreground">
                Calls the app&apos;s real <code className="font-mono">programService.getProgramWithTemplates()</code>{" "}
                instead of a raw endpoint.
              </p>
            </div>
            <Switch
              checked={apiConfig.useProgramService}
              onCheckedChange={(v) => setApiConfig({ ...apiConfig, useProgramService: v })}
            />
          </div>

          {!apiConfig.useProgramService && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Endpoint template</Label>
              <Input
                value={apiConfig.endpointTemplate}
                onChange={(e) => setApiConfig({ ...apiConfig, endpointTemplate: e.target.value })}
                placeholder="/api/form-templates/{id}"
                className="h-8 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                <code className="font-mono">{"{id}"}</code> is replaced with the Template ID above.
              </p>
            </div>
          )}

          {!apiConfig.useProgramService && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-500">Query params</Label>
                <button
                  type="button"
                  onClick={addParam}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              {paramEntries.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  e.g. {PARAM_SUGGESTIONS.join(", ")}
                </p>
              )}
              {paramEntries.map(([key, val], i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={key}
                    onChange={(e) => updateParam(i, e.target.value, val)}
                    placeholder="key"
                    className="h-8 flex-1 text-xs"
                    list="pg-param-suggestions"
                  />
                  <Input
                    value={val}
                    onChange={(e) => updateParam(i, key, e.target.value)}
                    placeholder="value"
                    className="h-8 flex-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeParam(i)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <datalist id="pg-param-suggestions">
                {PARAM_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          )}
        </div>
      )}

      {apiStatus === "loading" && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading template…
        </div>
      )}

      {apiStatus === "error" && apiErrorMessage && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="pl-2 text-xs">{apiErrorMessage}</AlertDescription>
        </Alert>
      )}

      {apiStatus === "success" && apiMeta && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <div>
            <span className="text-emerald-500">Template ID:</span> {apiMeta.templateId}
          </div>
          <div>
            <span className="text-emerald-500">Form Code:</span> {apiMeta.formCode ?? "—"}
          </div>
          <div>
            <span className="text-emerald-500">Version:</span> {apiMeta.version ?? "—"}
          </div>
          <div>
            <span className="text-emerald-500">Status:</span>{" "}
            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
              {apiMeta.statusCode ?? 200}
            </Badge>
          </div>
          <div className="col-span-2">
            <span className="text-emerald-500">Last Loaded:</span>{" "}
            {new Date(apiMeta.loadedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
