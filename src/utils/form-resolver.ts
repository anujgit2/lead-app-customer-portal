import type { FieldErrors, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

function getAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const key of path) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return cursor;
}

function setAtPath(target: Record<string, unknown>, path: string[], value: unknown) {
  let cursor = target;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = cursor[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
}

/**
 * zodResolver always validates the whole form. RHF then asks for either one
 * field (blur) or every mounted field (Continue / trigger()). Keep nested
 * errors for those names — section-prefixed paths like
 * `APPLICATION_DOCUMENTS.BUSINESS_PAN` must not be dropped.
 */
export function createFieldLevelResolver(schema: z.ZodTypeAny): Resolver {
  const resolve = zodResolver(schema);

  return async (values, context, options) => {
    const result = await resolve(values, context, options);
    const names = (options.names ?? []).filter(
      (name): name is string => typeof name === "string" && name.length > 0
    );

    if (names.length === 0) {
      return result;
    }

    const filtered: Record<string, unknown> = {};
    for (const name of names) {
      const path = name.split(".");
      const error = getAtPath(result.errors, path);
      if (error !== undefined) {
        setAtPath(filtered, path, error);
      }
    }

    return {
      ...result,
      errors: filtered as FieldErrors,
    };
  };
}
