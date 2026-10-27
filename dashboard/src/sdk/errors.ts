export class SmokeyAdapterError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  constructor(code: string, message: string, status = 0, retryable = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
export const normalizedError = (error: unknown): SmokeyAdapterError => {
  if (error instanceof SmokeyAdapterError) return error;
  if (error instanceof Error && error.name === "AbortError")
    return new SmokeyAdapterError("ABORTED", "The request was stopped.");
  const candidate = error as {
    message?: string;
    status?: number;
    code?: string;
    data?: { error?: { message?: string; code?: string } };
  };
  return new SmokeyAdapterError(
    candidate?.code || candidate?.data?.error?.code || "REQUEST_FAILED",
    candidate?.data?.error?.message ||
      candidate?.message ||
      "The request could not complete. Please try again.",
    candidate?.status || 0,
    !candidate?.status || candidate.status >= 500,
  );
};
