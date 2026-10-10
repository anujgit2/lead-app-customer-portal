"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { parseApiError } from "@/lib/api-error";
import { uploadDocument } from "../api/documentsApi";
import type { UploadSubmission } from "../types";
import {
  messageForUploadStatus,
  newIdempotencyKey,
  UploadRejected,
  validateUploadFile,
} from "../utils/upload";

export function uploadFailureMessage(error: unknown): string {
  if (error instanceof UploadRejected) return error.message;
  return messageForUploadStatus(parseApiError(error).status);
}

export function useUpload() {
  const queryClient = useQueryClient();
  const idemKey = useRef(newIdempotencyKey());
  const [progress, setProgress] = useState(0);

  const rotateKey = useCallback(() => {
    idemKey.current = newIdempotencyKey();
    setProgress(0);
  }, []);

  const mutation = useMutation({
    mutationFn: async (input: UploadSubmission) => {
      const problem = validateUploadFile(input.file);
      if (problem) throw new UploadRejected(problem);
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("typeId", input.typeId);
      if (input.label.trim()) formData.append("label", input.label.trim());
      if (input.documentId && !input.asNewDocument) formData.append("documentId", input.documentId);
      if (input.asNewDocument) formData.append("asNewDocument", "true");
      if (input.profileId) formData.append("profileId", input.profileId);
      if (input.relation) formData.append("relation", input.relation);
      setProgress(0);
      return uploadDocument(formData, idemKey.current, setProgress);
    },
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      await queryClient.invalidateQueries({ queryKey: ["document-preview"] });
      if (input.documentId && !input.asNewDocument) {
        await queryClient.invalidateQueries({ queryKey: ["document", input.documentId] });
      }
    },
  });

  return { ...mutation, progress, rotateKey };
}
