"use client";

import { useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/lib/api-error";
import {
  createShare,
  getActivity,
  getDigiLockerAuthorizationUrl,
  getDigiLockerConnection,
  getDocument,
  getTypes,
  importDocument,
  linkDocumentProfile,
  listDigiLockerDocuments,
  listDocuments,
  listShares,
  previewVersion,
  revokeShare,
  unlinkDocumentProfile,
} from "./documentsApi";
import type { CreateShareBody, DocumentFilters, ImportDocumentInput, PreviewVersionInput } from "../types";
import type { DocumentProfileRelation } from "@/types";
import { newIdempotencyKey } from "../utils/upload";

function retryDocumentQuery(failureCount: number, error: unknown): boolean {
  const status = parseApiError(error).status;
  if (status === 401 || status === 403 || status === 404 || status === 410) return false;
  return failureCount < 2;
}

export function useDocuments(filters: DocumentFilters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => listDocuments(filters),
    retry: retryDocumentQuery,
    placeholderData: (previous) => previous,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument(id),
    enabled: id.length > 0,
    retry: retryDocumentQuery,
  });
}

export function useDocumentTypes(enabled = true) {
  return useQuery({
    queryKey: ["document-types"],
    queryFn: getTypes,
    enabled,
    retry: retryDocumentQuery,
  });
}

export function useVersionPreview(input: PreviewVersionInput, enabled: boolean) {
  return useQuery({
    queryKey: ["document-preview", input.typeId, input.label ?? "", input.documentId ?? ""],
    queryFn: () => previewVersion(input),
    enabled,
    retry: false,
  });
}

export function useShares(documentId: string, enabled = true) {
  return useQuery({
    queryKey: ["shares", documentId],
    queryFn: () => listShares(documentId),
    enabled: enabled && documentId.length > 0,
    retry: retryDocumentQuery,
  });
}

export function useShareActivity(documentId: string, shareId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["activity", documentId, shareId],
    enabled: enabled && documentId.length > 0 && shareId.length > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getActivity(documentId, shareId, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: retryDocumentQuery,
  });
}

export function useCreateShare(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShareBody) => createShare(documentId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shares", documentId] });
    },
  });
}

export function useRevokeShare(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => revokeShare(documentId, shareId),
    onSuccess: async (_result, shareId) => {
      await queryClient.invalidateQueries({ queryKey: ["shares", documentId] });
      await queryClient.invalidateQueries({ queryKey: ["activity", documentId, shareId] });
    },
  });
}

export function useDigiLockerConnection(returnUrl: string, enabled: boolean) {
  return useQuery({
    queryKey: ["digilocker-connection", returnUrl],
    queryFn: () => getDigiLockerConnection(returnUrl),
    enabled,
    retry: false,
  });
}

export function useDigiLockerConnect() {
  return useMutation({
    mutationFn: (returnUrl: string) => getDigiLockerAuthorizationUrl(returnUrl),
  });
}

export function useDigiLockerDocuments(enabled: boolean) {
  return useQuery({
    queryKey: ["digilocker-documents"],
    queryFn: listDigiLockerDocuments,
    enabled,
    retry: false,
  });
}

export function useLinkDocumentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { documentId: string; profileId: string; relation: DocumentProfileRelation }) =>
      linkDocumentProfile(input.documentId, input.profileId, input.relation),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["document", input.documentId] });
    },
  });
}

export function useUnlinkDocumentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { documentId: string; profileId: string }) =>
      unlinkDocumentProfile(input.documentId, input.profileId),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["document", input.documentId] });
    },
  });
}

export function useImportDocument() {
  const queryClient = useQueryClient();
  const idemKey = useRef(newIdempotencyKey());
  const previous = useRef("");
  return useMutation({
    mutationFn: (input: ImportDocumentInput) => {
      const signature = `${input.sourceDocumentId}|${input.typeId}|${input.label ?? ""}`;
      if (previous.current && previous.current !== signature) {
        idemKey.current = newIdempotencyKey();
      }
      previous.current = signature;
      return importDocument(input, idemKey.current);
    },
    onSuccess: async () => {
      idemKey.current = newIdempotencyKey();
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
