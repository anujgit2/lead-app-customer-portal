"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/lib/api-error";
import { profileService } from "@/services/profile.service";
import type {
  CreateCustomerProfileRequest,
  CreateProfileLinkRequest,
  CustomerProfileListFilters,
  ProfileMemoSelection,
  UpdateCustomerProfileRequest,
} from "@/types";
import {
  formTemplateQueryKey,
  profileDiffQueryKey,
  profileQueryKey,
  profileVersionQueryKey,
  profileVersionsQueryKey,
  profilesQueryKey,
} from "../query-keys";

function retryProfileQuery(failureCount: number, error: unknown): boolean {
  const status = parseApiError(error).status;
  if (status === 401 || status === 403 || status === 404 || status === 409) return false;
  return failureCount < 2;
}

export function useProfiles(filters: CustomerProfileListFilters) {
  return useQuery({
    queryKey: profilesQueryKey(filters),
    queryFn: () => profileService.list(filters),
    retry: retryProfileQuery,
    placeholderData: (previous) => previous,
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileQueryKey(id),
    queryFn: () => profileService.get(id),
    enabled: id.length > 0,
    retry: retryProfileQuery,
  });
}

export function useFormTemplate(code: string, versionNumber?: number) {
  const version =
    typeof versionNumber === "number" && Number.isFinite(versionNumber) ? versionNumber : null;
  return useQuery({
    queryKey: formTemplateQueryKey(code, version ?? undefined),
    queryFn: () =>
      version === null
        ? profileService.getFormTemplate(code)
        : profileService.getFormTemplateVersion(code, version),
    enabled: code.length > 0,
    retry: retryProfileQuery,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCustomerProfileRequest) => profileService.create(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useUpdateProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCustomerProfileRequest) => profileService.update(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: profileVersionsQueryKey(id) });
    },
  });
}

export function useArchiveProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => profileService.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(id) });
    },
  });
}

export function useProfileVersions(id: string) {
  return useQuery({
    queryKey: profileVersionsQueryKey(id),
    queryFn: () => profileService.listVersions(id),
    enabled: id.length > 0,
    retry: retryProfileQuery,
  });
}

export function useProfileVersion(id: string, versionNo: number | null) {
  return useQuery({
    queryKey: profileVersionQueryKey(id, versionNo ?? 0),
    queryFn: () => profileService.getVersion(id, versionNo ?? 0),
    enabled: id.length > 0 && versionNo !== null,
    retry: retryProfileQuery,
  });
}

export function useProfileDiff(id: string, fromVersion: number | null, toVersion: number | null) {
  return useQuery({
    queryKey: profileDiffQueryKey(id, fromVersion ?? 0, toVersion ?? 0),
    queryFn: () => profileService.diff(id, fromVersion ?? 0, toVersion ?? 0),
    enabled: id.length > 0 && fromVersion !== null && toVersion !== null && fromVersion !== toVersion,
    retry: retryProfileQuery,
  });
}

export function useRestoreProfileVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { versionNo: number; changeNote?: string }) =>
      profileService.restore(id, input.versionNo, { changeNote: input.changeNote }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(id) });
      await queryClient.invalidateQueries({ queryKey: profileVersionsQueryKey(id) });
    },
  });
}

export function useCreateProfileLink(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProfileLinkRequest) => profileService.createLink(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(id) });
    },
  });
}

export function useDeleteProfileLink(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => profileService.deleteLink(id, linkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(id) });
    },
  });
}

export function useSaveProfileMemo(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selection: ProfileMemoSelection) => profileService.saveMemo(id, selection),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
