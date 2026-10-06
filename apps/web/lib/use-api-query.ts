"use client";

import { useEffect, useState } from "react";

import { clientFetch } from "@/lib/api-client";

export interface ApiQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const IDLE = { data: null, error: null, loading: false };

/**
 * GETs `path` from the API whenever it changes; pass null to skip.
 * A response for an outdated path is ignored, so fast clicks can't show stale data.
 */
export function useApiQuery<T>(path: string | null): ApiQuery<T> {
  const [result, setResult] = useState<ApiQuery<T> & { path: string | null }>({
    ...IDLE,
    path: null,
  });

  useEffect(() => {
    if (!path) return;
    let current = true;

    clientFetch(path)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!current) return;
        setResult(
          res.ok
            ? { data: body as T, error: null, loading: false, path }
            : {
                data: null,
                error: (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`,
                loading: false,
                path,
              },
        );
      })
      .catch(() => {
        if (current) setResult({ data: null, error: "Network error", loading: false, path });
      });

    return () => {
      current = false;
    };
  }, [path]);

  if (!path) return IDLE;
  // Until the response for this path arrives, report loading rather than old data.
  if (result.path !== path) return { data: null, error: null, loading: true };
  return result;
}
