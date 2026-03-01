import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  error: null;
};

export type ApiFailure = {
  ok: false;
  data: null;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T, init?: Omit<ResponseInit, "status"> & { status?: number }) {
  return NextResponse.json<ApiSuccess<T>>(
    {
      ok: true,
      data,
      error: null,
    },
    {
      ...init,
      status: init?.status ?? 200,
    },
  );
}

export function apiError(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: unknown;
    headers?: HeadersInit;
  },
) {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      data: null,
      error: {
        code,
        message,
        ...(options?.details !== undefined ? { details: options.details } : {}),
      },
    },
    {
      status: options?.status ?? 500,
      headers: options?.headers,
    },
  );
}
