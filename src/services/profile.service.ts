import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type {
  CreateCustomerProfileRequest,
  CreateProfileLinkRequest,
  CustomerProfileDetail,
  CustomerProfileDiff,
  CustomerProfileLink,
  CustomerProfileLinkRole,
  CustomerProfileListFilters,
  CustomerProfilePage,
  CustomerProfileStatus,
  CustomerProfileSummary,
  CustomerProfileType,
  CustomerProfileVersion,
  CustomerProfileVersionItem,
  FormTemplate,
  ProfileMemoSelection,
  RestoreProfileVersionRequest,
  SavedProfileMemo,
  UpdateCustomerProfileRequest,
} from "@/types";
import { readFormTemplate } from "@/features/profiles/utils/read-form-template";

const LINK_ROLES: readonly CustomerProfileLinkRole[] = [
  "PROMOTER",
  "DIRECTOR",
  "PARTNER",
  "GUARANTOR",
  "AUTHORISED_SIGNATORY",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function mismatch(label: string): never {
  throw { message: `Profile response is missing ${label}.`, status: 502 };
}

function rethrow(error: unknown): never {
  throw parseApiError(error);
}

function readNullableText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isProfileType(value: unknown): value is CustomerProfileType {
  return value === "INDIVIDUAL" || value === "BUSINESS";
}

function isProfileStatus(value: unknown): value is CustomerProfileStatus {
  return value === "ACTIVE" || value === "ARCHIVED";
}

function isLinkRole(value: unknown): value is CustomerProfileLinkRole {
  return typeof value === "string" && LINK_ROLES.includes(value as CustomerProfileLinkRole);
}

function readSummary(value: unknown): CustomerProfileSummary {
  if (!isRecord(value)) mismatch("a profile summary");
  if (typeof value.id !== "string" || value.id.length === 0) mismatch("id");
  if (!isProfileType(value.type)) mismatch("type");
  if (!isProfileStatus(value.status)) mismatch("status");
  if (typeof value.currentVersionNo !== "number" || !Number.isFinite(value.currentVersionNo)) {
    mismatch("currentVersionNo");
  }
  if (typeof value.displayName !== "string") mismatch("displayName");
  if (typeof value.updatedAt !== "string") mismatch("updatedAt");
  if (typeof value.updatedBy !== "string") mismatch("updatedBy");
  if (!isRecord(value.identifiers)) mismatch("identifiers");
  return {
    id: value.id,
    type: value.type,
    displayName: value.displayName,
    status: value.status,
    currentVersionNo: value.currentVersionNo,
    identifiers: {
      pan: readNullableText(value.identifiers.pan),
      gstin: readNullableText(value.identifiers.gstin),
      mobile: readNullableText(value.identifiers.mobile),
    },
    updatedAt: value.updatedAt,
    updatedBy: value.updatedBy,
  };
}

function readLink(value: unknown): CustomerProfileLink {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    mismatch("a profile link");
  }
  if (!isLinkRole(value.role)) mismatch("link role");
  const ownershipPct =
    typeof value.ownershipPct === "number" && Number.isFinite(value.ownershipPct)
      ? value.ownershipPct
      : null;
  return {
    id: value.id,
    role: value.role,
    ownershipPct,
    profile: readSummary(value.profile),
  };
}

function readDetail(value: unknown): CustomerProfileDetail {
  const summary = readSummary(value);
  if (!isRecord(value)) mismatch("a profile");
  if (typeof value.templateCode !== "string" || value.templateCode.trim().length === 0) {
    mismatch("templateCode");
  }
  if (typeof value.templateVersion !== "number" || !Number.isFinite(value.templateVersion)) {
    mismatch("templateVersion");
  }
  if (!isRecord(value.data)) mismatch("data");
  if (value.links !== undefined && !Array.isArray(value.links)) mismatch("links");
  return {
    ...summary,
    templateCode: value.templateCode,
    templateVersion: value.templateVersion,
    data: value.data,
    links: Array.isArray(value.links) ? value.links.map(readLink) : [],
  };
}

function readPage(value: unknown): CustomerProfilePage {
  if (!isRecord(value) || !Array.isArray(value.content)) mismatch("a profile page");
  if (typeof value.page !== "number" || !Number.isFinite(value.page)) mismatch("page");
  if (typeof value.size !== "number" || !Number.isFinite(value.size)) mismatch("size");
  if (typeof value.totalElements !== "number" || !Number.isFinite(value.totalElements)) {
    mismatch("totalElements");
  }
  return {
    content: value.content.map(readSummary),
    page: value.page,
    size: value.size,
    totalElements: value.totalElements,
  };
}

function readVersionItem(value: unknown): CustomerProfileVersionItem {
  if (!isRecord(value)) mismatch("a profile version");
  if (typeof value.versionNo !== "number" || !Number.isFinite(value.versionNo)) mismatch("versionNo");
  if (typeof value.createdAt !== "string") mismatch("createdAt");
  if (typeof value.createdBy !== "string") mismatch("createdBy");
  const changeNote =
    typeof value.changeNote === "string"
      ? value.changeNote
      : value.changeNote === null || value.changeNote === undefined
        ? null
        : mismatch("changeNote");
  return {
    versionNo: value.versionNo,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    changeNote,
  };
}

function readVersion(value: unknown): CustomerProfileVersion {
  const item = readVersionItem(value);
  if (!isRecord(value)) mismatch("a profile version");
  if (typeof value.templateCode !== "string" || value.templateCode.trim().length === 0) {
    mismatch("templateCode");
  }
  if (typeof value.templateVersion !== "number" || !Number.isFinite(value.templateVersion)) {
    mismatch("templateVersion");
  }
  if (!isRecord(value.data)) mismatch("data");
  return {
    ...item,
    templateCode: value.templateCode,
    templateVersion: value.templateVersion,
    data: value.data,
  };
}

function readDiff(value: unknown): CustomerProfileDiff {
  if (!isRecord(value)) mismatch("a profile diff");
  if (typeof value.from !== "number" || !Number.isFinite(value.from)) mismatch("diff from");
  if (typeof value.to !== "number" || !Number.isFinite(value.to)) mismatch("diff to");
  if (!Array.isArray(value.changes)) mismatch("changes");
  return {
    from: value.from,
    to: value.to,
    changes: value.changes.map((change) => {
      if (!isRecord(change) || typeof change.path !== "string") mismatch("a diff change");
      return { path: change.path, before: change.before, after: change.after };
    }),
  };
}

function readSavedMemo(value: unknown): SavedProfileMemo {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    mismatch("a saved memo");
  }
  return { id: value.id };
}

function fileNameFromDisposition(header: unknown, fallback: string): string {
  if (typeof header !== "string") return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] || fallback;
}

function memoParams(selection: ProfileMemoSelection): Record<string, string | number> {
  return {
    ...(typeof selection.versionNo === "number" ? { versionNo: selection.versionNo } : {}),
    ...(selection.sections && selection.sections.length > 0 ? { sections: selection.sections.join(",") } : {}),
  };
}

function optionalNote(note?: string): { changeNote: string } | Record<string, never> {
  const changeNote = note?.trim() ?? "";
  return changeNote ? { changeNote } : {};
}

export const profileService = {
  async list(filters: CustomerProfileListFilters): Promise<CustomerProfilePage> {
    try {
      const { data } = await apiClient.get<unknown>("/api/customer-profiles", {
        params: {
          page: filters.page,
          size: filters.size,
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.q ? { q: filters.q } : {}),
        },
      });
      return readPage(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async get(id: string): Promise<CustomerProfileDetail> {
    try {
      const { data } = await apiClient.get<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}`
      );
      return readDetail(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async create(body: CreateCustomerProfileRequest): Promise<CustomerProfileDetail> {
    try {
      const { data } = await apiClient.post<unknown>("/api/customer-profiles", {
        type: body.type,
        data: body.data,
        ...optionalNote(body.changeNote),
      });
      return readDetail(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async update(id: string, body: UpdateCustomerProfileRequest): Promise<CustomerProfileDetail> {
    try {
      const { data } = await apiClient.put<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}`,
        {
          data: body.data,
          expectedVersionNo: body.expectedVersionNo,
          ...optionalNote(body.changeNote),
        }
      );
      return readDetail(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async archive(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/customer-profiles/${encodeURIComponent(id)}/archive`);
    } catch (error) {
      rethrow(error);
    }
  },

  async getFormTemplate(code: string): Promise<FormTemplate> {
    try {
      const { data } = await apiClient.get<unknown>(
        `/api/form-templates/code/${encodeURIComponent(code)}/latest`
      );
      return readFormTemplate(data, code);
    } catch (error) {
      rethrow(error);
    }
  },

  async listVersions(id: string): Promise<CustomerProfileVersionItem[]> {
    try {
      const { data } = await apiClient.get<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}/versions`
      );
      if (!Array.isArray(data)) mismatch("profile versions");
      return data.map(readVersionItem);
    } catch (error) {
      rethrow(error);
    }
  },

  async getVersion(id: string, versionNo: number): Promise<CustomerProfileVersion> {
    try {
      const { data } = await apiClient.get<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}/versions/${encodeURIComponent(String(versionNo))}`
      );
      return readVersion(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async diff(id: string, fromVersion: number, toVersion: number): Promise<CustomerProfileDiff> {
    try {
      const { data } = await apiClient.get<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}/versions/${encodeURIComponent(String(fromVersion))}/diff/${encodeURIComponent(String(toVersion))}`
      );
      return readDiff(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async restore(
    id: string,
    versionNo: number,
    body: RestoreProfileVersionRequest = {}
  ): Promise<CustomerProfileDetail> {
    try {
      const { data } = await apiClient.post<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}/versions/${encodeURIComponent(String(versionNo))}/restore`,
        optionalNote(body.changeNote)
      );
      return readDetail(data);
    } catch (error) {
      rethrow(error);
    }
  },

  async createLink(id: string, body: CreateProfileLinkRequest): Promise<void> {
    try {
      await apiClient.post(`/api/customer-profiles/${encodeURIComponent(id)}/links`, {
        childProfileId: body.childProfileId,
        role: body.role,
        ...(typeof body.ownershipPct === "number" ? { ownershipPct: body.ownershipPct } : {}),
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async deleteLink(id: string, linkId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/api/customer-profiles/${encodeURIComponent(id)}/links/${encodeURIComponent(linkId)}`
      );
    } catch (error) {
      rethrow(error);
    }
  },

  async downloadMemo(id: string, selection: ProfileMemoSelection = {}): Promise<{ blob: Blob; fileName: string }> {
    try {
      const response = await apiClient.get<Blob>(
        `/api/customer-profiles/${encodeURIComponent(id)}/memo.pdf`,
        { params: memoParams(selection), responseType: "blob", timeout: 120_000 }
      );
      const contentType = String(response.headers["content-type"] ?? response.data.type ?? "");
      if (contentType.includes("json")) {
        throw { message: "The credit memo could not be downloaded.", status: response.status };
      }
      return {
        blob: response.data,
        fileName: fileNameFromDisposition(response.headers["content-disposition"], "credit-memo.pdf"),
      };
    } catch (error) {
      rethrow(error);
    }
  },

  async saveMemo(id: string, selection: ProfileMemoSelection = {}): Promise<SavedProfileMemo> {
    try {
      const { data } = await apiClient.post<unknown>(
        `/api/customer-profiles/${encodeURIComponent(id)}/memo/save`,
        {
          ...(typeof selection.versionNo === "number" ? { versionNo: selection.versionNo } : {}),
          ...(selection.sections && selection.sections.length > 0 ? { sections: selection.sections } : {}),
        }
      );
      return readSavedMemo(data);
    } catch (error) {
      rethrow(error);
    }
  },
};
