import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type { LoanProduct } from "@/types";
import {
  mapProgramToLoanProduct,
  type BackendProgramWithTemplates,
} from "@/utils/program-mapper";

export interface Program {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  status: string;
  displayName?: string;
}

interface BackendProgram {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  status: string;
}

export const programService = {
  /**
   * Fetch available programs from /api/tenant/programs
   * These are programs the user can apply for
   */
  async getTenantPrograms(): Promise<Program[]> {
    try {
      const { data } = await apiClient.get<Program[]>("/api/tenant/programs");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      throw parseApiError(error);
    }
  },

  /**
   * Fetch program configuration by program code
   * Returns the form schema for rendering the dynamic application form
   * GET /api/programs/by-code/{programCode}/latest-published
   */
  async getProgramConfig(programCode: string): Promise<LoanProduct> {
    try {
      const { data } = await apiClient.get<BackendProgramWithTemplates>(
        `/api/programs/by-code/${programCode}/latest-published`
      );
      return mapProgramToLoanProduct(data);
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getPrograms(status = "PUBLISHED"): Promise<BackendProgram[]> {
    try {
      const { data } = await apiClient.get<BackendProgram[]>("/api/programs", {
        params: { status },
      });
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProgramPayload(programCodeOrId: string): Promise<BackendProgramWithTemplates> {
    try {
      const { data } = await apiClient.get<BackendProgramWithTemplates>(
        `/api/programs/by-code/${programCodeOrId}/latest-published`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProgramWithTemplates(programCodeOrId: string): Promise<LoanProduct> {
    return mapProgramToLoanProduct(await this.getProgramPayload(programCodeOrId));
  },

  async getDefaultProgramWithTemplates(): Promise<LoanProduct> {
    const programs = await this.getPrograms();
    if (programs.length === 0) {
      throw { message: "No loan programs available", status: 404 };
    }
    // Use programCode for the new endpoint
    return this.getProgramWithTemplates(programs[0].programCode);
  },
};
