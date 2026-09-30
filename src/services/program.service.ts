import { apiClient } from "@/lib/axios";
import { parseApiError } from "@/lib/api-error";
import type { LoanProduct } from "@/types";
import {
  mapProgramToLoanProduct,
  type BackendProgramWithTemplates,
} from "@/utils/program-mapper";

interface BackendProgram {
  id: string;
  programCode: string;
  name: string;
  description?: string;
  status: string;
}

export const programService = {
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

  async getProgramPayload(programId: string): Promise<BackendProgramWithTemplates> {
    try {
      const { data } = await apiClient.get<BackendProgramWithTemplates>(
        `/api/programs/${programId}/with-form-templates`
      );
      return data;
    } catch (error) {
      throw parseApiError(error);
    }
  },

  async getProgramWithTemplates(programId: string): Promise<LoanProduct> {
    return mapProgramToLoanProduct(await this.getProgramPayload(programId));
  },

  async getDefaultProgramWithTemplates(): Promise<LoanProduct> {
    const programs = await this.getPrograms();
    if (programs.length === 0) {
      throw { message: "No loan programs available", status: 404 };
    }
    return this.getProgramWithTemplates(programs[0].id);
  },
};
