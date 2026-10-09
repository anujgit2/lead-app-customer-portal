"use client";

import { useQuery } from "@tanstack/react-query";
import { lookupSharedDocument } from "./sharedApi";
import { shareCacheKey } from "../utils/format";

export function useSharedLookup(token: string) {
  return useQuery({
    queryKey: ["shared-document", shareCacheKey(token)],
    queryFn: () => lookupSharedDocument(token),
    enabled: token.length > 0,
    retry: false,
    staleTime: 0,
  });
}
