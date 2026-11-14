import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = fileURLToPath(new URL("../src/", import.meta.url));

function existing(candidates) {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function aliasFile(specifier) {
  const base = path.join(srcRoot, specifier.slice(2));
  return existing([`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = aliasFile(specifier);
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }

    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        const parent = context.parentURL ? fileURLToPath(context.parentURL) : srcRoot;
        const base = path.resolve(path.dirname(parent), specifier);
        const file = existing([`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]);
        if (file) return nextResolve(pathToFileURL(file).href, context);
        throw error;
      }
    }

    return nextResolve(specifier, context);
  },
});
