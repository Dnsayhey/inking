import axios, { AxiosError } from "axios";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
  details: unknown;
};

type ApiErrorPayload = {
  code?: number;
  message?: string;
  details?: unknown;
};

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

export class ApiError extends Error {
  code?: number;
  details?: unknown;
  status?: number;

  constructor(message: string, options?: { code?: number; details?: unknown; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.details = options?.details;
    this.status = options?.status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function unwrapEnvelope<T>(payload: ApiEnvelope<T>): T {
  if (payload.code !== 0) {
    throw new ApiError(payload.message || "请求失败", {
      code: payload.code,
      details: payload.details,
    });
  }
  return payload.data as T;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    if (isApiErrorPayload(payload)) {
      return new ApiError(payload.message || "请求失败", {
        code: payload.code,
        details: payload.details,
        status,
      });
    }
    return new ApiError(axiosError.message || "网络请求失败", { status });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("请求失败");
}
